"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { apiClient } from "@/lib/api";
import type { Geofence } from "@/types";

export default function GeofencesPage() {
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radius, setRadius] = useState("250");
  const [alertOnEnter, setAlertOnEnter] = useState(true);
  const [alertOnExit, setAlertOnExit] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadGeofences() {
    try {
      setGeofences(await apiClient.listGeofences());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load geofences."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGeofences();
  }, []);

  async function createGeofence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const created = await apiClient.createGeofence({
        name: name.trim(),
        description: description.trim() || undefined,
        center_lat: Number(latitude),
        center_lng: Number(longitude),
        radius_meters: Number(radius),
        alert_on_enter: alertOnEnter,
        alert_on_exit: alertOnExit,
      });
      setGeofences((current) => [created, ...current]);
      setName("");
      setDescription("");
      setLatitude("");
      setLongitude("");
      setRadius("250");
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Unable to create geofence."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteGeofence(geofence: Geofence) {
    setError(null);
    try {
      await apiClient.deleteGeofence(String(geofence.id));
      setGeofences((current) =>
        current.filter((item) => item.id !== geofence.id)
      );
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete geofence."
      );
    }
  }

  return (
    <DashboardSection
      eyebrow="Workspace / Geofences"
      title="Geofences"
      description="Create geographic boundaries and configure entry or exit alerts."
    >
      {error && (
        <p role="alert" className="rounded-md border border-red-700/50 bg-red-900/20 p-3 text-sm text-red-300">
          {error}
        </p>
      )}
      <form
        onSubmit={createGeofence}
        className="grid gap-3 rounded-lg border border-border bg-panel p-4 md:grid-cols-2 xl:grid-cols-3"
      >
        <label className="flex flex-col gap-1.5 text-sm text-text-secondary">
          Name
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-md border border-border bg-bg px-3 py-2 text-text-primary"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-text-secondary">
          Description
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="rounded-md border border-border bg-bg px-3 py-2 text-text-primary"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-text-secondary">
          Center latitude
          <input
            required
            type="number"
            min="-90"
            max="90"
            step="any"
            value={latitude}
            onChange={(event) => setLatitude(event.target.value)}
            className="rounded-md border border-border bg-bg px-3 py-2 text-text-primary"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-text-secondary">
          Center longitude
          <input
            required
            type="number"
            min="-180"
            max="180"
            step="any"
            value={longitude}
            onChange={(event) => setLongitude(event.target.value)}
            className="rounded-md border border-border bg-bg px-3 py-2 text-text-primary"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-text-secondary">
          Radius (meters)
          <input
            required
            type="number"
            min="1"
            step="any"
            value={radius}
            onChange={(event) => setRadius(event.target.value)}
            className="rounded-md border border-border bg-bg px-3 py-2 text-text-primary"
          />
        </label>
        <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={alertOnEnter}
              onChange={(event) => setAlertOnEnter(event.target.checked)}
            />
            Alert on entry
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={alertOnExit}
              onChange={(event) => setAlertOnExit(event.target.checked)}
            />
            Alert on exit
          </label>
        </div>
        <Button type="submit" loading={saving} className="md:col-span-2 xl:col-span-3 xl:justify-self-start">
          Create geofence
        </Button>
      </form>

      <section className="overflow-hidden rounded-lg border border-border bg-panel">
        <div className="border-b border-border px-4 py-3 text-sm font-medium text-text-primary">
          Active boundaries
        </div>
        {loading ? (
          <p className="p-4 text-sm text-text-secondary">Loading geofences...</p>
        ) : geofences.length === 0 ? (
          <p className="p-4 text-sm text-text-secondary">
            No active geofences have been created.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {geofences.map((geofence) => (
              <li
                key={geofence.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div>
                  <p className="font-medium text-text-primary">{geofence.name}</p>
                  <p className="mt-1 text-xs text-text-secondary">
                    {geofence.center_lat.toFixed(5)}, {geofence.center_lng.toFixed(5)}
                    {" · "}
                    {geofence.radius_meters} m radius
                    {" · "}
                    {geofence.alert_on_enter ? "entry" : ""}
                    {geofence.alert_on_enter && geofence.alert_on_exit ? " / " : ""}
                    {geofence.alert_on_exit ? "exit" : ""}
                  </p>
                  {geofence.description && (
                    <p className="mt-1 text-xs text-text-secondary">
                      {geofence.description}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => deleteGeofence(geofence)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </DashboardSection>
  );
}
