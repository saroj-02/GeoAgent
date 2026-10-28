"use client";

import { useEffect, useState } from "react";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { apiClient } from "@/lib/api";
import type { Device, LocationPoint } from "@/types";

interface ActivityEntry {
  deviceName: string;
  location: LocationPoint;
}

export default function ActivityPage() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadActivity() {
      try {
        const devices = await apiClient.listDevices();
        const results = await Promise.allSettled(
          devices.map((device) =>
            apiClient.getLocationHistory(String(device.id), undefined, undefined, 100)
          )
        );
        const failedCount = results.filter(
          (result) => result.status === "rejected"
        ).length;
        const activity = results.flatMap((result, index) => {
          if (result.status !== "fulfilled") {
            return [];
          }
          const device: Device = devices[index];
          return result.value.points.map((location) => ({
            deviceName: device.name,
            location,
          }));
        });
        activity.sort(
          (a, b) =>
            new Date(b.location.timestamp).getTime() -
            new Date(a.location.timestamp).getTime()
        );
        setEntries(activity);
        if (failedCount > 0) {
          setError(
            `Location history could not be loaded for ${failedCount} device${failedCount === 1 ? "" : "s"}.`
          );
        }
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load device activity."
        );
      } finally {
        setLoading(false);
      }
    }

    loadActivity();
  }, []);

  return (
    <DashboardSection
      eyebrow="Workspace / Activity"
      title="Location activity"
      description="Recent location reports from your devices."
    >
      {error && (
        <p role="alert" className="rounded-md border border-amber-700/50 bg-amber-900/20 p-3 text-sm text-amber-200">
          {error}
        </p>
      )}
      <section className="overflow-hidden rounded-lg border border-border bg-panel">
        {loading ? (
          <p className="p-4 text-sm text-text-secondary">Loading activity...</p>
        ) : entries.length === 0 ? (
          <p className="p-4 text-sm text-text-secondary">
            No location activity is available for these devices.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wider text-text-secondary">
                <tr>
                  <th className="px-4 py-3 font-medium">Reported</th>
                  <th className="px-4 py-3 font-medium">Device</th>
                  <th className="px-4 py-3 font-medium">Coordinates</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map(({ deviceName, location }) => (
                  <tr key={`${location.id}:${location.timestamp}`}>
                    <td className="px-4 py-3 text-text-secondary">
                      {new Date(location.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-text-primary">{deviceName}</td>
                    <td className="px-4 py-3 font-mono text-xs text-text-secondary">
                      {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
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
