import { Panel } from "@/components/ui/Panel";

type MapPlaceholderProps = {
  deviceName?: string;
  deviceActive?: boolean;
};

export function MapPlaceholder({
  deviceName,
  deviceActive = false,
}: MapPlaceholderProps) {
  return (
    <Panel className="relative flex h-full min-h-[420px] items-center justify-center overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(#7F8B99 1px, transparent 1px), linear-gradient(90deg, #7F8B99 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col items-center gap-3 px-6 text-center">
        <span className="relative flex h-3 w-3">
          {deviceActive && (
            <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-live" />
          )}

          <span
            className={[
              "relative inline-flex h-3 w-3 rounded-full",
              deviceActive ? "bg-live" : "bg-text-secondary",
            ].join(" ")}
          />
        </span>

        <p className="font-mono text-xs uppercase tracking-wider text-text-secondary">
          Satellite map
        </p>

        {deviceName ? (
          <>
            <p className="text-sm font-medium text-text-primary">
              {deviceName}
            </p>

            <p className="max-w-xs text-sm text-text-secondary">
              {deviceActive
                ? "Device selected. Live location data will appear here when tracking data is available."
                : "This device is currently not reporting an active location."}
            </p>
          </>
        ) : (
          <p className="max-w-xs text-sm text-text-secondary">
            Select a tracked device to view its location and telemetry.
          </p>
        )}
      </div>
    </Panel>
  );
}