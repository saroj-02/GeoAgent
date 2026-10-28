"use client";

import { useEffect, useState } from "react";

import { TopBar } from "@/components/dashboard/TopBar";
import { DeviceSidebar } from "@/components/dashboard/DeviceSidebar";
import type { Device } from "@/types";
import { MapPlaceholder } from "@/components/dashboard/MapPlaceholder";
import { StatusPanel } from "@/components/dashboard/StatusPanel";
import { TelemetryBar } from "@/components/dashboard/TelemetryBar";
import { AIPanel } from "@/components/dashboard/AIPanel";
import { apiClient } from "@/lib/api";

export default function DashboardPage() {
  const [selectedDevice, setSelectedDevice] =
    useState<Device | undefined>(undefined);

  const [deviceCount, setDeviceCount] =
    useState(0);

  /*
   * Load the real device count.
   */
  useEffect(() => {
    loadDeviceCount();
  }, []);

  async function loadDeviceCount() {
    try {
      const devices =
        await apiClient.listDevices();

      setDeviceCount(
        devices?.length ?? 0
      );

      /*
       * If there is no selected device yet,
       * automatically select the first real device.
       */
      if (
        !selectedDevice &&
        devices &&
        devices.length > 0
      ) {
        const firstDevice = devices[0];

        setSelectedDevice(firstDevice);
      }
    } catch {
      setDeviceCount(0);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <TopBar />

      <main className="flex flex-1 flex-col gap-5 p-4 lg:p-6">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-text-secondary">
              Overview
            </div>

            <h1 className="mt-1 text-2xl font-semibold text-text-primary">
              Dashboard
            </h1>

            <p className="mt-1 text-sm text-text-secondary">
              Geospatial intelligence and device monitoring.
            </p>
          </div>

          <div className="font-mono text-[10px] uppercase tracking-wider text-text-secondary">
            GEOAGENT CONSOLE
          </div>
        </div>

        {/* =====================================================
            QUICK STATS
        ====================================================== */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <DashboardCard
            icon="📱"
            label="Devices"
            value={String(deviceCount)}
            description="Registered devices"
          />

          <DashboardCard
            icon="📍"
            label="Locations"
            value={
              selectedDevice
                ? "Connected"
                : "—"
            }
            description="Selected device"
          />

          <DashboardCard
            icon="🛰️"
            label="Satellite"
            value="Ready"
            description="Satellite intelligence"
          />

          <DashboardCard
            icon="🛡️"
            label="Geofences"
            value="—"
            description="Active boundaries"
          />
        </div>

        {/* =====================================================
            MAIN CONSOLE
        ====================================================== */}

        <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[240px_1fr_280px]">

          {/* DEVICE SIDEBAR */}

          <div className="order-2 lg:order-1">
            <DeviceSidebar
              selectedDeviceId={
                selectedDevice?.id
              }
              onSelectDevice={
                setSelectedDevice
              }
            />
          </div>

          {/* MAP */}

          <div className="order-1 min-h-[420px] lg:order-2">
            <MapPlaceholder
              deviceName={
                selectedDevice?.name
              }
              deviceActive={
                selectedDevice?.is_active
              }
            />
          </div>

          {/* STATUS */}

          <div className="order-3">
            <StatusPanel
              deviceName={
                selectedDevice?.name
              }
              deviceActive={
                selectedDevice?.is_active
              }
            />
          </div>
        </div>

        {/* =====================================================
            TELEMETRY
        ====================================================== */}

        <TelemetryBar />

        {/* =====================================================
            AI GEO ANALYST
        ====================================================== */}

        <AIPanel
          selectedDeviceId={
            selectedDevice?.id
          }
        />

      </main>
    </div>
  );
}

function DashboardCard({
  icon,
  label,
  value,
  description,
}: {
  icon: string;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-panel p-4">
      <div className="flex items-start justify-between">

        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-text-secondary">
            {label}
          </div>

          <div className="mt-2 text-2xl font-semibold text-text-primary">
            {value}
          </div>
        </div>

        <span className="text-xl">
          {icon}
        </span>

      </div>

      <p className="mt-2 text-xs text-text-secondary">
        {description}
      </p>
    </div>
  );
}