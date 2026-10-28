"""Pydantic request/response schemas for GeoAgent."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------

class UserRegisterRequest(BaseModel):
    email: EmailStr

    username: str = Field(
        ...,
        min_length=3,
        max_length=100,
    )

    password: str = Field(
        ...,
        min_length=8,
    )

    full_name: Optional[str] = Field(
        None,
        max_length=255,
    )

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if not any(character.isupper() for character in value):
            raise ValueError(
                "Password must contain at least one uppercase letter"
            )

        if not any(character.isdigit() for character in value):
            raise ValueError(
                "Password must contain at least one digit"
            )

        if not any(
            character in "!@#$%^&*()-_=+[]{}|;:,.<>?"
            for character in value
        ):
            raise ValueError(
                "Password must contain at least one special character"
            )

        return value


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshTokenRequest(BaseModel):
    refresh_token: str


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------

class UserResponse(BaseModel):
    id: UUID
    email: str
    username: str
    full_name: Optional[str]
    email_verified: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserDetailResponse(UserResponse):
    phone: Optional[str]
    phone_verified: bool
    is_admin: bool
    location_history_enabled: bool
    location_retention_days: int
    last_login: Optional[datetime]
    updated_at: datetime


class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    location_history_enabled: Optional[bool] = None
    location_retention_days: Optional[int] = Field(
        None,
        ge=1,
        le=365,
    )


# ---------------------------------------------------------------------------
# Devices
# ---------------------------------------------------------------------------

class DeviceCreateRequest(BaseModel):
    name: str = Field(
        ...,
        min_length=1,
        max_length=255,
    )

    device_type: str = Field(
        ...,
        min_length=1,
        max_length=50,
    )

    unique_identifier: str = Field(
        ...,
        min_length=1,
        max_length=255,
    )


class DeviceResponse(BaseModel):
    id: UUID
    name: str
    device_type: str
    unique_identifier: str
    is_active: bool
    last_seen: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class DeviceUpdateRequest(BaseModel):
    name: Optional[str] = Field(
        None,
        min_length=1,
        max_length=255,
    )

    is_active: Optional[bool] = None


# ---------------------------------------------------------------------------
# Locations
# ---------------------------------------------------------------------------

class LocationPointCreateRequest(BaseModel):
    latitude: float = Field(
        ...,
        ge=-90,
        le=90,
    )

    longitude: float = Field(
        ...,
        ge=-180,
        le=180,
    )

    accuracy: Optional[float] = Field(
        None,
        ge=0,
    )

    altitude: Optional[float] = None

    speed: Optional[float] = Field(
        None,
        ge=0,
    )

    heading: Optional[float] = Field(
        None,
        ge=0,
        le=360,
    )

    timestamp: datetime

    source: str = Field(
        default="gps",
        min_length=1,
        max_length=30,
    )


class LocationPointResponse(BaseModel):
    id: UUID
    device_id: UUID
    latitude: float
    longitude: float
    accuracy: Optional[float]
    altitude: Optional[float]
    speed: Optional[float]
    heading: Optional[float]
    timestamp: datetime
    created_at: datetime
    source: str
    is_valid: bool

    class Config:
        from_attributes = True


class LocationHistoryResponse(BaseModel):
    device_id: UUID
    points: List[LocationPointResponse]
    count: int
    period_start: datetime
    period_end: datetime


# ---------------------------------------------------------------------------
# Permissions
# ---------------------------------------------------------------------------

class LocationPermissionCreateRequest(BaseModel):
    device_id: UUID
    granted_to_email: str

    can_view_current: bool = True
    can_view_history: bool = False
    can_view_trail: bool = True

    permission_level: str = "viewer"

    expires_at: Optional[datetime] = None


class LocationPermissionResponse(BaseModel):
    id: UUID
    device_id: UUID
    granted_by_id: UUID
    granted_to_id: UUID

    can_view_current: bool
    can_view_history: bool
    can_view_trail: bool

    status: str
    permission_level: str

    expires_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class PermissionListResponse(BaseModel):
    granted_by_me: List[LocationPermissionResponse] = Field(
        default_factory=list
    )

    granted_to_me: List[LocationPermissionResponse] = Field(
        default_factory=list
    )


# ---------------------------------------------------------------------------
# Geofences
# ---------------------------------------------------------------------------

class GeofenceCreateRequest(BaseModel):
    name: str = Field(
        ...,
        min_length=1,
        max_length=255,
    )

    description: Optional[str] = None

    center_lat: float = Field(
        ...,
        ge=-90,
        le=90,
    )

    center_lng: float = Field(
        ...,
        ge=-180,
        le=180,
    )

    radius_meters: float = Field(
        ...,
        gt=0,
    )

    alert_on_enter: bool = True
    alert_on_exit: bool = True


class GeofenceResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]

    center_lat: float
    center_lng: float
    radius_meters: float

    alert_on_enter: bool
    alert_on_exit: bool

    is_active: bool

    created_at: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Satellite / Spectral Analysis
# ---------------------------------------------------------------------------

class SpectralIndexRequest(BaseModel):
    """
    Request for NDVI, NDWI or NDBI calculation.

    NDVI:
        (NIR - RED) / (NIR + RED)

    NDWI:
        (GREEN - NIR) / (GREEN + NIR)

    NDBI:
        (SWIR - NIR) / (SWIR + NIR)
    """

    index: str = Field(
        ...,
        description="ndvi, ndwi, or ndbi",
    )

    red: Optional[float] = None
    green: Optional[float] = None
    nir: Optional[float] = None
    swir: Optional[float] = None


class SpectralIndexResponse(BaseModel):
    index: str
    value: float
    interpretation: str


class ChangeDetectionRequest(BaseModel):
    before_mean: float
    after_mean: float

    threshold: float = Field(
        default=0.10,
        gt=0,
    )


class ChangeDetectionResponse(BaseModel):
    before_mean: float
    after_mean: float
    delta: float
    changed: bool
    threshold: float
    interpretation: str


# ---------------------------------------------------------------------------
# AI Agent
# ---------------------------------------------------------------------------

class AgentQueryRequest(BaseModel):
    query: str = Field(
        ...,
        min_length=1,
        max_length=10000,
    )

    context: dict = Field(
        default_factory=dict
    )


class AgentQueryResponse(BaseModel):
    response: str
    mode: str
    user_id: str

    context: dict = Field(
        default_factory=dict
    )


# ---------------------------------------------------------------------------
# System
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    status: str = "healthy"
    environment: str
    version: str
    timestamp: datetime


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
    timestamp: datetime