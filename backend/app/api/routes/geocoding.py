from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.services.geocoding import GeocodingService


router = APIRouter(
    prefix="/geocoding",
    tags=["Geocoding"],
)


@router.get("/search")
async def geocode_location(
    query: str = Query(
        ...,
        min_length=1,
        max_length=500,
        description="Location, address, city, region, or place name",
    ),
    country_codes: str | None = Query(
        default=None,
        description="Optional ISO country codes, e.g. 'in'",
    ),
    limit: int = Query(
        default=5,
        ge=1,
        le=5,
    ),
):
    try:
        return await GeocodingService.geocode(
            query=query,
            country_codes=country_codes,
            limit=limit,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except LookupError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        ) from exc

    except RuntimeError as exc:
        raise HTTPException(
            status_code=502,
            detail=str(exc),
        ) from exc