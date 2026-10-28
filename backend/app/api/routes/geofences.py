"""Geofence management API routes."""

from datetime import datetime, timezone
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_async_db
from app.core.security import SecurityService
from app.models import User
from app.schemas import GeofenceCreateRequest, GeofenceResponse
from app.services.auth import AuthService


router = APIRouter(
    prefix="/geofences",
    tags=["Geofences"],
)

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: AsyncIOMotorDatabase = Depends(get_async_db),
) -> User:
    """Authenticate the current user."""

    try:
        payload = SecurityService.verify_token(
            credentials.credentials
        )

        if payload.get("type") != "access":
            raise ValueError("Invalid token type")

        user_id = payload.get("sub")

        if not user_id:
            raise ValueError("Token does not contain a user ID")

        user = await AuthService.get_user_by_id(
            db,
            user_id,
        )

        if not user:
            raise ValueError("User not found")

        if not user.is_active:
            raise ValueError("User is inactive")

        return user

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={
                "WWW-Authenticate": "Bearer",
            },
        ) from exc


def _to_response(document: dict) -> GeofenceResponse:
    """Convert a MongoDB geofence document to an API response."""

    return GeofenceResponse(
        id=document["id"],
        name=document["name"],
        description=document.get("description"),
        center_lat=document["center_lat"],
        center_lng=document["center_lng"],
        radius_meters=document["radius_meters"],
        alert_on_enter=document.get(
            "alert_on_enter",
            True,
        ),
        alert_on_exit=document.get(
            "alert_on_exit",
            True,
        ),
        is_active=document.get(
            "is_active",
            True,
        ),
        created_at=document["created_at"],
    )


@router.post(
    "",
    response_model=GeofenceResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_geofence(
    request: GeofenceCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_async_db),
):
    """Create a new geofence for the authenticated user."""

    document = {
        "id": uuid4(),
        "user_id": current_user.id,
        "name": request.name,
        "description": request.description,
        "center_lat": request.center_lat,
        "center_lng": request.center_lng,
        "radius_meters": request.radius_meters,
        "alert_on_enter": request.alert_on_enter,
        "alert_on_exit": request.alert_on_exit,
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
    }

    await db["geofences"].insert_one(document)

    return _to_response(document)


@router.get(
    "",
    response_model=list[GeofenceResponse],
)
async def list_geofences(
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_async_db),
):
    """List active geofences belonging to the current user."""

    cursor = (
        db["geofences"]
        .find(
            {
                "user_id": current_user.id,
                "is_active": True,
            }
        )
        .sort(
            "created_at",
            -1,
        )
    )

    documents = await cursor.to_list(
        length=500,
    )

    return [
        _to_response(document)
        for document in documents
    ]


@router.delete(
    "/{geofence_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_geofence(
    geofence_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_async_db),
):
    """Soft-delete a geofence owned by the current user."""

    try:
        parsed_id = UUID(geofence_id)

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid geofence ID.",
        ) from exc

    result = await db["geofences"].update_one(
        {
            "id": parsed_id,
            "user_id": current_user.id,
            "is_active": True,
        },
        {
            "$set": {
                "is_active": False,
            }
        },
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Geofence not found.",
        )

    return None