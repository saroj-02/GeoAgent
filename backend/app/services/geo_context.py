"""
GeoAgent automatic geospatial context builder.

Responsibilities:
- Classify geospatial questions.
- Resolve human-readable places using Nominatim.
- Build safe geology and satellite context.
- Avoid inventing measurements or unavailable datasets.
- Cache geocoding results to reduce external requests.
"""

from __future__ import annotations

import re
import time
from typing import Any

import httpx


NOMINATIM_URL = (
    "https://nominatim.openstreetmap.org/search"
)

USER_AGENT = (
    "GeoAgent/1.0 "
    "(geospatial intelligence application)"
)

# Public Nominatim policy recommends no more than
# approximately one request per second.
MIN_REQUEST_INTERVAL = 1.0

# Keep successful results in memory for one hour.
CACHE_TTL_SECONDS = 60 * 60


_location_cache: dict[
    str,
    tuple[float, dict[str, Any]],
] = {}

_last_nominatim_request = 0.0


LOCATION_KEYWORDS = {
    "where",
    "location",
    "located",
    "coordinate",
    "coordinates",
    "latitude",
    "longitude",
    "lat",
    "lon",
    "place",
    "city",
    "town",
    "district",
    "state",
    "country",
    "near",
    "nearest",
    "distance",
    "region",
    "area",
}

GEOLOGY_KEYWORDS = {
    "geology",
    "geological",
    "geologic",
    "rock",
    "rocks",
    "mineral",
    "minerals",
    "lithology",
    "formation",
    "formations",
    "soil",
    "tectonic",
    "tectonics",
    "sedimentary",
    "igneous",
    "metamorphic",
    "basalt",
    "granite",
    "gneiss",
    "schist",
    "sandstone",
    "limestone",
    "ore",
    "orebody",
}

SATELLITE_KEYWORDS = {
    "satellite",
    "sentinel",
    "sentinel-2",
    "landsat",
    "imagery",
    "image",
    "remote sensing",
    "remote-sensing",
    "ndvi",
    "ndwi",
    "ndbi",
    "evi",
    "spectral",
    "band",
    "bands",
    "raster",
    "stac",
    "cloud cover",
    "cloud coverage",
}


def normalize_query(query: str) -> str:
    """
    Normalize user input for classification and caching.
    """
    return " ".join(
        query.strip().lower().split()
    )


def classify_query(query: str) -> dict[str, bool]:
    """
    Determine which geospatial context categories
    are relevant to a query.
    """
    normalized = normalize_query(query)

    return {
        "location": any(
            keyword in normalized
            for keyword in LOCATION_KEYWORDS
        ),
        "geology": any(
            keyword in normalized
            for keyword in GEOLOGY_KEYWORDS
        ),
        "satellite": any(
            keyword in normalized
            for keyword in SATELLITE_KEYWORDS
        ),
    }


def extract_coordinates(
    query: str,
) -> tuple[float, float] | None:
    """
    Extract a simple latitude/longitude pair.

    Examples:
        20.2961, 85.8245
        20.2961 85.8245

    Returns:
        (latitude, longitude) or None
    """

    pattern = re.compile(
        r"(?<!\d)"
        r"(-?\d{1,3}(?:\.\d+)?)"
        r"(?:\s*,\s*|\s+)"
        r"(-?\d{1,3}(?:\.\d+)?)"
        r"(?!\d)"
    )

    match = pattern.search(query)

    if not match:
        return None

    try:
        latitude = float(match.group(1))
        longitude = float(match.group(2))
    except ValueError:
        return None

    if not -90 <= latitude <= 90:
        return None

    if not -180 <= longitude <= 180:
        return None

    return latitude, longitude


def _respect_nominatim_rate_limit() -> None:
    """
    Ensure requests to public Nominatim are spaced out.
    """
    global _last_nominatim_request

    now = time.monotonic()

    elapsed = (
        now - _last_nominatim_request
    )

    if elapsed < MIN_REQUEST_INTERVAL:
        time.sleep(
            MIN_REQUEST_INTERVAL - elapsed
        )

    _last_nominatim_request = (
        time.monotonic()
    )


def _cache_get(
    key: str,
) -> dict[str, Any] | None:
    cached = _location_cache.get(key)

    if not cached:
        return None

    created_at, value = cached

    if (
        time.monotonic() - created_at
        > CACHE_TTL_SECONDS
    ):
        _location_cache.pop(
            key,
            None,
        )
        return None

    return value


def _cache_set(
    key: str,
    value: dict[str, Any],
) -> None:
    _location_cache[key] = (
        time.monotonic(),
        value,
    )


