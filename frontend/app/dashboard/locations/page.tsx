"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { apiClient } from "@/lib/api";
import type { Device, LocationPoint } from "@/types";

interface DeviceLocation {
  device: Device;
  location: LocationPoint;
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<DeviceLocation[]>([]);
  const [unavailableCount, setUnavailableCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLocations() {
      try {
        const devices = await apiClient.listDevices();
        const results = await Promise.allSettled(
          devices.map((device) =>
            apiClient.getCurrentLocation(String(device.id))
          )
        );
        setUnavailableCount(
          results.filter((result) => result.status === "rejected").length
        );
        setLocations(
          results.flatMap((result, index) =>
            result.status === "fulfilled"
              ? [{ device: devices[index], location: result.value }]
              : []
          )
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load locations."
        );
      } finally {
        setLoading(false);
      }
    }

    loadLocations();
  }, []);

  return (
    <DashboardSection
      eyebrow="Workspace / Locations"
      title="Current locations"
      description="Latest location report available for each device."
    >
      {error && (
        <p role="alert" className="rounded-md border border-red-700/50 bg-red-900/20 p-3 text-sm text-red-300">
          {error}
        </p>
      )}
      {!loading && !error && unavailableCount > 0 && (
        <p className="rounded-md border border-border bg-panel p-3 text-sm text-text-secondary">
          Current locations could not be retrieved for {unavailableCount}{" "}
          device{unavailableCount === 1 ? "" : "s"}. They may not have reported
          a location yet, or your account may not have location access.
        </p>
      )}
      <section className="overflow-hidden rounded-lg border border-border bg-panel">
        {loading ? (
          <p className="p-4 text-sm text-text-secondary">Loading locations...</p>
        ) : locations.length === 0 ? (
          <div className="p-5">
            <p className="text-sm text-text-secondary">
              No current locations are available. Devices appear here after
              reporting a location.
            </p>
            <Link
              href="/dashboard/devices"
              className="mt-3 inline-block text-sm text-live hover:underline"
            >
              Manage devices
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wider text-text-secondary">
                <tr>
                  <th className="px-4 py-3 font-medium">Device</th>
                  <th className="px-4 py-3 font-medium">Coordinates</th>
                  <th className="px-4 py-3 font-medium">Accuracy</th>
                  <th className="px-4 py-3 font-medium">Reported</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {locations.map(({ device, location }) => (
                  <tr key={device.id}>
                    <td className="px-4 py-3 text-text-primary">{device.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-text-secondary">
                      {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {location.accuracy == null
                        ? "—"
                        : `${location.accuracy} m`}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {new Date(location.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {location.source || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </DashboardSection>
  );
}
