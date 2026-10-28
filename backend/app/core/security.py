"""
GeoAgent security utilities.

Password strategy:
- Argon2id for all newly created passwords.
- bcrypt verification retained for legacy accounts.
- Successful legacy bcrypt authentication is transparently upgraded
  to Argon2id.

JWT:
- Access tokens
- Refresh tokens
- Email verification tokens
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings


settings = get_settings()


# ----------------------------------------------------------------------
# Password hashing
# ----------------------------------------------------------------------

# Argon2id is the primary/new password scheme.
#
# bcrypt is retained only so existing GeoAgent accounts created using
# the previous implementation can still log in.
pwd_context = CryptContext(
    schemes=["argon2", "bcrypt"],
    deprecated=["bcrypt"],
)


# ----------------------------------------------------------------------
# JWT configuration
# ----------------------------------------------------------------------

JWT_ALGORITHM = "HS256"


def _secret_key() -> str:
    """
    Obtain JWT secret.

    Uses SECRET_KEY if present in the Settings object. Falls back to a
    development-only deterministic value so the application can start
    in an existing local environment where SECRET_KEY is not defined.
    """
    secret = getattr(settings, "SECRET_KEY", None)

    if secret:
        return secret

    return "geoagent-development-secret-change-in-production"


# ----------------------------------------------------------------------
# Password functions
# ----------------------------------------------------------------------


def hash_password(password: str) -> str:
    """Hash a password using Argon2id."""
    return pwd_context.hash(password)


def verify_password(
    plain_password: str,
    password_hash: str,
) -> bool:
    """Verify a password against an existing hash."""
    try:
        return pwd_context.verify(
            plain_password,
            password_hash,
        )
    except Exception:
        return False


def needs_rehash(password_hash: str) -> bool:
    """
    Return True when an existing password should be upgraded.

    bcrypt accounts are upgraded to Argon2id after successful login.
    """
    try:
        return pwd_context.needs_update(password_hash)
    except Exception:
        return True


# ----------------------------------------------------------------------
# JWT helpers
# ----------------------------------------------------------------------


def create_access_token(
    subject: str,
    extra_claims: Optional[dict[str, Any]] = None,
) -> str:
    """Create an access JWT."""
    now = datetime.now(timezone.utc)

    expires = now + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload: dict[str, Any] = {
        "sub": subject,
        "type": "access",
        "iat": now,
        "exp": expires,
    }

    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(
        payload,
        _secret_key(),
        algorithm=JWT_ALGORITHM,
    )


def create_refresh_token(subject: str) -> str:
    """Create a refresh JWT."""
    now = datetime.now(timezone.utc)

    expires = now + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )

    payload = {
        "sub": subject,
        "type": "refresh",
        "iat": now,
        "exp": expires,
    }

    return jwt.encode(
        payload,
        _secret_key(),
        algorithm=JWT_ALGORITHM,
    )


def create_email_verification_token(user_id: str) -> str:
    """Create an email verification JWT."""
    now = datetime.now(timezone.utc)

    expires = now + timedelta(
        hours=settings.EMAIL_VERIFICATION_EXPIRY_HOURS
    )

    payload = {
        "sub": user_id,
        "type": "email_verification",
        "iat": now,
        "exp": expires,
    }

    return jwt.encode(
        payload,
        _secret_key(),
        algorithm=JWT_ALGORITHM,
    )


def decode_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT."""
    try:
        return jwt.decode(
            token,
            _secret_key(),
            algorithms=[JWT_ALGORITHM],
        )

    except JWTError as exc:
        raise ValueError("Invalid or expired token") from exc


# ----------------------------------------------------------------------
# Service class
# ----------------------------------------------------------------------


class SecurityService:
    """
    Backward-compatible security service.

    Existing routes can use either:

        SecurityService.hash_password(...)

    or module-level functions such as:

        hash_password(...)
    """

    hash_password = staticmethod(hash_password)
    verify_password = staticmethod(verify_password)
    needs_rehash = staticmethod(needs_rehash)

    create_access_token = staticmethod(create_access_token)
    create_refresh_token = staticmethod(create_refresh_token)
    create_email_verification_token = staticmethod(
        create_email_verification_token
    )

    decode_token = staticmethod(decode_token)
    verify_token = staticmethod(decode_token)