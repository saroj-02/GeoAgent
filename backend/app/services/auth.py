"""
Authentication service for GeoAgent.

Handles:
- User registration
- User login
- Password verification
- JWT token generation
- Email verification
- User lookup
- Account activation/deactivation
- Legacy bcrypt -> Argon2id password migration
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from uuid import UUID, uuid4

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError

from app.core.config import get_settings
from app.core.security import SecurityService
from app.models import User

settings = get_settings()


class AuthService:
    """Application authentication and user-management service."""

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _document_to_user(document: Optional[dict[str, Any]]) -> Optional[User]:
        """
        Convert a MongoDB document into a User model.

        MongoDB stores the user identifier as `_id` in some deployments,
        while the application model uses `id`.
        """
        if not document:
            return None

        data = dict(document)

        if "_id" in data and "id" not in data:
            data["id"] = data.pop("_id")

        # User.id is stored as a string in the application model.
# MongoDB may return _id as either a string or UUID depending
# on how the document was originally created.
        if data.get("id") is not None:
            data["id"] = str(data["id"])

        return User.model_validate(data)

    @staticmethod
    def _user_to_document(user: User) -> dict[str, Any]:
        """Convert a User model to a MongoDB document."""
        data = user.model_dump()

        user_id = data.pop("id", None)

        if user_id is not None:
            data["_id"] = str(user_id)

        return data

    @staticmethod
    def _utcnow() -> datetime:
        """Return the current UTC datetime."""
        return datetime.now(timezone.utc)

    # ------------------------------------------------------------------
    # Registration
    # ------------------------------------------------------------------

    @staticmethod
    async def register_user(
        db: AsyncIOMotorDatabase,
        email: str,
        username: str,
        password: str,
        full_name: Optional[str] = None,
    ) -> User:
        """
        Register a new user.

        New passwords are always stored using Argon2id through
        SecurityService.hash_password().
        """
        email = email.strip().lower()
        username = username.strip()

        # Check email
        existing_email = await db.users.find_one(
            {"email": email},
            {"_id": 1},
        )

        if existing_email:
            raise ValueError("An account with this email already exists")

        # Check username
        existing_username = await db.users.find_one(
            {"username": username},
            {"_id": 1},
        )

        if existing_username:
            raise ValueError("This username is already taken")

        now = AuthService._utcnow()
        user_id = str(uuid4())

        password_hash = SecurityService.hash_password(password)

        user = User(
            id=user_id,
            email=email,
            username=username,
            full_name=full_name.strip() if full_name else None,
            password_hash=password_hash,
            email_verified=False,
            is_active=True,
            created_at=now,
            updated_at=now,
        )

        document = AuthService._user_to_document(user)

        try:
            await db.users.insert_one(document)
        except DuplicateKeyError as exc:
            message = str(exc).lower()

            if "email" in message:
                raise ValueError(
                    "An account with this email already exists"
                ) from exc

            if "username" in message:
                raise ValueError(
                    "This username is already taken"
                ) from exc

            raise ValueError("Unable to create account") from exc

        return user

    # ------------------------------------------------------------------
    # Login
    # ------------------------------------------------------------------

    @staticmethod
    async def login_user(
        db: AsyncIOMotorDatabase,
        email: str,
        password: str,
    ) -> User:
        """
        Authenticate a user using email and password.

        Legacy bcrypt passwords are transparently upgraded to Argon2id
        after successful authentication.
        """
        email = email.strip().lower()

        document = await db.users.find_one({"email": email})

        if not document:
            raise ValueError("Invalid email or password")

        user = AuthService._document_to_user(document)

        if user is None:
            raise ValueError("Invalid email or password")

        if not user.is_active:
            raise ValueError("This account is inactive")

        password_hash = user.password_hash

        if not SecurityService.verify_password(
            password,
            password_hash,
        ):
            raise ValueError("Invalid email or password")

        # Automatically migrate old bcrypt hashes to Argon2id.
        if SecurityService.needs_rehash(password_hash):
            new_hash = SecurityService.hash_password(password)

            await db.users.update_one(
                {"_id": str(user.id)},
                {
                    "$set": {
                        "password_hash": new_hash,
                        "updated_at": AuthService._utcnow(),
                    }
                },
            )

            user.password_hash = new_hash

        # Update last login.
        now = AuthService._utcnow()

        await db.users.update_one(
            {"_id": str(user.id)},
            {
                "$set": {
                    "last_login": now,
                    "updated_at": now,
                }
            },
        )

        user.last_login = now
        user.updated_at = now

        return user

    # ------------------------------------------------------------------
    # Backward-compatible login alias
    # ------------------------------------------------------------------

    @staticmethod
    async def authenticate_user(
        db: AsyncIOMotorDatabase,
        email: str,
        password: str,
    ) -> User:
        """
        Backward-compatible authentication entry point.

        Some versions of the API route call authenticate_user()
        instead of login_user(). Keep both names supported.
        """
        return await AuthService.login_user(
            db=db,
            email=email,
            password=password,
        )

    # ------------------------------------------------------------------
    # User lookup
    # ------------------------------------------------------------------

    @staticmethod
    async def get_user_by_id(
        db: AsyncIOMotorDatabase,
        user_id: UUID | str,
    ) -> Optional[User]:
        """Return a user by ID."""
        user_id_string = str(user_id)

        document = await db.users.find_one(
            {"_id": user_id_string}
        )

        if not document:
            # Compatibility for databases where id was stored as UUID.
            try:
                user_uuid = UUID(user_id_string)

                document = await db.users.find_one(
                    {"_id": user_uuid}
                )
            except ValueError:
                document = None

        return AuthService._document_to_user(document)

    @staticmethod
    async def get_user_by_email(
        db: AsyncIOMotorDatabase,
        email: str,
    ) -> Optional[User]:
        """Return a user by email."""
        document = await db.users.find_one(
            {"email": email.strip().lower()}
        )

        return AuthService._document_to_user(document)

    @staticmethod
    async def get_user_by_username(
        db: AsyncIOMotorDatabase,
        username: str,
    ) -> Optional[User]:
        """Return a user by username."""
        document = await db.users.find_one(
            {"username": username.strip()}
        )

        return AuthService._document_to_user(document)

    # ------------------------------------------------------------------
    # JWT
    # ------------------------------------------------------------------

    @staticmethod
    def create_access_token(user: User) -> str:
        """Create a JWT access token for a user."""
        return SecurityService.create_access_token(
            subject=str(user.id),
            extra_claims={
                "email": user.email,
                "username": user.username,
            },
        )

    @staticmethod
    def create_refresh_token(user: User) -> str:
        """Create a JWT refresh token for a user."""
        return SecurityService.create_refresh_token(
            subject=str(user.id),
        )

    # ------------------------------------------------------------------
    # Email verification
    # ------------------------------------------------------------------

    @staticmethod
    async def create_email_verification_token(
        db: AsyncIOMotorDatabase,
        user: User,
    ) -> str:
        """
        Create and persist an email verification token.
        """
        token = SecurityService.create_email_verification_token(
            user_id=str(user.id)
        )

        expires_at = AuthService._utcnow() + timedelta(
            hours=settings.EMAIL_VERIFICATION_EXPIRY_HOURS
        )

        await db.users.update_one(
            {"_id": str(user.id)},
            {
                "$set": {
                    "email_verification_token": token,
                    "email_verification_expires_at": expires_at,
                    "updated_at": AuthService._utcnow(),
                }
            },
        )

        return token

    @staticmethod
    async def verify_email(
        db: AsyncIOMotorDatabase,
        token: str,
    ) -> Optional[User]:
        """Verify a user's email using a stored verification token."""
        now = AuthService._utcnow()

        document = await db.users.find_one(
            {
                "email_verification_token": token,
                "email_verification_expires_at": {
                    "$gt": now,
                },
            }
        )

        if not document:
            return None

        user = AuthService._document_to_user(document)

        if user is None:
            return None

        await db.users.update_one(
            {"_id": str(user.id)},
            {
                "$set": {
                    "email_verified": True,
                    "updated_at": now,
                },
                "$unset": {
                    "email_verification_token": "",
                    "email_verification_expires_at": "",
                },
            },
        )

        user.email_verified = True
        user.updated_at = now

        return user

    # ------------------------------------------------------------------
    # Account state
    # ------------------------------------------------------------------

    @staticmethod
    async def set_user_active(
        db: AsyncIOMotorDatabase,
        user_id: UUID | str,
        is_active: bool,
    ) -> Optional[User]:
        """Enable or disable a user account."""
        now = AuthService._utcnow()

        result = await db.users.find_one_and_update(
            {"_id": str(user_id)},
            {
                "$set": {
                    "is_active": is_active,
                    "updated_at": now,
                }
            },
            return_document=True,
        )

        return AuthService._document_to_user(result)

    # ------------------------------------------------------------------
    # Profile update
    # ------------------------------------------------------------------

    @staticmethod
    async def update_user(
        db: AsyncIOMotorDatabase,
        user_id: UUID | str,
        full_name: Optional[str] = None,
        username: Optional[str] = None,
    ) -> Optional[User]:
        """Update editable user profile fields."""
        updates: dict[str, Any] = {
            "updated_at": AuthService._utcnow(),
        }

        if full_name is not None:
            updates["full_name"] = full_name.strip()

        if username is not None:
            username = username.strip()

            existing = await db.users.find_one(
                {
                    "username": username,
                    "_id": {"$ne": str(user_id)},
                },
                {"_id": 1},
            )

            if existing:
                raise ValueError("This username is already taken")

            updates["username"] = username

        result = await db.users.find_one_and_update(
            {"_id": str(user_id)},
            {"$set": updates},
            return_document=True,
        )

        return AuthService._document_to_user(result)