"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { apiClient } from "@/lib/api";
import type { User } from "@/types";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const profile = await apiClient.getCurrentUser();
        setUser(profile);
        setFullName(profile.full_name ?? "");
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load your profile."
        );
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await apiClient.updateCurrentUser({
        full_name: fullName.trim(),
      });
      setUser(updated);
      setFullName(updated.full_name ?? "");
      setMessage("Profile updated.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to update your profile."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardSection
      eyebrow="Account / Profile"
      title="Profile"
      description="View your account details and update your display name."
    >
      {error && (
        <p role="alert" className="rounded-md border border-red-700/50 bg-red-900/20 p-3 text-sm text-red-300">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="rounded-md border border-green-700/50 bg-green-900/20 p-3 text-sm text-green-300">
          {message}
        </p>
      )}
      <form
        onSubmit={saveProfile}
        className="max-w-2xl space-y-4 rounded-lg border border-border bg-panel p-5"
      >
        {loading ? (
          <p className="text-sm text-text-secondary">Loading profile...</p>
        ) : (
          <>
            <label className="flex flex-col gap-1.5 text-sm text-text-secondary">
              Display name
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                maxLength={255}
                className="rounded-md border border-border bg-bg px-3 py-2 text-text-primary"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wider text-text-secondary">
                  Email
                </p>
                <p className="mt-1 text-sm text-text-primary">{user?.email}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-text-secondary">
                  Username
                </p>
                <p className="mt-1 text-sm text-text-primary">{user?.username}</p>
              </div>
            </div>
            <Button type="submit" loading={saving}>
              Save profile
            </Button>
          </>
        )}
      </form>
    </DashboardSection>
  );
}
