"""
Satellite document models for MongoDB.
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from pydantic import BaseModel, Field


class SatelliteScene(BaseModel):
    """Satellite scene document."""

    id: str = Field(
        default_factory=lambda: str(uuid4())
    )

    provider: str
    scene_id: str

    center_latitude: float
    center_longitude: float

    captured_at: datetime

    cloud_cover_pct: Optional[float] = None
    asset_url: Optional[str] = None

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(
            timezone.utc
        )
    )

    def to_mongo(self) -> dict:
        """Convert model to MongoDB document."""

        data = self.model_dump()

        data["_id"] = data.pop(
            "id"
        )

        return data

    @classmethod
    def from_mongo(
        cls,
        data: Optional[dict],
    ) -> Optional["SatelliteScene"]:
        """Convert MongoDB document to model."""

        if data is None:
            return None

        document = dict(data)

        document["id"] = str(
            document.pop(
                "_id",
                document.get(
                    "id",
                    str(uuid4()),
                ),
            )
        )

        return cls(**document)


class AnalysisResult(BaseModel):
    """Satellite analysis result document."""

    id: str = Field(
        default_factory=lambda: str(uuid4())
    )

    scene_id: str

    analysis_type: str

    summary: Optional[str] = None
    result_url: Optional[str] = None

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(
            timezone.utc
        )
    )

    def to_mongo(self) -> dict:
        """Convert model to MongoDB document."""

        data = self.model_dump()

        data["_id"] = data.pop(
            "id"
        )

        return data

    @classmethod
    def from_mongo(
        cls,
        data: Optional[dict],
    ) -> Optional["AnalysisResult"]:
        """Convert MongoDB document to model."""

        if data is None:
            return None

        document = dict(data)

        document["id"] = str(
            document.pop(
                "_id",
                document.get(
                    "id",
                    str(uuid4()),
                ),
            )
        )

        return cls(**document)