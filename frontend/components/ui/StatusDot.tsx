import { cn } from "@/lib/utils";

interface StatusDotProps {
  label: string;
  tone?: "success" | "warning" | "live" | "neutral";
}

const toneClasses: Record<NonNullable<StatusDotProps["tone"]>, string> = {
  success: "bg-success",
  warning: "bg-warning",
  live: "bg-live",
  neutral: "bg-text-secondary",
};

export function StatusDot({ label, tone = "success" }: StatusDotProps) {
  return (
    <div className="flex items-center gap-2 text-xs font-medium text-text-secondary">
      <span className={cn("h-1.5 w-1.5 rounded-full", toneClasses[tone])} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}