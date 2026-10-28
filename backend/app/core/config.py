"""
Application configuration using Pydantic Settings.
Loads from environment variables or .env file.
"""

from functools import lru_cache
from typing import Optional, List
from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables and .env file."""

    # Application
    APP_NAME: str = "GeoAgent"
    ENV: str = Field(default="development", description="Environment: development, staging, production")
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"
    API_VERSION: str = "v1"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 4

    # MongoDB
    MONGODB_URL: str = "mongodb+srv://sarojpadhi28:IBqTzLV0d2TBTuDj@cluster0.n9zjrky.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
    MONGODB_DB_NAME: str = "geoagent"

    # Redis (optional)
    REDIS_URL: str = "redis://localhost:6379/0"

    # Security & JWT
    JWT_SECRET: str = Field(
        default="dev-secret-key-change-in-production",
        description="Secret key for JWT signing - MUST be changed in production"
    )
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Password
    PASSWORD_MIN_LENGTH: int = 8
    PASSWORD_REQUIRE_SPECIAL: bool = True

    # OTP
    OTP_EXPIRY_MINUTES: int = 10
    OTP_LENGTH: int = 6

    # Email verification
    EMAIL_VERIFICATION_EXPIRY_HOURS: int = 24

    # LLM (Optional)
    OPENAI_API_KEY: Optional[str] = None
    LLM_PROVIDER: str = "openai"
    LLM_MODEL: str = "gpt-4-turbo-preview"
    LLM_TEMPERATURE: float = 0.7
    AZURE_OPENAI_API_KEY: Optional[str] = None
    AZURE_OPENAI_ENDPOINT: Optional[str] = None
    AZURE_OPENAI_DEPLOYMENT: str = "gpt-4"

    # Location Tracking
    LOCATION_UPDATE_INTERVAL_SECONDS: int = 5
    LOCATION_RETENTION_DAYS: int = 30
    GPS_ACCURACY_THRESHOLD_METERS: float = 5.0
    MAX_GPS_JUMP_METERS: float = 500.0
    MIN_MEANINGFUL_MOVEMENT_METERS: float = 5.0

    # WebSocket
    WEBSOCKET_HEARTBEAT_INTERVAL: int = 30
    WEBSOCKET_MAX_CONNECTIONS_PER_USER: int = 5

    # Demo Mode
    DEMO_MODE_ENABLED: bool = True
    DEMO_DEVICE_ID: str = "DEMO-01"
    DEMO_ROUTE_POINTS: list = Field(
        default=[
            {"lat": 20.4625, "lng": 85.8830, "name": "Point 1"},
            {"lat": 20.4627, "lng": 85.8833, "name": "Point 2"},
            {"lat": 20.4631, "lng": 85.8840, "name": "Point 3"},
            {"lat": 20.4635, "lng": 85.8845, "name": "Point 4"},
            {"lat": 20.4639, "lng": 85.8850, "name": "Point 5"},
        ]
    )

    # Satellite & Geospatial
    SATELLITE_PROVIDER: str = "planetary-computer"
    LANDSAT_API_KEY: Optional[str] = None
    SENTINEL_CLIENT_ID: Optional[str] = None
    SENTINEL_CLIENT_SECRET: Optional[str] = None
    PLANETARY_COMPUTER_API_KEY: Optional[str] = None

    # Frontend
    FRONTEND_URL: str = "http://localhost:3000"

    # CORS
    CORS_ORIGINS: list = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
    ]
    CORS_CREDENTIALS: bool = True
    CORS_METHODS: list = ["*"]
    CORS_HEADERS: list = ["*"]

    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_REQUESTS: int = 1000
    RATE_LIMIT_PERIOD_SECONDS: int = 60

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
        "extra": "ignore",  # Silently ignore unknown env vars
    }


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()