import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from . import models
from .auth import router as auth_router
from .routers.dotation import router as dotation_router
from .routers.dashboard import router as dashboard_router

app = FastAPI(title="Portail Entreprise Flashback Fa")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", FRONTEND_URL)
allow_origins = [o.strip() for o in CORS_ORIGINS.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure tables exist if running without Alembic (dev convenience)
Base.metadata.create_all(bind=engine)

# Routers
app.include_router(auth_router)
app.include_router(dotation_router)
app.include_router(dashboard_router)

# Minimal health
@app.get("/api/health")
def health():
    return {"status": "ok"}