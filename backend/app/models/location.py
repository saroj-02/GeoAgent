"""
Location document models for MongoDB.
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4
from pydantic import BaseModel, Field


class LocationPoint(BaseModel):
    """Represents a location point document in the 'locations' collection."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    device_id: str

    latitude: float
    longitude: float
    altitude: Optional[float] = None
    accuracy: Optional[float] = None
    speed: Optional[float] = None
    heading: Optional[float] = None

    timestamp: datetime
    source: str = "gps"  # gps, wifi, cellular, simulated
    is_valid: bool = True
    is_mock: bool = False
    notes: Optional[str] = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    def to_mongo(self) -> dict:
        data = self.model_dump()
        data["_id"] = data.pop("id")
        return data

    @classmethod
    def from_mongo(
        cls,
        data: Optional[dict],
    ) -> Optional["LocationPoint"]:
        if data is None:
            return None
        d = dict(data)
        d["id"] = str(d.pop("_id", d.get("id", str(uuid4()))))
        return cls(**d)

    def __repr__(self):
        return f"<LocationPoint device={self.device_id} lat={self.latitude} lon={self.longitude}>"


class LocationPermission(BaseModel):
    """Represents a location permission document in the 'permissions' collection."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    device_id: str
    granted_by_id: str
    granted_to_id: str

    can_view_current: bool = True
    can_view_history: bool = False
    can_view_trail: bool = True
    permission_level: str = "viewer"  # owner, admin, viewer
    status: str = "active"           # active, revoked, expired

    expires_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    def to_mongo(self) -> dict:
        data = self.model_dump()
        data["_id"] = data.pop("id")
        return data

    @classmethod
    def from_mongo(
        cls,
        data: Optional[dict],
    ) -> Optional["LocationPermission"]:
        if data is None:
            return None
        d = dict(data)
        d["id"] = str(d.pop("_id", d.get("id", str(uuid4()))))
        return cls(**d)