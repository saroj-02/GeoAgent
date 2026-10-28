"""
GeoAgent AI Assistant API.

The endpoint:
- authenticates the user;
- builds automatic geospatial context;
- uses OpenAI when configured;
- falls back to local Ollama;
- returns a consistent AgentQueryResponse.
"""

from __future__ import annotations

import logging

import httpx

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Security,
    status,
)

from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)

from motor.motor_asyncio import (
    AsyncIOMotorDatabase,
)

from app.core.config import get_settings
from app.core.database import get_async_db
from app.core.security import SecurityService
from app.models import User
from app.schemas import (
    AgentQueryRequest,
    AgentQueryResponse,
)
from app.services.auth import AuthService
from app.services.geo_context import (
    build_geo_context,
)


logger = logging.getLogger(__name__)

settings = get_settings()

security = HTTPBearer()

router = APIRouter(
    prefix="/agent",
    tags=["AI Agent"],
)


OLLAMA_URL = (
    "http://127.0.0.1:11434/api/chat"
)

OLLAMA_MODEL = "llama3.2"


SYSTEM_PROMPT = """
You are GeoAgent, an AI geospatial intelligence assistant.

Your job is to answer questions about:

- geography
- locations
- coordinates
- geology
- rocks and minerals
- remote sensing
- satellite imagery
- Sentinel-2
- Landsat
- NDVI
- NDWI
- NDBI
- GIS
- spatial analysis

Rules:

1. Be accurate and concise.
2. Clearly distinguish known data from general explanation.
3. Never invent satellite observations.
4. Never invent coordinates.
5. Never invent cloud-cover percentages.
6. Never invent NDVI, NDWI, NDBI or other measurements.
7. If the supplied context does not contain a measurement,
   explicitly say that the measurement is not available.
8. If discussing geology, distinguish general regional
   geology from site-specific geological observations.
9. Use the supplied geospatial context when it is relevant.
10. Do not claim that an external dataset was queried unless
    the context explicitly says it was queried.
11. When coordinates are supplied, present them clearly.
12. Prefer practical answers that help the user perform
    the next GIS or satellite-analysis step.
""".strip()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(
        security
    ),
    db: AsyncIOMotorDatabase = Depends(
        get_async_db
    ),
) -> User:
    """
    Authenticate the current user.
    """

    try:
        payload = SecurityService.verify_token(
            credentials.credentials
        )

        if payload.get("type") != "access":
            raise ValueError(
                "Invalid access token"
            )

        user_id = payload.get("sub")

        if not user_id:
            raise ValueError(
                "Token does not contain a user ID"
            )

        user = await AuthService.get_user_by_id(
            db,
            user_id,
        )

        if not user:
            raise ValueError(
                "User not found"
            )

        if not user.is_active:
            raise ValueError(
                "User is inactive"
            )

        return user

    except Exception as exc:
        logger.warning(
            "Agent authentication failed: %s",
            exc,
        )

        raise HTTPException(
            status_code=(
                status.HTTP_401_UNAUTHORIZED
            ),
            detail="Invalid or expired token",
            headers={
                "WWW-Authenticate": "Bearer",
            },
        ) from exc


def _build_prompt(
    query: str,
    context: dict,
    automatic_geo_context: dict,
) -> str:
    """
    Build a safe prompt containing both frontend
    device context and automatically discovered
    geospatial context.
    """

    return (
        "GeoAgent context:\n"
        f"{context}\n\n"
        "Automatically discovered geospatial context:\n"
        f"{automatic_geo_context}\n\n"
        "User question:\n"
        f"{query}"
    )


