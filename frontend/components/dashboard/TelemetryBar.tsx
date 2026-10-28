import { Panel } from "@/components/ui/Panel";

const metrics = [
  { label: "SPEED", value: "—" },
  { label: "ACCURACY", value: "—" },
  { label: "DISTANCE", value: "—" },
  { label: "LAST UPDATE", value: "—" },
  { label: "CONNECTION", value: "IDLE" },
];

export function TelemetryBar() {
  return (
    <Panel className="flex flex-wrap items-center gap-x-8 gap-y-3 px-5 py-3.5">
      {metrics.map((metric) => (
        <div key={metric.label} className="flex items-baseline gap-2">
          <span className="font-mono text-[11px] uppercase tracking-wider text-text-secondary">
            {metric.label}
          </span>
          <span className="font-mono text-sm text-text-primary">{metric.value}</span>
        </div>
      ))}
    </Panel>
  );
}