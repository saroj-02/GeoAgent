"""
User document model for MongoDB.
No SQLAlchemy — just a Pydantic model describing the document shape.
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4
from pydantic import BaseModel, Field


class User(BaseModel):
    """Represents a user document in the MongoDB 'users' collection."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    email: str
    username: str
    password_hash: str
    full_name: Optional[str] = None
    phone: Optional[str] = None

    # Verification
    email_verified: bool = False
    phone_verified: bool = False
    email_verification_token: Optional[str] = None
    email_verification_expires: Optional[datetime] = None

    # Status
    is_active: bool = True
    is_admin: bool = False

    # Privacy
    location_history_enabled: bool = True
    location_retention_days: int = 30

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_login: Optional[datetime] = None

    def to_mongo(self) -> dict:
        """Convert to a dict suitable for MongoDB insertion."""
        data = self.model_dump()
        data["_id"] = data.pop("id")
        return data

    @classmethod
    def from_mongo(
        cls,
        data: Optional[dict],
    ) -> Optional["User"]:
        """Create a User from a MongoDB document."""
        if data is None:
            return None
        d = dict(data)
        d["id"] = str(d.pop("_id", d.get("id", str(uuid4()))))
        return cls(**d)

    def __repr__(self):
        return f"<User {self.username}>"