async def geocode(
    query: str,
) -> dict[str, Any] | None:
    """
    Resolve a place name through Nominatim.

    This function intentionally returns only the
    information needed by GeoAgent.
    """

    normalized = normalize_query(query)

    if not normalized:
        return None

    cached = _cache_get(normalized)

    if cached is not None:
        return cached

    coordinates = extract_coordinates(
        query
    )

    if coordinates:
        latitude, longitude = coordinates

        result = {
            "display_name": (
                f"{latitude:.6f}, "
                f"{longitude:.6f}"
            ),
            "latitude": latitude,
            "longitude": longitude,
            "source": "user-provided coordinates",
        }

        _cache_set(
            normalized,
            result,
        )

        return result

    _respect_nominatim_rate_limit()

    params = {
        "q": query,
        "format": "jsonv2",
        "addressdetails": 1,
        "limit": 1,
    }

    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "application/json",
    }

    try:
        async with httpx.AsyncClient(
            timeout=10.0,
            headers=headers,
        ) as client:
            response = await client.get(
                NOMINATIM_URL,
                params=params,
            )

            response.raise_for_status()

            results = response.json()

    except Exception:
        return None

    if not isinstance(results, list):
        return None

    if not results:
        return None

    item = results[0]

    try:
        latitude = float(
            item["lat"]
        )
        longitude = float(
            item["lon"]
        )
    except (
        KeyError,
        TypeError,
        ValueError,
    ):
        return None

    address = item.get(
        "address",
        {},
    )

    if not isinstance(address, dict):
        address = {}

    result = {
        "display_name": item.get(
            "display_name",
            query,
        ),
        "latitude": latitude,
        "longitude": longitude,
        "type": item.get("type"),
        "category": item.get(
            "category"
        ),
        "address": {
            key: value
            for key, value in address.items()
            if value
        },
        "source": "OpenStreetMap Nominatim",
    }

    _cache_set(
        normalized,
        result,
    )

    return result


def build_location_context(
    location: dict[str, Any] | None,
) -> dict[str, Any]:
    """
    Convert a geocoded location into safe AI context.
    """

    if not location:
        return {}

    context: dict[str, Any] = {
        "location": {
            "name": location.get(
                "display_name"
            ),
            "latitude": location.get(
                "latitude"
            ),
            "longitude": location.get(
                "longitude"
            ),
            "type": location.get(
                "type"
            ),
            "source": location.get(
                "source"
            ),
        }
    }

    address = location.get(
        "address"
    )

    if isinstance(address, dict):
        context["location"]["address"] = (
            address
        )

    return context


def build_geology_context(
    location: dict[str, Any] | None,
) -> dict[str, Any]:
    """
    Build geology-related context.

    Important:
    This does not pretend to have authoritative
    geological measurements for an arbitrary point.
    """

    if not location:
        return {
            "geology": {
                "available": False,
                "message": (
                    "No resolved location was available. "
                    "Do not infer site-specific geology."
                ),
            }
        }

    return {
        "geology": {
            "available": True,
            "resolved_location": location.get(
                "display_name"
            ),
            "latitude": location.get(
                "latitude"
            ),
            "longitude": location.get(
                "longitude"
            ),
            "note": (
                "General geological interpretation may "
                "be discussed, but site-specific rock, "
                "soil, mineral, or formation claims "
                "require authoritative geological data."
            ),
        }
    }


def build_satellite_context(
    location: dict[str, Any] | None,
) -> dict[str, Any]:
    """
    Build satellite-related context.

    The actual Sentinel-2 imagery service remains the
    source of imagery/scenes. This function does not
    invent imagery or spectral measurements.
    """

    if not location:
        return {
            "satellite": {
                "available": False,
                "message": (
                    "No resolved location was available "
                    "for satellite context."
                ),
            }
        }

    return {
        "satellite": {
            "available": True,
            "provider": (
                "Microsoft Planetary Computer"
            ),
            "collection": "sentinel-2-l2a",
            "latitude": location.get(
                "latitude"
            ),
            "longitude": location.get(
                "longitude"
            ),
            "note": (
                "Satellite imagery availability and "
                "spectral measurements must be obtained "
                "from the satellite analysis service. "
                "Do not invent NDVI, NDWI, NDBI, cloud "
                "cover, or other measurements."
            ),
        }
    }


async def build_geo_context(
    query: str,
) -> dict[str, Any]:
    """
    Build automatic context for an AI query.
    """

    normalized = normalize_query(query)
    classification = classify_query(query)

    context: dict[str, Any] = {
        "query": normalized,
        "classification": classification,
    }

    needs_location = (
        classification["location"]
        or classification["geology"]
        or classification["satellite"]
    )

    location = None

    if needs_location:
        location = await geocode(query)

    if classification["location"]:
        context.update(
            build_location_context(
                location
            )
        )

    if classification["geology"]:
        context.update(
            build_geology_context(
                location
            )
        )

    if classification["satellite"]:
        context.update(
            build_satellite_context(
                location
            )
        )

    return context