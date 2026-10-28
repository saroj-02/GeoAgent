"""
AI Conversation document models for MongoDB.
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4
from pydantic import BaseModel, Field


class AIConversation(BaseModel):
    """Represents an AI conversation document in 'ai_conversations' collection."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    user_id: str

    title: Optional[str] = None

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
    ) -> Optional["AIConversation"]:
        if data is None:
            return None
        d = dict(data)
        d["id"] = str(d.pop("_id", d.get("id", str(uuid4()))))
        return cls(**d)


class AIMessage(BaseModel):
    """Represents an AI message document in 'ai_messages' collection."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    conversation_id: str

    role: str    # "user" or "assistant"
    content: str

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    def to_mongo(self) -> dict:
        data = self.model_dump()
        data["_id"] = data.pop("id")
        return data

    @classmethod
    def from_mongo(
        cls,
        data: Optional[dict],
    ) -> Optional["AIMessage"]:
        if data is None:
            return None
        d = dict(data)
        d["id"] = str(d.pop("_id", d.get("id", str(uuid4()))))
        return cls(**d)