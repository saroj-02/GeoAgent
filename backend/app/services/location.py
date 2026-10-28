"""
Location tracking service using Motor async MongoDB driver.
"""

import logging
import math
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import get_settings
from app.models import LocationPoint
from app.services.permission import PermissionService


logger = logging.getLogger(__name__)

settings = get_settings()


class LocationService:
    """Location tracking and retrieval service."""

    @staticmethod
    def validate_location(
        latitude: float,
        longitude: float,
        previous_point: Optional[LocationPoint] = None,
        accuracy: Optional[float] = None,
    ) -> tuple[bool, Optional[str]]:
        """
        Validate a location point.

        Returns:
            Tuple of (is_valid, validation_notes)
        """

        if not (-90 <= latitude <= 90):
            return False, "Invalid latitude range"

        if not (-180 <= longitude <= 180):
            return False, "Invalid longitude range"

        if accuracy is not None and accuracy < 0:
            return False, "Accuracy cannot be negative"

        if previous_point:
            distance = LocationService._calculate_distance(
                previous_point.latitude,
                previous_point.longitude,
                latitude,
                longitude,
            )

            if distance > settings.MAX_GPS_JUMP_METERS:
                return (
                    False,
                    f"Impossible location jump: {distance:.0f}m",
                )

        return True, None

    @staticmethod
    def _calculate_distance(
        lat1: float,
        lon1: float,
        lat2: float,
        lon2: float,
    ) -> float:
        """Calculate distance using the Haversine formula."""

        earth_radius = 6371000.0

        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)

        delta_lat = math.radians(
            lat2 - lat1
        )

        delta_lon = math.radians(
            lon2 - lon1
        )

        a = (
            math.sin(delta_lat / 2) ** 2
            + math.cos(lat1_rad)
            * math.cos(lat2_rad)
            * math.sin(delta_lon / 2) ** 2
        )

        return (
            earth_radius
            * 2
            * math.asin(math.sqrt(a))
        )

    @staticmethod
    async def create_location(
        db: AsyncIOMotorDatabase,
        device_id: str,
        latitude: float,
        longitude: float,
        accuracy: Optional[float] = None,
        altitude: Optional[float] = None,
        speed: Optional[float] = None,
        heading: Optional[float] = None,
        timestamp: Optional[datetime] = None,
        source: str = "gps",
    ) -> LocationPoint:
        """Create and persist a location point."""

        if timestamp is None:
            timestamp = datetime.now(timezone.utc)

        # Verify that the device exists.
        device_raw = await db.devices.find_one(
            {"_id": device_id}
        )

        if not device_raw:
            raise ValueError(
                f"Device {device_id} not found"
            )

        # Get previous valid location.
        raw_prev = await db.locations.find_one(
            {
                "device_id": device_id,
                "is_valid": True,
            },
            sort=[("timestamp", -1)],
        )

        previous_point = (
            LocationPoint.from_mongo(raw_prev)
            if raw_prev
            else None
        )

        # Validate new location.
        is_valid, notes = (
            LocationService.validate_location(
                latitude,
                longitude,
                previous_point,
                accuracy,
            )
        )

        location = LocationPoint(
            device_id=device_id,
            latitude=latitude,
            longitude=longitude,
            accuracy=accuracy,
            altitude=altitude,
            speed=speed,
            heading=heading,
            timestamp=timestamp,
            source=source,
            is_valid=is_valid,
            notes=notes,
        )

        await db.locations.insert_one(
            location.to_mongo()
        )

        # Evaluate geofences after every valid update.
        if location.is_valid:

            owner_id = device_raw.get(
                "user_id"
            )

            if owner_id:

                geofence_cursor = db.geofences.find(
                    {
                        "owner_id": owner_id,
                        "is_active": True,
                    }
                )

                geofences = (
                    await geofence_cursor.to_list(
                        length=500
                    )
                )

                for raw_geofence in geofences:

                    center_lat = raw_geofence.get(
                        "center_lat"
                    )

                    center_lng = raw_geofence.get(
                        "center_lng"
                    )

                    radius = raw_geofence.get(
                        "radius_meters",
                        0,
                    )

                    if (
                        center_lat is None
                        or center_lng is None
                    ):
                        continue

                    current_distance = (
                        LocationService._calculate_distance(
                            float(center_lat),
                            float(center_lng),
                            location.latitude,
                            location.longitude,
                        )
                    )

                    inside = (
                        current_distance <= float(radius)
                    )

                    was_inside = False

                    if previous_point:

                        previous_distance = (
                            LocationService._calculate_distance(
                                float(center_lat),
                                float(center_lng),
                                previous_point.latitude,
                                previous_point.longitude,
                            )
                        )

                        was_inside = (
                            previous_distance
                            <= float(radius)
                        )

                    state_changed = (
                        inside != was_inside
                    )

                    alert_enabled = (
                        (
                            inside
                            and raw_geofence.get(
                                "alert_on_enter",
                                True,
                            )
                        )
                        or (
                            not inside
                            and raw_geofence.get(
                                "alert_on_exit",
                                True,
                            )
                        )
                    )

                    if (
                        state_changed
                        and alert_enabled
                    ):
                        from app.models import (
                            GeofenceEvent,
                        )

                        event = GeofenceEvent(
                            geofence_id=str(
                                raw_geofence["_id"]
                            ),
                            device_id=device_id,
                            event_type=(
                                "enter"
                                if inside
                                else "exit"
                            ),
                            latitude=location.latitude,
                            longitude=location.longitude,
                        )

                        await db.geofence_events.insert_one(
                            event.to_mongo()
                        )

                        logger.info(
                            "Geofence %s event for "
                            "device %s: %s",
                            raw_geofence["_id"],
                            device_id,
                            event.event_type,
                        )

        # Update device last-seen timestamp.
        await db.devices.update_one(
            {"_id": device_id},
            {
                "$set": {
                    "last_seen": datetime.now(
                        timezone.utc
                    )
                }
            },
        )

        logger.info(
            "Location created: Device %s, "
            "Valid: %s, Source: %s",
            device_id,
            is_valid,
            source,
        )

        return location

    @staticmethod
    async def get_current_location(
        db: AsyncIOMotorDatabase,
        device_id: str,
    ) -> Optional[LocationPoint]:
        """Get the most recent location."""

        raw = await db.locations.find_one(
            {"device_id": device_id},
            sort=[("timestamp", -1)],
        )

        if not raw:
            return None

        return LocationPoint.from_mongo(raw)

    @staticmethod
    async def get_location_history(
        db: AsyncIOMotorDatabase,
        device_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 1000,
    ) -> List[LocationPoint]:
        """Get valid location history."""

        if end_date is None:
            end_date = datetime.now(
                timezone.utc
            )

        if start_date is None:
            start_date = (
                end_date
                - timedelta(
                    days=settings.LOCATION_RETENTION_DAYS
                )
            )

        cursor = (
            db.locations.find(
                {
                    "device_id": device_id,
                    "timestamp": {
                        "$gte": start_date,
                        "$lte": end_date,
                    },
                    "is_valid": True,
                }
            )
            .sort("timestamp", 1)
            .limit(limit)
        )

        locations: List[LocationPoint] = []

        async for document in cursor:
            location = LocationPoint.from_mongo(
                document
            )

            if location is not None:
                locations.append(location)

        return locations

    @staticmethod
    async def cleanup_old_locations(
        db: AsyncIOMotorDatabase,
        retention_days: Optional[int] = None,
    ) -> int:
        """Delete locations older than retention period."""

        if retention_days is None:
            retention_days = (
                settings.LOCATION_RETENTION_DAYS
            )

        cutoff_date = (
            datetime.now(timezone.utc)
            - timedelta(
                days=retention_days
            )
        )

        result = await db.locations.delete_many(
            {
                "created_at": {
                    "$lt": cutoff_date
                }
            }
        )

        logger.info(
            "Cleaned up %s old location points",
            result.deleted_count,
        )

        return result.deleted_count

    @staticmethod
    async def get_location_with_permission_check(
        db: AsyncIOMotorDatabase,
        device_id: str,
        requester_id: str,
    ) -> Optional[LocationPoint]:
        """Get current location after permission check."""

        has_permission = (
            await PermissionService.check_permission(
                db,
                device_id,
                requester_id,
                permission_type="current",
            )
        )

        if not has_permission:
            logger.warning(
                "Unauthorized location access: "
                "User %s -> Device %s",
                requester_id,
                device_id,
            )

            return None

        return await LocationService.get_current_location(
            db,
            device_id,
        )

    @staticmethod
    async def get_location_history_with_permission_check(
        db: AsyncIOMotorDatabase,
        device_id: str,
        requester_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 1000,
    ) -> Optional[List[LocationPoint]]:
        """Get location history after permission check."""

        has_permission = (
            await PermissionService.check_permission(
                db,
                device_id,
                requester_id,
                permission_type="history",
            )
        )

        if not has_permission:
            logger.warning(
                "Unauthorized history access: "
                "User %s -> Device %s",
                requester_id,
                device_id,
            )

            return None

        return await LocationService.get_location_history(
            db,
            device_id,
            start_date,
            end_date,
            limit,
        )