import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="9.5" stroke="#1D2935" strokeWidth="1.5" />
        <circle cx="11" cy="11" r="5.5" stroke="#7F8B99" strokeWidth="1" />
        <circle cx="11" cy="11" r="1.6" fill="#FF3B4E" />
        <path d="M11 11L17 6" stroke="#FF3B4E" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
      <span className="font-mono text-sm font-semibold tracking-wide text-text-primary">
        GEOAGENT
      </span>
    </div>
  );
}