async def call_openai(
    query: str,
    context: dict,
    automatic_geo_context: dict,
) -> str:
    """
    Call the configured OpenAI model.
    """

    from openai import OpenAI

    client = OpenAI(
        api_key=settings.OPENAI_API_KEY
    )

    prompt = _build_prompt(
        query=query,
        context=context,
        automatic_geo_context=(
            automatic_geo_context
        ),
    )

    result = client.chat.completions.create(
        model=settings.LLM_MODEL,
        messages=[
            {
                "role": "system",
                "content": SYSTEM_PROMPT,
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
        temperature=(
            settings.LLM_TEMPERATURE
        ),
    )

    if not result.choices:
        raise RuntimeError(
            "OpenAI returned no choices."
        )

    content = (
        result.choices[0]
        .message
        .content
    )

    if not content:
        raise RuntimeError(
            "OpenAI returned an empty response."
        )

    return content.strip()


async def call_ollama(
    query: str,
    context: dict,
    automatic_geo_context: dict,
) -> str:
    """
    Call local Ollama.

    Ollama must be running at:
        http://127.0.0.1:11434
    """

    prompt = _build_prompt(
        query=query,
        context=context,
        automatic_geo_context=(
            automatic_geo_context
        ),
    )

    payload = {
        "model": OLLAMA_MODEL,
        "stream": False,
        "messages": [
            {
                "role": "system",
                "content": SYSTEM_PROMPT,
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
        "options": {
            "temperature": 0.3,
        },
    }

    async with httpx.AsyncClient(
        timeout=120.0
    ) as client:
        response = await client.post(
            OLLAMA_URL,
            json=payload,
        )

        response.raise_for_status()

        data = response.json()

    message = data.get(
        "message",
        {},
    )

    content = message.get(
        "content"
    )

    if not content:
        raise RuntimeError(
            "Ollama returned an empty response."
        )

    return content.strip()


def _fallback_response(
    query: str,
    context: dict,
    automatic_geo_context: dict,
) -> str:
    """
    Last-resort deterministic response if both
    OpenAI and Ollama are unavailable.
    """

    location = automatic_geo_context.get(
        "location"
    )

    if isinstance(location, dict):
        name = location.get(
            "name"
        )

        latitude = location.get(
            "latitude"
        )

        longitude = location.get(
            "longitude"
        )

        if (
            latitude is not None
            and longitude is not None
        ):
            return (
                f"I resolved the requested location "
                f"as {name}. "
                f"Coordinates: "
                f"{float(latitude):.6f}, "
                f"{float(longitude):.6f}. "
                "The AI providers are currently "
                "unavailable, so I cannot provide "
                "additional analysis right now."
            )

        return (
            f"I resolved the requested location "
            f"as {name}, but the AI providers are "
            "currently unavailable."
        )

    device = context.get(
        "device_name",
        "selected device",
    )

    return (
        f"GeoAgent received your question about "
        f"{query!r} for {device}. "
        "The AI providers are currently "
        "unavailable."
    )


@router.get("/status")
async def agent_status():
    """
    Return AI service status.
    """

    if settings.OPENAI_API_KEY:
        return {
            "status": "operational",
            "mode": "openai",
            "model": settings.LLM_MODEL,
            "fallback": "ollama",
            "fallback_model": OLLAMA_MODEL,
            "message": (
                "GeoAgent AI is ready."
            ),
        }

    return {
        "status": "operational",
        "mode": "ollama",
        "model": OLLAMA_MODEL,
        "message": (
            "GeoAgent local AI is ready."
        ),
    }


@router.post(
    "/query",
    response_model=AgentQueryResponse,
)
async def agent_query(
    request: AgentQueryRequest,
    current_user: User = Depends(
        get_current_user
    ),
):
    """
    Process a geospatial AI query.
    """

    context = request.context or {}

    try:
        automatic_geo_context = (
            await build_geo_context(
                request.query
            )
        )

    except Exception as exc:
        logger.warning(
            "Automatic geo context failed: %s",
            exc,
        )

        automatic_geo_context = {
            "classification": {},
            "error": (
                "Automatic geospatial context "
                "was unavailable."
            ),
        }

    combined_context = {
        **context,
        "automatic_geo_context": (
            automatic_geo_context
        ),
    }

    # ---------------------------------------------------------
    # OpenAI
    # ---------------------------------------------------------

    if settings.OPENAI_API_KEY:

        try:
            response_text = await call_openai(
                query=request.query,
                context=context,
                automatic_geo_context=(
                    automatic_geo_context
                ),
            )

            return AgentQueryResponse(
                response=response_text,
                mode="openai",
                user_id=str(
                    current_user.id
                ),
                context=combined_context,
            )

        except Exception as exc:
            logger.warning(
                "OpenAI request failed; "
                "falling back to Ollama: %s",
                exc,
            )

    # ---------------------------------------------------------
    # Ollama
    # ---------------------------------------------------------

    try:
        response_text = await call_ollama(
            query=request.query,
            context=context,
            automatic_geo_context=(
                automatic_geo_context
            ),
        )

        return AgentQueryResponse(
            response=response_text,
            mode="ollama",
            user_id=str(
                current_user.id
            ),
            context=combined_context,
        )

    except Exception as exc:
        logger.warning(
            "Ollama request failed: %s",
            exc,
        )

    # ---------------------------------------------------------
    # Deterministic fallback
    # ---------------------------------------------------------

    return AgentQueryResponse(
        response=_fallback_response(
            query=request.query,
            context=context,
            automatic_geo_context=(
                automatic_geo_context
            ),
        ),
        mode="local",
        user_id=str(
            current_user.id
        ),
        context=combined_context,
    )