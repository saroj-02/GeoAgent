"""
Device document model for MongoDB.
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4
from pydantic import BaseModel, Field


class Device(BaseModel):
    """Represents a device document in the MongoDB 'devices' collection."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    user_id: str

    name: str
    device_type: str  # mobile, tablet, web, iot
    unique_identifier: str

    is_active: bool = True
    last_seen: Optional[datetime] = None

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
    ) -> Optional["Device"]:
        if data is None:
            return None
        d = dict(data)
        d["id"] = str(d.pop("_id", d.get("id", str(uuid4()))))
        return cls(**d)

    def __repr__(self):
        return f"<Device {self.name}>"