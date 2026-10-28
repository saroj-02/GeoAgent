"""
Audit log document model for MongoDB.
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4
from pydantic import BaseModel, Field


class AuditLog(BaseModel):
    """Represents an audit log document in the 'audit_logs' collection."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    user_id: Optional[str] = None

    action: str           # e.g. "login", "device.create", "geofence.delete"
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None

    ip_address: Optional[str] = None
    details: Optional[str] = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    def to_mongo(self) -> dict:
        data = self.model_dump()
        data["_id"] = data.pop("id")
        return data

    @classmethod
    def from_mongo(
        cls,
        data: Optional[dict],
    ) -> Optional["AuditLog"]:  
        if data is None:
            return None
        d = dict(data)
        d["id"] = str(d.pop("_id", d.get("id", str(uuid4()))))
        return cls(**d)

    def __repr__(self):
        return f"<AuditLog action={self.action} user_id={self.user_id}>"