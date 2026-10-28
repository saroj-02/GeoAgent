from __future__ import annotations

from datetime import datetime
from typing import Any

import httpx


STAC_BASE_URL = "https://planetarycomputer.microsoft.com/api/stac/v1"
STAC_SEARCH_URL = f"{STAC_BASE_URL}/search"

COLLECTION = "sentinel-2-l2a"
STAC_TIMEOUT_SECONDS = 30.0


class SatelliteService:
    """Service for querying Microsoft Planetary Computer Sentinel-2 imagery."""

    @staticmethod
    def validate_bbox(bbox: str) -> list[float]:
        try:
            values = [float(value.strip()) for value in bbox.split(",")]
        except (TypeError, ValueError) as exc:
            raise ValueError(
                "bbox must contain four numeric values: "
                "min_lon,min_lat,max_lon,max_lat"
            ) from exc

        if len(values) != 4:
            raise ValueError(
                "bbox must contain exactly four values: "
                "min_lon,min_lat,max_lon,max_lat"
            )

        min_lon, min_lat, max_lon, max_lat = values

        if not (-180 <= min_lon <= 180 and -180 <= max_lon <= 180):
            raise ValueError("Longitude must be between -180 and 180.")

        if not (-90 <= min_lat <= 90 and -90 <= max_lat <= 90):
            raise ValueError("Latitude must be between -90 and 90.")

        if min_lon >= max_lon:
            raise ValueError("min_lon must be smaller than max_lon.")

        if min_lat >= max_lat:
            raise ValueError("min_lat must be smaller than max_lat.")

        return values

    @staticmethod
    def validate_date(value: str | None, field_name: str) -> str | None:
        if value is None:
            return None

        try:
            datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError as exc:
            raise ValueError(
                f"{field_name} must be a valid ISO-8601 date."
            ) from exc

        return value

    @staticmethod
    def build_datetime_range(
        start_date: str | None,
        end_date: str | None,
    ) -> str | None:
        if start_date is None and end_date is None:
            return None

        start = start_date or ".."
        end = end_date or ".."

        return f"{start}/{end}"

    @staticmethod
    def get_datetime(properties: dict[str, Any]) -> str | None:
        value = properties.get("datetime")

        if value is None:
            return None

        return str(value)

    @staticmethod
    def extract_cloud_cover(properties: dict[str, Any]) -> float | None:
        value = properties.get("eo:cloud_cover")

        if value is None:
            value = properties.get("cloud_cover")

        if value is None:
            return None

        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    @staticmethod
    def bbox_from_geometry(
        geometry: dict[str, Any] | None,
    ) -> list[float] | None:
        if not geometry:
            return None

        coordinates = geometry.get("coordinates")

        if not coordinates:
            return None

        points: list[tuple[float, float]] = []

        def collect_points(value: Any) -> None:
            if (
                isinstance(value, list)
                and len(value) >= 2
                and isinstance(value[0], (int, float))
                and isinstance(value[1], (int, float))
            ):
                points.append((float(value[0]), float(value[1])))
                return

            if isinstance(value, list):
                for child in value:
                    collect_points(child)

        collect_points(coordinates)

        if not points:
            return None

        longitudes = [point[0] for point in points]
        latitudes = [point[1] for point in points]

        return [
            min(longitudes),
            min(latitudes),
            max(longitudes),
            max(latitudes),
        ]

    @staticmethod
    def get_asset_url(
        assets: dict[str, Any],
        *asset_names: str,
    ) -> str | None:
        for name in asset_names:
            asset = assets.get(name)

            if not isinstance(asset, dict):
                continue

            href = asset.get("href")

            if href:
                return str(href)

        return None

    @classmethod
    def scene_from_feature(
        cls,
        feature: dict[str, Any],
    ) -> dict[str, Any]:
        properties = feature.get("properties") or {}
        assets = feature.get("assets") or {}

        geometry = feature.get("geometry")
        bbox = feature.get("bbox")

        if not bbox:
            bbox = cls.bbox_from_geometry(geometry)

        thumbnail_url = cls.get_asset_url(
            assets,
            "thumbnail",
            "visual",
        )

        item_id = feature.get("id")

        tile_url = None

        if item_id:
            tile_url = (
                "https://planetarycomputer.microsoft.com/api/data/v1/"
                f"item/tilejson.json"
                f"?collection={COLLECTION}"
                f"&item={item_id}"
                "&assets=visual"
                "&asset_bidx=visual%7C1%2C2%2C3"
                "&nodata=0"
                "&format=png"
            )

        return {
            "id": item_id,
            "collection": feature.get("collection", COLLECTION),
            "datetime": cls.get_datetime(properties),
            "cloud_cover": cls.extract_cloud_cover(properties),
            "bbox": bbox,
            "geometry": geometry,
            "thumbnail_url": thumbnail_url,
            "tile_url": tile_url,
            "properties": {
                "platform": properties.get("platform"),
                "instruments": properties.get("instruments"),
                "s2:mgrs_tile": properties.get("s2:mgrs_tile"),
                "constellation": properties.get("constellation"),
                "eo:cloud_cover": properties.get("eo:cloud_cover"),
                "s2:product_uri": properties.get("s2:product_uri"),
            },
        }

    @classmethod
    async def search_scenes(
        cls,
        bbox: str,
        start_date: str | None = None,
        end_date: str | None = None,
        max_cloud_cover: float | None = None,
        limit: int = 10,
    ) -> dict[str, Any]:

        validated_bbox = cls.validate_bbox(bbox)

        start_date = cls.validate_date(start_date, "start_date")
        end_date = cls.validate_date(end_date, "end_date")

        if start_date and end_date:
            start_dt = datetime.fromisoformat(
                start_date.replace("Z", "+00:00")
            )
            end_dt = datetime.fromisoformat(
                end_date.replace("Z", "+00:00")
            )

            if start_dt > end_dt:
                raise ValueError(
                    "start_date must be earlier than or equal to end_date."
                )

        if max_cloud_cover is not None:
            if not 0 <= max_cloud_cover <= 100:
                raise ValueError(
                    "max_cloud_cover must be between 0 and 100."
                )

        if not 1 <= limit <= 100:
            raise ValueError("limit must be between 1 and 100.")

        payload: dict[str, Any] = {
            "collections": [COLLECTION],
            "bbox": validated_bbox,
            "limit": limit,
        }

        datetime_range = cls.build_datetime_range(
            start_date,
            end_date,
        )

        if datetime_range:
            payload["datetime"] = datetime_range

        if max_cloud_cover is not None:
            payload["query"] = {
                "eo:cloud_cover": {
                    "lte": max_cloud_cover
                }
            }

        try:
            async with httpx.AsyncClient(
                timeout=STAC_TIMEOUT_SECONDS
            ) as client:

                response = await client.post(
                    STAC_SEARCH_URL,
                    json=payload,
                )

                response.raise_for_status()

                data = response.json()

        except httpx.HTTPError as exc:
            raise RuntimeError(
                f"Planetary Computer request failed: {exc}"
            ) from exc

        features = data.get("features", [])

        scenes = [
            cls.scene_from_feature(feature)
            for feature in features
        ]

        return {
            "status": "success",
            "provider": "Microsoft Planetary Computer",
            "collection": COLLECTION,
            "count": len(scenes),
            "scenes": scenes,
            "query": {
                "bbox": validated_bbox,
                "start_date": start_date,
                "end_date": end_date,
                "max_cloud_cover": max_cloud_cover,
                "limit": limit,
            },
        }

    @classmethod
    async def get_scene(
        cls,
        scene_id: str,
    ) -> dict[str, Any]:

        if not scene_id.strip():
            raise ValueError("scene_id cannot be empty.")

        url = (
            f"{STAC_BASE_URL}/collections/"
            f"{COLLECTION}/items/{scene_id}"
        )

        try:
            async with httpx.AsyncClient(
                timeout=STAC_TIMEOUT_SECONDS
            ) as client:

                response = await client.get(url)
                response.raise_for_status()

                feature = response.json()

        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 404:
                raise LookupError(
                    f"Satellite scene '{scene_id}' was not found."
                ) from exc

            raise RuntimeError(
                f"Planetary Computer request failed: {exc}"
            ) from exc

        except httpx.HTTPError as exc:
            raise RuntimeError(
                f"Planetary Computer request failed: {exc}"
            ) from exc

        return {
            "status": "success",
            "provider": "Microsoft Planetary Computer",
            "scene": cls.scene_from_feature(feature),
        }

    @staticmethod
    def status() -> dict[str, Any]:
        return {
            "status": "available",
            "provider": "Microsoft Planetary Computer",
            "collection": COLLECTION,
            "stac_api": STAC_SEARCH_URL,
            "authentication_required": False,
            "message": "Satellite imagery discovery is available.",
        }