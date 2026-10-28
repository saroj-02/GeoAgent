"""User profile API routes."""

from openai.types import eval_update_params
from openai.types import eval_update_params
import logging

from fastapi import APIRouter, Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_async_db
from app.core.security import SecurityService
from app.models import User
from app.schemas import UserResponse, UserUpdateRequest
from app.services.auth import AuthService


logger = logging.getLogger(__name__)

security = HTTPBearer()

router = APIRouter(
    prefix="/users",
    tags=["Users"],
)


# ---------------------------------------------------------------------------
# Authentication dependency
# ---------------------------------------------------------------------------

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: AsyncIOMotorDatabase = Depends(get_async_db),
) -> User:
    """Get the currently authenticated user."""

    try:
        payload = SecurityService.verify_token(
            credentials.credentials
        )

        if payload.get("type") != "access":
            raise ValueError("Invalid token type")

        user_id = payload.get("sub")

        if not user_id:
            raise ValueError("Missing user identifier")

        user = await AuthService.get_user_by_id(
            db,
            user_id,
        )

        if not user:
            raise ValueError("User not found")

        if not user.is_active:
            raise ValueError("User account is inactive")

        return user

    except Exception as exc:
        logger.warning(
            "User authentication failed: %s",
            exc,
        )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={
                "WWW-Authenticate": "Bearer",
            },
        ) from exc


# ---------------------------------------------------------------------------
# Get current user
# ---------------------------------------------------------------------------

@router.get(
    "/me",
    response_model=UserResponse,
)
async def get_me(
    current_user: User = Depends(get_current_user),
):
    """Return the authenticated user's profile."""

    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        full_name=current_user.full_name,
        email_verified=current_user.email_verified,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
    )


# ---------------------------------------------------------------------------
# Update current user
# ---------------------------------------------------------------------------

@router.patch(
    "/me",
    response_model=UserResponse,
)
async def update_me(
    request: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_async_db),
):
    """Update editable fields of the authenticated user's profile."""

    update_data = request.model_dump(
        exclude_unset=True,
        exclude_none=True,
    )

    if not update_data:
        return UserResponse(
            id=current_user.id,
            email=current_user.email,
            username=current_user.username,
            full_name=current_user.full_name,
            email_verified=current_user.email_verified,
            is_active=current_user.is_active,
            created_at=current_user.created_at,
        )

    try:
        updated_user = await AuthService.update_user(
            db=db,
            user_id=current_user.id,
            full_name=update_data.get("full_name"),
            username=update_data.get("username"),
        )

        if not updated_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        return UserResponse(
            id=updated_user.id,
            email=updated_user.email,
            username=updated_user.username,
            full_name=updated_user.full_name,
            email_verified=updated_user.email_verified,
            is_active=updated_user.is_active,
            created_at=updated_user.created_at,
        )

    except HTTPException:
        raise

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        logger.exception(
            "User profile update failed"
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to update user profile",
        ) from exc