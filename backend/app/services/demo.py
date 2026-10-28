"""
GeoAgent demo/simulation service.

Provides a deterministic simulated device route for development
and demonstrations without requiring a physical GPS device.
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import get_settings
from app.services.location import LocationService


logger = logging.getLogger(__name__)

settings = get_settings()


class DemoService:
    """Generate simulated location updates for demo devices."""

    _tasks: Dict[str, asyncio.Task] = {}

    @staticmethod
    def get_route() -> List[dict]:
        """Return configured demo route points."""

        return list(
            settings.DEMO_ROUTE_POINTS
        )

    @staticmethod
    async def create_demo_device(
        db: AsyncIOMotorDatabase,
        user_id: str,
    ):
        """Create configured demo device if it doesn't exist."""

        from app.models import Device

        device_id = settings.DEMO_DEVICE_ID

        existing = await db.devices.find_one(
            {"_id": device_id}
        )

        if existing:
            return Device.from_mongo(
                existing
            )

        device = Device(
            id=device_id,
            user_id=user_id,
            name="GeoAgent Demo Device",
            device_type="simulation",
            unique_identifier=device_id,
            is_active=True,
        )

        await db.devices.insert_one(
            device.to_mongo()
        )

        logger.info(
            "Created demo device %s for user %s",
            device_id,
            user_id,
        )

        return device

    @staticmethod
    async def generate_location(
        db: AsyncIOMotorDatabase,
        device_id: str,
        route_index: int = 0,
    ):
        """Generate one location update from demo route."""

        route = DemoService.get_route()

        if not route:
            raise ValueError(
                "DEMO_ROUTE_POINTS is empty"
            )

        point = route[
            route_index % len(route)
        ]

        latitude = float(
            point.get(
                "latitude",
                point.get("lat"),
            )
        )

        longitude = float(
            point.get(
                "longitude",
                point.get("lng"),
            )
        )

        accuracy = float(
            point.get(
                "accuracy",
                3.0,
            )
        )

        altitude = point.get(
            "altitude"
        )

        speed = point.get(
            "speed"
        )

        heading = point.get(
            "heading"
        )

        location = (
            await LocationService.create_location(
                db=db,
                device_id=device_id,
                latitude=latitude,
                longitude=longitude,
                accuracy=accuracy,
                altitude=altitude,
                speed=speed,
                heading=heading,
                timestamp=datetime.now(
                    timezone.utc
                ),
                source="demo",
            )
        )

        return location

    @staticmethod
    async def run_simulation(
        db: AsyncIOMotorDatabase,
        device_id: str,
        interval_seconds: Optional[int] = None,
    ) -> None:
        """
        Continuously generate simulated location updates.

        The task stops automatically when cancelled.
        """

        if interval_seconds is None:
            interval_seconds = (
                settings.LOCATION_UPDATE_INTERVAL_SECONDS
            )

        route = DemoService.get_route()

        if not route:
            logger.warning(
                "Demo simulation cannot start: "
                "DEMO_ROUTE_POINTS is empty"
            )
            return

        route_index = 0

        logger.info(
            "Starting demo simulation for device %s",
            device_id,
        )

        try:

            while True:

                try:

                    await DemoService.generate_location(
                        db=db,
                        device_id=device_id,
                        route_index=route_index,
                    )

                    route_index = (
                        route_index + 1
                    ) % len(route)

                except Exception:
                    logger.exception(
                        "Failed to generate demo "
                        "location for device %s",
                        device_id,
                    )

                await asyncio.sleep(
                    max(
                        1,
                        interval_seconds,
                    )
                )

        except asyncio.CancelledError:

            logger.info(
                "Demo simulation stopped for device %s",
                device_id,
            )

            raise

    @classmethod
    async def start(
        cls,
        db: AsyncIOMotorDatabase,
        device_id: str,
        interval_seconds: Optional[int] = None,
    ) -> bool:
        """Start simulation for a device."""

        existing_task = cls._tasks.get(
            device_id
        )

        if (
            existing_task
            and not existing_task.done()
        ):
            return False

        task = asyncio.create_task(
            cls.run_simulation(
                db=db,
                device_id=device_id,
                interval_seconds=interval_seconds,
            )
        )

        cls._tasks[device_id] = task

        return True

    @classmethod
    async def stop(
        cls,
        device_id: str,
    ) -> bool:
        """Stop simulation for a device."""

        task = cls._tasks.pop(
            device_id,
            None,
        )

        if not task:
            return False

        if not task.done():

            task.cancel()

            try:
                await task

            except asyncio.CancelledError:
                pass

        return True

    @classmethod
    def is_running(
        cls,
        device_id: str,
    ) -> bool:
        """Return whether simulation is running."""

        task = cls._tasks.get(
            device_id
        )

        return bool(
            task
            and not task.done()
        )

    @classmethod
    async def stop_all(
        cls,
    ) -> None:
        """Stop all running demo simulations."""

        device_ids = list(
            cls._tasks.keys()
        )

        for device_id in device_ids:
            await cls.stop(
                device_id
            )

        logger.info(
            "All demo simulations stopped"
        )