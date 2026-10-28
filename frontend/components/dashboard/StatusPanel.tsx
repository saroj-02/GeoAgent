import { Panel } from "@/components/ui/Panel";
import { StatusDot } from "@/components/ui/StatusDot";

type StatusPanelProps = {
  deviceName?: string;
  deviceActive?: boolean;
};

export function StatusPanel({
  deviceName,
  deviceActive = false,
}: StatusPanelProps) {
  const telemetryFields = [
    { label: "LAT", value: "—" },
    { label: "LNG", value: "—" },
    { label: "ACCURACY", value: "—" },
  ];

  return (
    <Panel className="flex h-full flex-col gap-5 p-4">
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-medium uppercase tracking-wider text-text-secondary">
            Live Status
          </h2>

          {deviceName && (
            <span className="font-mono text-[9px] uppercase tracking-wider text-text-secondary">
              {deviceName}
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-col gap-2">
          <StatusDot
            label="GPS LOCK"
            tone={deviceActive ? "success" : "neutral"}
          />

          <StatusDot
            label="SATELLITE LINK"
            tone={deviceActive ? "success" : "neutral"}
          />

          <StatusDot
            label="LOCATION STREAM"
            tone={deviceActive ? "success" : "neutral"}
          />
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <h3 className="text-xs font-medium uppercase tracking-wider text-text-secondary">
          Position
        </h3>

        <dl className="mt-3 flex flex-col gap-2">
          {telemetryFields.map((field) => (
            <div
              key={field.label}
              className="flex items-center justify-between"
            >
              <dt className="font-mono text-xs text-text-secondary">
                {field.label}
              </dt>

              <dd className="font-mono text-sm text-text-primary">
                {field.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <p className="mt-auto text-xs leading-relaxed text-text-secondary">
        {deviceName
          ? deviceActive
            ? "Waiting for live telemetry from this device."
            : "This device is not currently tracking."
          : "Select a device to view live telemetry."}
      </p>
    </Panel>
  );
}