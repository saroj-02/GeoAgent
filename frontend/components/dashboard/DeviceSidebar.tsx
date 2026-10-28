"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Panel } from "@/components/ui/Panel";
import { apiClient } from "@/lib/api";
import type { Device } from "@/types";

type DeviceSidebarProps = {
  selectedDeviceId?: string;
  onSelectDevice?: (device: Device) => void;
};

type ConnectionState = "disconnected" | "connecting" | "connected";

export function DeviceSidebar({
  selectedDeviceId,
  onSelectDevice,
}: DeviceSidebarProps) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddForm, setShowAddForm] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  const [deviceType, setDeviceType] = useState("iphone");

  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");

  const [connectionMessage, setConnectionMessage] =
    useState("");

  const watchIdRef = useRef<number | null>(null);
  const connectedDeviceIdRef = useRef<string | null>(null);

  /*
   * ---------------------------------------------------------
   * Load real devices from the backend
   * ---------------------------------------------------------
   */
  const loadDevices = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await apiClient.listDevices();

      setDevices(result);

      /*
       * Automatically select the first real device if
       * nothing has been selected yet.
       */
      if (
        result.length > 0 &&
        !selectedDeviceId &&
        onSelectDevice
      ) {
        onSelectDevice(result[0]);
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to load devices.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }, [selectedDeviceId, onSelectDevice]);

  useEffect(() => {
    loadDevices();

    return () => {
      /*
       * Stop GPS tracking when this component is removed.
       */
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(
          watchIdRef.current
        );

        watchIdRef.current = null;
      }
    };
  }, [loadDevices]);

  /*
   * ---------------------------------------------------------
   * Stop real GPS connection
   * ---------------------------------------------------------
   */
  const disconnectDevice = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(
        watchIdRef.current
      );

      watchIdRef.current = null;
    }

    connectedDeviceIdRef.current = null;
    setConnectionState("disconnected");
    setConnectionMessage("Device disconnected.");
  }, []);

  /*
   * ---------------------------------------------------------
   * Connect physical device GPS
   * ---------------------------------------------------------
   */
  const connectDevice = useCallback(
    (device: Device) => {
      setError("");
      setSuccess("");
      setConnectionMessage("");

      if (
        typeof window === "undefined" ||
        !("geolocation" in navigator)
      ) {
        setConnectionState("disconnected");
        setError(
          "Geolocation is not supported by this browser."
        );
        return;
      }

      /*
       * Stop an existing connection first.
       */
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(
          watchIdRef.current
        );

        watchIdRef.current = null;
      }

      connectedDeviceIdRef.current = String(
        device.id
      );

      setConnectionState("connecting");
      setConnectionMessage(
        "Requesting GPS permission..."
      );

      const watchId =
        navigator.geolocation.watchPosition(
          async (position) => {
            const activeDeviceId =
              connectedDeviceIdRef.current;

            if (!activeDeviceId) {
              return;
            }

            const {
              latitude,
              longitude,
              accuracy,
              altitude,
              speed,
              heading,
            } = position.coords;

            try {
              await apiClient.submitLocation(
                activeDeviceId,
                {
                  latitude,
                  longitude,
                  accuracy,
                  altitude:
                    altitude ?? undefined,
                  speed:
                    speed ?? undefined,
                  heading:
                    heading ?? undefined,
                  timestamp:
                    new Date(
                      position.timestamp
                    ).toISOString(),
                  source: "gps",
                }
              );

              setConnectionState("connected");

              setConnectionMessage(
                `GPS connected • ${latitude.toFixed(
                  6
                )}, ${longitude.toFixed(6)}`
              );
            } catch (err) {
              const message =
                err instanceof Error
                  ? err.message
                  : "Failed to send GPS location.";

              setConnectionState("disconnected");
              setError(message);

              if (
                watchIdRef.current !== null
              ) {
                navigator.geolocation.clearWatch(
                  watchIdRef.current
                );

                watchIdRef.current = null;
              }
            }
          },
          (positionError) => {
            setConnectionState("disconnected");

            switch (positionError.code) {
              case positionError.PERMISSION_DENIED:
                setError(
                  "Location permission was denied. Allow location access for GeoAgent and try again."
                );
                break;

              case positionError.POSITION_UNAVAILABLE:
                setError(
                  "Your device could not determine its current location."
                );
                break;

              case positionError.TIMEOUT:
                setError(
                  "GPS location request timed out. Please try again."
                );
                break;

              default:
                setError(
                  "Unable to access the device location."
                );
            }

            if (
              watchIdRef.current !== null
            ) {
              navigator.geolocation.clearWatch(
                watchIdRef.current
              );

              watchIdRef.current = null;
            }
          },
          {
            enableHighAccuracy: true,
            maximumAge: 5000,
            timeout: 15000,
          }
        );

      watchIdRef.current = watchId;
    },
    []
  );

  /*
   * ---------------------------------------------------------
   * Add real device
   * ---------------------------------------------------------
   */
  const handleAddDevice = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const trimmedName =
      deviceName.trim();

    if (!trimmedName) {
      setError("Please enter a device name.");
      return;
    }

    setAdding(true);
    setError("");
    setSuccess("");

    try {
      /*
       * Browser-generated identifier.
       *
       * This identifies this GeoAgent connection,
       * while the actual GPS comes from the physical
       * device running the browser.
       */
      const uniqueIdentifier =
        `geoagent-web-${crypto.randomUUID()}`;

      const createdDevice =
        await apiClient.createDevice({
          name: trimmedName,
          device_type: deviceType,
          unique_identifier:
            uniqueIdentifier,
        });

      /*
       * Reload from MongoDB so the UI is never
       * dependent on fake/local device data.
       */
      const updatedDevices =
        await apiClient.listDevices();

      setDevices(updatedDevices);

      setDeviceName("");
      setDeviceType("iphone");
      setShowAddForm(false);

      setSuccess(
        `${createdDevice.name} was added successfully.`
      );

      /*
       * Automatically select the newly created device.
       */
      if (onSelectDevice) {
        onSelectDevice(createdDevice);
      }

      /*
       * Start GPS connection immediately.
       *
       * The browser will ask for location permission.
       */
      connectDevice(createdDevice);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to add device.";

      setError(message);
    } finally {
      setAdding(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * Render
   * ---------------------------------------------------------
   */
  return (
    <Panel className="flex h-full flex-col p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wider text-text-secondary">
          Tracked Devices
        </h2>

        <span className="font-mono text-[10px] text-text-secondary">
          {devices.length}
        </span>
      </div>

      {loading && (
        <div className="mt-4 rounded-md border border-border px-3 py-3 text-xs text-text-secondary">
          Loading devices...
        </div>
      )}

      {!loading &&
        devices.length === 0 && (
          <div className="mt-4 rounded-md border border-dashed border-border px-3 py-4 text-xs text-text-secondary">
            No devices connected yet.
            <br />
            Add your first device below.
          </div>
        )}

      {!loading &&
        devices.length > 0 && (
          <ul className="mt-4 flex flex-1 flex-col gap-1 overflow-y-auto">
            {devices.map((device) => {
              const selected =
                String(selectedDeviceId) ===
                String(device.id);

              const isConnected =
                connectedDeviceIdRef.current ===
                  String(device.id) &&
                connectionState ===
                  "connected";

              return (
                <li key={String(device.id)}>
                  <div
                    className={[
                      "rounded-md transition-colors",
                      selected
                        ? "bg-bg"
                        : "hover:bg-bg",
                    ].join(" ")}
                  >
                    <button
                      className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2.5 text-left text-sm"
                      type="button"
                      onClick={() =>
                        onSelectDevice?.(device)
                      }
                    >
                      <span
                        className={[
                          "h-1.5 w-1.5 rounded-full",
                          isConnected
                            ? "bg-success"
                            : device.is_active
                            ? "bg-success"
                            : "bg-text-secondary/50",
                        ].join(" ")}
                        aria-hidden="true"
                      />

                      <span className="flex-1">
                        {device.name}
                      </span>

                      {selected && (
                        <span className="font-mono text-[9px] uppercase tracking-wider text-live">
                          Selected
                        </span>
                      )}
                    </button>

                    {selected && (
                      <div className="px-2.5 pb-2.5">
                        {connectionState ===
                          "connected" &&
                          connectedDeviceIdRef.current ===
                            String(device.id) && (
                            <button
                              type="button"
                              onClick={
                                disconnectDevice
                              }
                              className="w-full rounded-md border border-border px-2 py-1.5 text-[11px] text-text-secondary transition-colors hover:border-text-secondary hover:text-text-primary"
                            >
                              Disconnect GPS
                            </button>
                          )}

                        {connectionState !==
                          "connected" && (
                          <button
                            type="button"
                            onClick={() =>
                              connectDevice(
                                device
                              )
                            }
                            className="w-full rounded-md border border-dashed border-border px-2 py-1.5 text-[11px] text-text-secondary transition-colors hover:border-text-secondary hover:text-text-primary"
                          >
                            Connect this device
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

      {success && (
        <div className="mt-3 rounded-md border border-success/30 bg-success/5 px-3 py-2 text-xs text-success">
          {success}
        </div>
      )}

      {connectionMessage && (
        <div className="mt-2 rounded-md border border-border px-3 py-2 text-[11px] text-text-secondary">
          {connectionMessage}
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      {showAddForm && (
        <form
          onSubmit={handleAddDevice}
          className="mt-3 rounded-md border border-border p-3"
        >
          <div className="text-xs font-medium text-text-primary">
            Add real device
          </div>

          <p className="mt-1 text-[10px] leading-4 text-text-secondary">
            The device will use its browser GPS to send
            real location data to GeoAgent.
          </p>

          <input
            type="text"
            value={deviceName}
            onChange={(event) =>
              setDeviceName(event.target.value)
            }
            placeholder="Device name"
            disabled={adding}
            className="mt-3 w-full rounded-md border border-border bg-bg px-2.5 py-2 text-xs text-text-primary outline-none placeholder:text-text-secondary focus:border-text-secondary"
            autoFocus
          />

          <select
            value={deviceType}
            onChange={(event) =>
              setDeviceType(event.target.value)
            }
            disabled={adding}
            className="mt-2 w-full rounded-md border border-border bg-bg px-2.5 py-2 text-xs text-text-primary outline-none focus:border-text-secondary"
          >
            <option value="iphone">
              iPhone
            </option>
            <option value="android">
              Android
            </option>
            <option value="browser">
              Browser / Computer
            </option>
          </select>

          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={adding}
              className="flex-1 rounded-md bg-text-primary px-2.5 py-2 text-xs font-medium text-bg transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            >
              {adding
                ? "Adding..."
                : "Add device"}
            </button>

            <button
              type="button"
              disabled={adding}
              onClick={() => {
                setShowAddForm(false);
                setError("");
              }}
              className="rounded-md border border-border px-2.5 py-2 text-xs text-text-secondary transition-colors hover:text-text-primary"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {!showAddForm && (
        <button
          type="button"
          className="mt-2 rounded-md border border-dashed border-border px-2.5 py-2 text-left text-sm text-text-secondary transition-colors hover:border-text-secondary hover:text-text-primary"
          onClick={() => {
            setShowAddForm(true);
            setError("");
            setSuccess("");
          }}
        >
          + Add device
        </button>
      )}
    </Panel>
  );
}