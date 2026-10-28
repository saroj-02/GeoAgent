from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class DeviceBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    device_type: str = Field(..., min_length=1, max_length=50)


class DeviceCreateRequest(DeviceBase):
    unique_identifier: str = Field(..., min_length=1, max_length=255)


class DeviceResponse(DeviceBase):
    id: str
    user_id: str
    unique_identifier: str
    is_active: bool
    last_seen: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DeviceUpdateRequest(BaseModel):
    name: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=255,
    )
    is_active: Optional[bool] = None