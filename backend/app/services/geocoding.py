from __future__ import annotations

from typing import Any

import httpx


NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org"
NOMINATIM_SEARCH_URL = f"{NOMINATIM_BASE_URL}/search"

GEOCODING_TIMEOUT_SECONDS = 15.0

# Change this to your actual project/application name.
USER_AGENT = "GeoAgent/1.0"


class GeocodingService:
    """Geocoding service using OpenStreetMap Nominatim."""

    @staticmethod
    def _parse_bbox(
        value: list[str] | None,
    ) -> list[float] | None:
        """
        Nominatim returns:

        [south, north, west, east]

        GeoAgent uses:

        [west, south, east, north]
        """

        if not value or len(value) != 4:
            return None

        try:
            south = float(value[0])
            north = float(value[1])
            west = float(value[2])
            east = float(value[3])
        except (TypeError, ValueError):
            return None

        return [
            west,
            south,
            east,
            north,
        ]

    @staticmethod
    def _parse_result(
        result: dict[str, Any],
    ) -> dict[str, Any]:
        latitude = float(result["lat"])
        longitude = float(result["lon"])

        bbox = GeocodingService._parse_bbox(
            result.get("boundingbox")
        )

        # Some results may not provide a useful bbox.
        # Create a small fallback area around the point.
        if bbox is None:
            delta = 0.05

            bbox = [
                longitude - delta,
                latitude - delta,
                longitude + delta,
                latitude + delta,
            ]

        return {
            "display_name": result.get(
                "display_name"
            ),
            "latitude": latitude,
            "longitude": longitude,
            "bbox": bbox,
            "osm_type": result.get("osm_type"),
            "osm_id": result.get("osm_id"),
            "place_id": result.get("place_id"),
            "type": result.get("type"),
            "category": result.get("category"),
            "importance": result.get("importance"),
            "address": result.get("address", {}),
        }

    @classmethod
    async def geocode(
        cls,
        query: str,
        country_codes: str | None = None,
        limit: int = 5,
    ) -> dict[str, Any]:

        query = query.strip()

        if not query:
            raise ValueError(
                "Location query cannot be empty."
            )

        if len(query) > 500:
            raise ValueError(
                "Location query is too long."
            )

        if not 1 <= limit <= 5:
            raise ValueError(
                "Geocoding limit must be between 1 and 5."
            )

        params: dict[str, Any] = {
            "q": query,
            "format": "jsonv2",
            "addressdetails": 1,
            "limit": limit,
        }

        if country_codes:
            params["countrycodes"] = country_codes

        headers = {
            "User-Agent": USER_AGENT,
            "Accept": "application/json",
        }

        try:
            async with httpx.AsyncClient(
                timeout=GEOCODING_TIMEOUT_SECONDS,
                headers=headers,
            ) as client:

                response = await client.get(
                    NOMINATIM_SEARCH_URL,
                    params=params,
                )

                response.raise_for_status()

                results = response.json()

        except httpx.HTTPError as exc:
            raise RuntimeError(
                f"Geocoding request failed: {exc}"
            ) from exc

        if not isinstance(results, list):
            raise RuntimeError(
                "Unexpected response from geocoding provider."
            )

        locations = [
            cls._parse_result(result)
            for result in results
            if isinstance(result, dict)
            and result.get("lat")
            and result.get("lon")
        ]

        if not locations:
            raise LookupError(
                f"No location found for '{query}'."
            )

        return {
            "status": "success",
            "provider": "OpenStreetMap Nominatim",
            "query": query,
            "count": len(locations),
            "locations": locations,
        }