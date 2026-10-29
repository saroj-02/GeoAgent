"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { apiClient } from "@/lib/api";
import type { Device, LocationPoint } from "@/types";

const DeviceMap = dynamic(
  () => import("@/components/dashboard/DeviceMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[560px] items-center justify-center rounded-xl border border-border bg-panel text-sm text-text-secondary">
        Loading map...
      </div>
    ),
  }
);

interface DeviceMarker {
  latitude: number;
  longitude: number;
  label: string;
  details: string;
}

export default function DeviceMapPage() {
  const [markers, setMarkers] = useState<DeviceMarker[]>([]);
  const [unavailableCount, setUnavailableCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDeviceLocations() {
      try {
        const devices = await apiClient.listDevices();
        const locationResults = await Promise.allSettled(
          devices.map((device) =>
            apiClient.getCurrentLocation(String(device.id))
          )
        );
        setUnavailableCount(
          locationResults.filter((result) => result.status === "rejected").length
        );

        const availableMarkers = locationResults.flatMap(
          (result, index): DeviceMarker[] => {
            if (result.status !== "fulfilled") {
              return [];
            }

            const location: LocationPoint = result.value;
            const device: Device = devices[index];

            return [
              {
                latitude: location.latitude,
                longitude: location.longitude,
                label: device.name,
                details: `Updated ${new Date(
                  location.timestamp
                ).toLocaleString()}`,
              },
            ];
          }
        );

        setMarkers(availableMarkers);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load device locations."
        );
      } finally {
        setLoading(false);
      }
    }

    loadDeviceLocations();
  }, []);

  return (
    <DashboardSection
      eyebrow="Workspace / Map"
      title="Device map"
      description="View the latest reported positions for your devices."
    >
      {error && (
        <p role="alert" className="rounded-md border border-red-700/50 bg-red-900/20 p-3 text-sm text-red-300">
          {error}
        </p>
      )}
      {!loading && !error && markers.length === 0 && (
        <p className="rounded-md border border-border bg-panel p-3 text-sm text-text-secondary">
          No current device locations are available yet.
        </p>
      )}
      {!loading && !error && unavailableCount > 0 && markers.length > 0 && (
        <p className="rounded-md border border-border bg-panel p-3 text-sm text-text-secondary">
          Current locations could not be retrieved for {unavailableCount}{" "}
          device{unavailableCount === 1 ? "" : "s"}. They may not have reported
          a location yet, or your account may not have location access.
        </p>
      )}
      <DeviceMap
        markers={markers}
        heightClass="h-[560px]"
      />
    </DashboardSection>
  );
}
