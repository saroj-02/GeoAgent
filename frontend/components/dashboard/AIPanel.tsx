"use client";

import { FormEvent, useEffect, useState } from "react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import {
  apiClient,
  DeviceContext,
} from "@/lib/api"

interface AIPanelProps {
  selectedDeviceId?: string;
}


export function AIPanel({
  selectedDeviceId,
}: AIPanelProps) {
  const [query, setQuery] =
    useState("");

  const [response, setResponse] =
    useState("");

  const [mode, setMode] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [contextLoading, setContextLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [context, setContext] =
    useState<DeviceContext>({});

  /*
   * Load context whenever the selected
   * device changes.
   */
  useEffect(() => {
    loadContext();
  }, [selectedDeviceId]);

  async function loadContext() {
    try {
      setContextLoading(true);

      const deviceContext =
        await apiClient.getSelectedDeviceContext(
          selectedDeviceId
        );

      setContext(deviceContext);
    } catch {
      setContext({});
    } finally {
      setContextLoading(false);
    }
  }

  async function handleSubmit(
    e: FormEvent
  ) {
    e.preventDefault();

    const trimmedQuery =
      query.trim();

    if (
      !trimmedQuery ||
      loading
    ) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      /*
       * Refresh device context before
       * sending the question.
       *
       * This ensures the AI receives
       * the latest available location.
       */
      const latestContext =
        await apiClient.getSelectedDeviceContext(
          selectedDeviceId
        );

      setContext(latestContext);

      const result =
        await apiClient.queryAgent(
          trimmedQuery,
          latestContext
        );

      setResponse(result.response);
      setMode(result.mode);
      setQuery("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to contact GeoAgent."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Panel className="flex flex-col gap-4 p-4">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="flex items-center justify-between gap-3">

        <div>
          <h2 className="text-xs font-medium uppercase tracking-wider text-text-secondary">
            AI Geo Analyst
          </h2>

          <p className="mt-1 text-xs text-text-secondary">
            Ask GeoAgent about your devices,
            locations and geographic data.
          </p>
        </div>

        {mode && (
          <span className="rounded-full border border-border px-2.5 py-1 text-[10px] uppercase tracking-wider text-text-secondary">
            {mode}
          </span>
        )}

      </div>

      {/* =====================================================
          SELECTED DEVICE CONTEXT
      ====================================================== */}

      <div className="rounded-lg border border-border bg-bg/40 p-3">

        <div className="flex items-center justify-between">

          <span className="text-[10px] uppercase tracking-wider text-text-secondary">
            AI Context
          </span>

          {contextLoading && (
            <span className="text-[10px] text-text-secondary">
              Updating…
            </span>
          )}

        </div>

        {context.device_name ? (
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">

            <ContextItem
              label="Device"
              value={
                context.device_name
              }
            />

            <ContextItem
              label="Status"
              value={
                context.device_status ??
                "unknown"
              }
            />

            <ContextItem
              label="Latitude"
              value={
                context.latitude !==
                undefined
                  ? context.latitude.toFixed(
                      6
                    )
                  : "—"
              }
            />

            <ContextItem
              label="Longitude"
              value={
                context.longitude !==
                undefined
                  ? context.longitude.toFixed(
                      6
                    )
                  : "—"
              }
            />

          </div>
        ) : (
          <p className="mt-2 text-xs text-text-secondary">
            No device context available yet.
          </p>
        )}

      </div>

      {/* =====================================================
          RESPONSE
      ====================================================== */}

      {response && (
        <div className="rounded-lg border border-border bg-bg/60 p-4">

          <p className="whitespace-pre-wrap text-sm leading-6 text-text-primary">
            {response}
          </p>

        </div>
      )}

      {/* =====================================================
          ERROR
      ====================================================== */}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* =====================================================
          INPUT
      ====================================================== */}

      <form
        onSubmit={handleSubmit}
        className="flex gap-3"
      >

        <input
          value={query}
          onChange={(e) =>
            setQuery(e.target.value)
          }
          placeholder={
            context.device_name
              ? `Ask about ${context.device_name}…`
              : "Ask GeoAgent anything…"
          }
          disabled={loading}
          className="flex-1 rounded-md border border-border bg-bg px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/60 outline-none focus:border-live/60 disabled:opacity-60"
        />

        <Button
          type="submit"
          variant="ghost"
          disabled={
            !query.trim() ||
            loading
          }
        >
          {loading
            ? "Thinking…"
            : "Ask"}
        </Button>

      </form>

    </Panel>
  );
}

function ContextItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">

      <div className="text-[9px] uppercase tracking-wider text-text-secondary">
        {label}
      </div>

      <div className="mt-0.5 truncate text-xs text-text-primary">
        {value}
      </div>

    </div>
  );
}