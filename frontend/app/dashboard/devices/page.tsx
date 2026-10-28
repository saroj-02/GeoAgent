"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { apiClient } from "@/lib/api";
import type { Device } from "@/types";

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [name, setName] = useState("");
  const [deviceType, setDeviceType] = useState("mobile");
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadDevices() {
    setError(null);
    try {
      setDevices(await apiClient.listDevices());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load devices."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDevices();
  }, []);

  async function createDevice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const created = await apiClient.createDevice({
        name: name.trim(),
        device_type: deviceType,
        unique_identifier: identifier.trim(),
      });
      setDevices((current) => [created, ...current]);
      setName("");
      setIdentifier("");
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Unable to create device."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleDevice(device: Device) {
    setError(null);
    try {
      const updated = await apiClient.updateDevice(
        String(device.id),
        { is_active: !device.is_active }
      );
      setDevices((current) =>
        current.map((item) =>
          item.id === updated.id ? updated : item
        )
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update device."
      );
    }
  }

  async function removeDevice(device: Device) {
    setError(null);
    try {
      await apiClient.deleteDevice(String(device.id));
      setDevices((current) =>
        current.filter((item) => item.id !== device.id)
      );
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete device."
      );
    }
  }

  return (
    <DashboardSection
      eyebrow="Workspace / Devices"
      title="Devices"
      description="Register and manage the devices connected to your account."
    >
      {error && (
        <p role="alert" className="rounded-md border border-red-700/50 bg-red-900/20 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <form
        onSubmit={createDevice}
        className="grid gap-3 rounded-lg border border-border bg-panel p-4 md:grid-cols-[1fr_150px_1fr_auto]"
      >
        <label className="flex flex-col gap-1.5 text-sm text-text-secondary">
          Device name
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-md border border-border bg-bg px-3 py-2 text-text-primary"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-text-secondary">
          Type
          <select
            value={deviceType}
            onChange={(event) => setDeviceType(event.target.value)}
            className="rounded-md border border-border bg-bg px-3 py-2 text-text-primary"
          >
            <option value="mobile">Mobile</option>
            <option value="tablet">Tablet</option>
            <option value="web">Web</option>
            <option value="iot">IoT</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-text-secondary">
          Unique identifier
          <input
            required
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            className="rounded-md border border-border bg-bg px-3 py-2 text-text-primary"
          />
        </label>
        <Button type="submit" loading={saving} className="self-end">
          Add device
        </Button>
      </form>

      <section className="overflow-hidden rounded-lg border border-border bg-panel">
        <div className="border-b border-border px-4 py-3 text-sm font-medium text-text-primary">
          Registered devices
        </div>
        {loading ? (
          <p className="p-4 text-sm text-text-secondary">Loading devices...</p>
        ) : devices.length === 0 ? (
          <p className="p-4 text-sm text-text-secondary">
            No devices have been registered.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {devices.map((device) => (
              <li
                key={device.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div>
                  <p className="font-medium text-text-primary">{device.name}</p>
                  <p className="mt-1 text-xs text-text-secondary">
                    {device.device_type} · {device.unique_identifier}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-secondary">
                    {device.is_active ? "Active" : "Inactive"}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => toggleDevice(device)}
                  >
                    {device.is_active ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => removeDevice(device)}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </DashboardSection>
  );
}
