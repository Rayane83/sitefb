import os
import base64
import hashlib
import secrets
from datetime import datetime, timedelta

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import JSONResponse, RedirectResponse
from jose import jwt
from sqlalchemy.orm import Session

from .database import get_db
from .models import User

JWT_SECRET = os.getenv("JWT_SECRET", secrets.token_urlsafe(32))
JWT_ALG = "HS256"
JWT_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "24"))
DISCORD_CLIENT_ID = os.getenv("DISCORD_CLIENT_ID", "")
DISCORD_CLIENT_SECRET = os.getenv("DISCORD_CLIENT_SECRET", "")
DISCORD_BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN", "")
REDIRECT_URI_PROD = os.getenv("REDIRECT_URI_PROD", "")
REDIRECT_URI_DEV = os.getenv("REDIRECT_URI_DEV", "http://localhost:5173/api/auth/discord/callback")
ENV = os.getenv("ENV", "dev")
REDIRECT_URI = REDIRECT_URI_PROD if ENV == "prod" else REDIRECT_URI_DEV
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")

from cryptography.fernet import Fernet

if not ENCRYPTION_KEY:
    ENCRYPTION_KEY = base64.urlsafe_b64encode(os.urandom(32)).decode()
fernet = Fernet(ENCRYPTION_KEY.encode())

def encrypt_token(token: str) -> str:
    return base64.urlsafe_b64encode(fernet.encrypt(token.encode())).decode()

def decrypt_token(enc: str) -> str:
    return fernet.decrypt(base64.urlsafe_b64decode(enc.encode())).decode()

router = APIRouter(prefix="/api/auth/discord", tags=["auth"]) 

@router.get("/login")
async def discord_login(response: Response):
    if not DISCORD_CLIENT_ID or not REDIRECT_URI:
        raise HTTPException(status_code=500, detail="Discord OAuth not configured")

    state = secrets.token_urlsafe(32)
    code_verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode().rstrip('=')
    code_challenge = base64.urlsafe_b64encode(hashlib.sha256(code_verifier.encode()).digest()).decode().rstrip('=')

    # Store temporary values in cookies (short TTL)
    response.set_cookie("oauth_state", state, httponly=True, secure=False, samesite="lax", max_age=600)
    response.set_cookie("code_verifier", code_verifier, httponly=True, secure=False, samesite="lax", max_age=600)

    params = {
        "client_id": DISCORD_CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": "identify email guilds guilds.members.read",
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
        "prompt": "consent",
    }
    from urllib.parse import urlencode
    url = "https://discord.com/api/oauth2/authorize?" + urlencode(params)
    return {"auth_url": url}

@router.get("/callback")
async def discord_callback(request: Request, response: Response, code: str, state: str, db: Session = Depends(get_db)):
    stored_state = request.cookies.get("oauth_state")
    if not stored_state or not secrets.compare_digest(stored_state, state):
        raise HTTPException(status_code=400, detail="Invalid state parameter")

    code_verifier = request.cookies.get("code_verifier")

    data = {
        "client_id": DISCORD_CLIENT_ID,
        "client_secret": DISCORD_CLIENT_SECRET,
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": REDIRECT_URI,
    }
    if code_verifier:
        data["code_verifier"] = code_verifier

    async with httpx.AsyncClient(timeout=20.0) as client:
        token_res = await client.post("https://discord.com/api/oauth2/token", data=data, headers={"Content-Type": "application/x-www-form-urlencoded"})
        if token_res.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange code")
        tokens = token_res.json()

        user_res = await client.get("https://discord.com/api/users/@me", headers={"Authorization": f"Bearer {tokens['access_token']}"})
        if user_res.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch user")
        duser = user_res.json()

    # upsert user
    user = db.query(User).filter(User.discord_id == duser["id"]).first()
    if not user:
        user = User(discord_id=duser["id"]) 
        db.add(user)
    user.username = duser.get("username")
    user.global_name = duser.get("global_name")
    user.email = duser.get("email")
    user.avatar = duser.get("avatar")
    user.verified = bool(duser.get("verified")) if "verified" in duser else user.verified
    user.access_token = encrypt_token(tokens["access_token"]) if tokens.get("access_token") else None
    if tokens.get("refresh_token"):
        user.refresh_token = encrypt_token(tokens["refresh_token"])
    exp = int(tokens.get("expires_in", 3600))
    user.token_expires_at = datetime.utcnow() + timedelta(seconds=exp)
    user.last_login = datetime.utcnow()
    db.commit()

    payload = {"sub": str(user.id), "discord_id": user.discord_id, "exp": datetime.utcnow() + timedelta(hours=24)}
    session_token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

    # Clear temp cookies and set session
    response.delete_cookie("oauth_state")
    response.delete_cookie("code_verifier")
    response.set_cookie("session_token", session_token, httponly=True, secure=False, samesite="lax", max_age=24*3600)

    return RedirectResponse(url=f"{FRONTEND_URL}")

@router.get("/me")
async def me(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("session_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": user.id,
        "discord_id": user.discord_id,
        "username": user.username,
        "global_name": user.global_name,
        "email": user.email,
        "avatar": user.avatar,
        "verified": user.verified,
    }

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("session_token")
    return {"message": "Logged out"}