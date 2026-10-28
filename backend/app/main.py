"""GeoAgent FastAPI application."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import (
    agent,
    analysis,
    auth,
    device,
    geofences,
    location,
    permission,
    satellite,
    users,
)
from app.core.config import get_settings
from app.core.database import close_db, init_db


settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage MongoDB startup and shutdown."""

    await init_db()

    yield

    await close_db()


app = FastAPI(
    title="GeoAgent API",
    description=(
        "AI-powered satellite intelligence and "
        "geospatial platform."
    ),
    version=settings.API_VERSION,
    lifespan=lifespan,
)


# ------------------------------------------------------------------
# CORS
# ------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------------------------------------------------
# Root
# ------------------------------------------------------------------

@app.get("/")
async def root():
    """Basic API information."""

    return {
        "name": "GeoAgent",
        "version": settings.API_VERSION,
        "status": "operational",
        "docs": "/docs",
        "api": "/api/v1",
    }


# ------------------------------------------------------------------
# Health
# ------------------------------------------------------------------

@app.get("/health")
async def health():
    """Backend health check."""

    return {
        "status": "healthy",
        "service": "GeoAgent API",
        "version": settings.API_VERSION,
    }


# ------------------------------------------------------------------
# API routes
# ------------------------------------------------------------------

API_PREFIX = "/api/v1"


app.include_router(
    auth.router,
    prefix=API_PREFIX,
)

app.include_router(
    users.router,
    prefix=API_PREFIX,
)

app.include_router(
    device.router,
    prefix=API_PREFIX,
)

app.include_router(
    location.router,
    prefix=API_PREFIX,
)

app.include_router(
    permission.router,
    prefix=API_PREFIX,
)

app.include_router(
    satellite.router,
    prefix=API_PREFIX,
)

app.include_router(
    analysis.router,
    prefix=API_PREFIX,
)

app.include_router(
    geofences.router,
    prefix=API_PREFIX,
)

app.include_router(
    agent.router,
    prefix=API_PREFIX,
)