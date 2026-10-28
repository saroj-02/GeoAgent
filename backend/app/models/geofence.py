"""
Geofence document models for MongoDB.
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4
from pydantic import BaseModel, Field


class Geofence(BaseModel):
    """Represents a geofence document in the 'geofences' collection."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    owner_id: str  # references users._id

    name: str
    description: Optional[str] = None

    # Circular geofence
    center_lat: float
    center_lng: float
    radius_meters: float

    alert_on_enter: bool = True
    alert_on_exit: bool = True
    is_active: bool = True

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
    ) -> Optional["Geofence"]:
        if data is None:
            return None
        d = dict(data)
        d["id"] = str(d.pop("_id", d.get("id", str(uuid4()))))
        return cls(**d)

    def __repr__(self):
        return f"<Geofence {self.name}>"


class GeofenceEvent(BaseModel):
    """Represents a geofence event document in 'geofence_events' collection."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    geofence_id: str
    device_id: str

    event_type: str  # "enter" or "exit"
    triggered_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    latitude: Optional[float] = None
    longitude: Optional[float] = None

    def to_mongo(self) -> dict:
        data = self.model_dump()
        data["_id"] = data.pop("id")
        return data

    @classmethod
    def from_mongo(
        cls,
        data: Optional[dict],
    ) -> Optional["GeofenceEvent"]:
        if data is None:
            return None
        d = dict(data)
        d["id"] = str(d.pop("_id", d.get("id", str(uuid4()))))
        return cls(**d)