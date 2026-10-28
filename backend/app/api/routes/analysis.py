"""Geospatial analysis API routes."""

from fastapi import APIRouter, HTTPException, status

from app.schemas import (
    ChangeDetectionRequest,
    ChangeDetectionResponse,
    SpectralIndexRequest,
    SpectralIndexResponse,
)

router = APIRouter(prefix="/analysis", tags=["Analysis"])


def _safe_ratio(numerator: float, denominator: float) -> float:
    """Calculate a normalized ratio while protecting against division by zero."""
    if denominator == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot calculate index because the denominator is zero.",
        )

    return numerator / denominator


@router.post(
    "/spectral-index",
    response_model=SpectralIndexResponse,
)
async def calculate_spectral_index(
    request: SpectralIndexRequest,
):
    """
    Calculate a spectral index from supplied band values.

    Supported indices:

    - NDVI = (NIR - Red) / (NIR + Red)
    - NDWI = (NIR - Green) / (NIR + Green)
    - NDBI = (SWIR - NIR) / (SWIR + NIR)

    This endpoint works with supplied band values. It does not pretend
    to download or process satellite imagery automatically.
    """

    index = request.index.strip().lower()

    if index == "ndvi":
        if request.nir is None or request.red is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="NDVI requires nir and red values.",
            )

        value = _safe_ratio(
            request.nir - request.red,
            request.nir + request.red,
        )

        if value >= 0.6:
            interpretation = "Dense, healthy vegetation."
        elif value >= 0.3:
            interpretation = "Moderate vegetation."
        elif value >= 0.1:
            interpretation = "Sparse or stressed vegetation."
        else:
            interpretation = "Little vegetation or non-vegetated surface."

    elif index == "ndwi":
        if request.nir is None or request.green is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="NDWI requires nir and green values.",
            )

        value = _safe_ratio(
            request.nir - request.green,
            request.nir + request.green,
        )

        if value >= 0.5:
            interpretation = "Strong water-related signal."
        elif value >= 0.2:
            interpretation = "Moderate moisture or water signal."
        elif value >= 0:
            interpretation = "Low moisture or mixed surface."
        else:
            interpretation = "Generally non-water or relatively dry surface."

    elif index == "ndbi":
        if request.swir is None or request.nir is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="NDBI requires swir and nir values.",
            )

        value = _safe_ratio(
            request.swir - request.nir,
            request.swir + request.nir,
        )

        if value >= 0.3:
            interpretation = "Strong built-up surface signal."
        elif value >= 0.1:
            interpretation = "Moderate built-up surface signal."
        elif value >= 0:
            interpretation = "Weak built-up or mixed surface signal."
        else:
            interpretation = "Generally non-built-up surface."

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported index. Use ndvi, ndwi, or ndbi.",
        )

    return SpectralIndexResponse(
        index=index,
        value=round(value, 6),
        interpretation=interpretation,
    )


@router.post(
    "/change-detection",
    response_model=ChangeDetectionResponse,
)
async def calculate_change_detection(
    request: ChangeDetectionRequest,
):
    """
    Calculate a simple normalized change metric between two observations.

    delta = after_mean - before_mean

    A change is flagged when the absolute delta is greater than or
    equal to the requested threshold.
    """

    delta = request.after_mean - request.before_mean
    changed = abs(delta) >= request.threshold

    if delta > 0:
        interpretation = "Increase detected."
    elif delta < 0:
        interpretation = "Decrease detected."
    else:
        interpretation = "No change detected."

    if changed:
        interpretation += (
            f" Absolute change ({abs(delta):.4f}) meets or exceeds "
            f"the threshold ({request.threshold:.4f})."
        )
    else:
        interpretation += (
            f" Absolute change ({abs(delta):.4f}) is below "
            f"the threshold ({request.threshold:.4f})."
        )

    return ChangeDetectionResponse(
        before_mean=request.before_mean,
        after_mean=request.after_mean,
        delta=round(delta, 6),
        changed=changed,
        threshold=request.threshold,
        interpretation=interpretation,
    )


@router.get("/status")
async def analysis_status():
    """Return the current analysis service status."""

    return {
        "status": "operational",
        "capabilities": [
            "NDVI",
            "NDWI",
            "NDBI",
            "change_detection",
        ],
        "message": (
            "Geospatial analysis API is ready for supplied "
            "spectral-band values and change metrics."
        ),
    }