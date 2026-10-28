"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { apiClient } from "@/lib/api";
import type { Device, LocationPermission, PermissionList } from "@/types";

export default function SharingPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [permissions, setPermissions] = useState<PermissionList>({
    granted_by_me: [],
    granted_to_me: [],
  });
  const [deviceId, setDeviceId] = useState("");
  const [email, setEmail] = useState("");
  const [canViewCurrent, setCanViewCurrent] = useState(true);
  const [canViewHistory, setCanViewHistory] = useState(false);
  const [canViewTrail, setCanViewTrail] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadSharingData() {
    try {
      const [deviceList, permissionList] = await Promise.all([
        apiClient.listDevices(),
        apiClient.listPermissions(),
      ]);
      setDevices(deviceList);
      setPermissions(permissionList);
      setDeviceId((current) => current || String(deviceList[0]?.id ?? ""));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load sharing permissions."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSharingData();
  }, []);

  async function grantPermission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiClient.grantPermission({
        device_id: deviceId,
        granted_to_email: email.trim(),
        can_view_current: canViewCurrent,
        can_view_history: canViewHistory,
        can_view_trail: canViewTrail,
      });
      setEmail("");
      await loadSharingData();
    } catch (grantError) {
      setError(
        grantError instanceof Error
          ? grantError.message
          : "Unable to grant location access."
      );
    } finally {
      setSaving(false);
    }
  }

  async function revokePermission(permission: LocationPermission) {
    setError(null);
    try {
      await apiClient.revokePermission(String(permission.id));
      setPermissions((current) => ({
        ...current,
        granted_by_me: current.granted_by_me.filter(
          (item) => item.id !== permission.id
        ),
      }));
    } catch (revokeError) {
      setError(
        revokeError instanceof Error
          ? revokeError.message
          : "Unable to revoke this permission."
      );
    }
  }

  return (
    <DashboardSection
      eyebrow="Account / Sharing"
      title="Location sharing"
      description="Grant and revoke access to device location data."
    >
      {error && (
        <p role="alert" className="rounded-md border border-red-700/50 bg-red-900/20 p-3 text-sm text-red-300">
          {error}
        </p>
      )}
      <form
        onSubmit={grantPermission}
        className="grid gap-3 rounded-lg border border-border bg-panel p-4 md:grid-cols-[1fr_1fr_auto]"
      >
        <label className="flex flex-col gap-1.5 text-sm text-text-secondary">
          Device
          <select
            required
            value={deviceId}
            onChange={(event) => setDeviceId(event.target.value)}
            className="rounded-md border border-border bg-bg px-3 py-2 text-text-primary"
          >
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-text-secondary">
          Share with (account email)
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-md border border-border bg-bg px-3 py-2 text-text-primary"
          />
        </label>
        <Button
          type="submit"
          loading={saving}
          disabled={devices.length === 0}
          className="self-end"
        >
          Grant access
        </Button>
        <div className="flex flex-wrap gap-4 text-sm text-text-secondary md:col-span-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={canViewCurrent}
              onChange={(event) => setCanViewCurrent(event.target.checked)}
            />
            Current location
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={canViewHistory}
              onChange={(event) => setCanViewHistory(event.target.checked)}
            />
            Location history
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={canViewTrail}
              onChange={(event) => setCanViewTrail(event.target.checked)}
            />
            Location trail
          </label>
        </div>
      </form>

      <section className="overflow-hidden rounded-lg border border-border bg-panel">
        <div className="border-b border-border px-4 py-3 text-sm font-medium text-text-primary">
          Access granted by you
        </div>
        {loading ? (
          <p className="p-4 text-sm text-text-secondary">Loading permissions...</p>
        ) : permissions.granted_by_me.length === 0 ? (
          <p className="p-4 text-sm text-text-secondary">
            You have not shared device locations with anyone.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {permissions.granted_by_me.map((permission) => (
              <li
                key={permission.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div>
                  <p className="font-medium text-text-primary">
                    Device {permission.device_id}
                  </p>
                  <p className="mt-1 text-xs text-text-secondary">
                    Shared with account {permission.granted_to_id}
                    {" · "}
                    {permission.permission_level}
                    {" · "}
                    {permission.status}
                  </p>
                </div>
                {permission.status === "active" && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => revokePermission(permission)}
                  >
                    Revoke
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-panel">
        <div className="border-b border-border px-4 py-3 text-sm font-medium text-text-primary">
          Access shared with you
        </div>
        {permissions.granted_to_me.length === 0 ? (
          <p className="p-4 text-sm text-text-secondary">
            No location permissions have been shared with you.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {permissions.granted_to_me.map((permission) => (
              <li key={permission.id} className="p-4 text-sm text-text-secondary">
                Device {permission.device_id} · {permission.permission_level} ·{" "}
                {permission.status}
              </li>
            ))}
          </ul>
        )}
      </section>
    </DashboardSection>
  );
}
