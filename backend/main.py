"""
FastAPI application entry point for GeoAgent backend.
"""

import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from app.api.routes.geocoding import router as geocoding_router
from app.core.config import get_settings
from app.core.database import init_db
from app.api.routes import auth, device, location, permission

logger = logging.getLogger(__name__)
settings = get_settings()


# Configure logging
logging.basicConfig(
    level=settings.LOG_LEVEL,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)


# Lifespan events
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown events."""
    # Startup
    logger.info("🚀 Starting GeoAgent backend")
    try:
        await init_db()
        logger.info("✅ Database initialized")
    except Exception as e:
        logger.error(f"❌ Failed to initialize database: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down GeoAgent backend")


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered real-time satellite and geospatial intelligence platform",
    version=settings.API_VERSION,
    lifespan=lifespan,
)


# ===== CORS Middleware =====
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_CREDENTIALS,
    allow_methods=settings.CORS_METHODS,
    allow_headers=settings.CORS_HEADERS,
)

# ===== Security Middleware =====
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "*.example.com"],
)

# ===== Compression Middleware =====
app.add_middleware(
    GZipMiddleware,
    minimum_size=1000,
)


# ===== Global Exception Handlers =====

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc) if settings.DEBUG else None,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


# ===== Health Check =====

@app.get("/health", tags=["System"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "environment": settings.ENV,
        "version": settings.API_VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/", tags=["System"])
async def root():
    """Root endpoint."""
    return {
        "name": settings.APP_NAME,
        "version": settings.API_VERSION,
        "api_version": settings.API_VERSION,
        "docs": "/docs",
        "openapi_schema": "/openapi.json",
    }


# ===== API Routes =====

# Include auth routes
app.include_router(auth.router)

# Include device routes
app.include_router(device.router)

# Include location routes
app.include_router(location.router)

# Include permission routes
app.include_router(permission.router)

# Geofence routes (will be created in geofence module)
# WebSocket routes (will be created in websocket module)


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
        workers=1 if settings.DEBUG else settings.WORKERS,
    )
