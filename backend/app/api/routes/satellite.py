from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.services.satellite import SatelliteService


router = APIRouter(
    prefix="/satellite",
    tags=["Satellite"],
)


@router.get("/status")
async def satellite_status():
    return SatelliteService.status()


@router.get("/scenes")
async def search_satellite_scenes(
    bbox: str = Query(
        ...,
        description="Bounding box: min_lon,min_lat,max_lon,max_lat",
    ),
    start_date: str | None = Query(
        default=None,
        description="Start date in ISO-8601 format",
    ),
    end_date: str | None = Query(
        default=None,
        description="End date in ISO-8601 format",
    ),
    max_cloud_cover: float | None = Query(
        default=None,
        ge=0,
        le=100,
        description="Maximum cloud cover percentage",
    ),
    limit: int = Query(
        default=10,
        ge=1,
        le=100,
        description="Maximum number of scenes",
    ),
):
    try:
        return await SatelliteService.search_scenes(
            bbox=bbox,
            start_date=start_date,
            end_date=end_date,
            max_cloud_cover=max_cloud_cover,
            limit=limit,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except RuntimeError as exc:
        raise HTTPException(
            status_code=502,
            detail=str(exc),
        ) from exc


@router.get("/scenes/{scene_id}")
async def get_satellite_scene(scene_id: str):
    try:
        return await SatelliteService.get_scene(scene_id)

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