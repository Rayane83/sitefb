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
from .routers.enterprises import router as enterprises_router
from .routers.tax import router as tax_router
from .routers.documents import router as documents_router
from .routers.archive import router as archive_router
from .routers.blanchiment import router as blanchiment_router


# Ensure tables exist if running without Alembic (dev convenience)
Base.metadata.create_all(bind=engine)

# Routers
app.include_router(auth_router)
app.include_router(dotation_router)
app.include_router(dashboard_router)

# Minimal health
app.include_router(enterprises_router)
app.include_router(tax_router)
app.include_router(documents_router)
app.include_router(archive_router)
app.include_router(blanchiment_router)

@app.get("/api/health")
def health():
    return {"status": "ok"}