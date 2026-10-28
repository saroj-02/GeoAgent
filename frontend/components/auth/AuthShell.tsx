import { ReactNode } from "react";
import { Logo } from "@/components/ui/Logo";
import { StatusDot } from "@/components/ui/StatusDot";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-border bg-panel p-12 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(#7F8B99 1px, transparent 1px), linear-gradient(90deg, #7F8B99 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
          aria-hidden="true"
        />

        <Logo />

        <div className="relative z-10 max-w-sm">
          <p className="font-mono text-xs uppercase tracking-wider text-text-secondary">
            Satellite Intelligence Console
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-snug text-text-primary">
            Authorized geospatial tracking, satellite analysis, and an AI
            agent — in one console.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-text-secondary">
            Location data is only ever visible with explicit, revocable
            permission from the device owner. Nothing is inferred from an
            email or phone number alone.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-5">
          <StatusDot label="SYSTEM ONLINE" tone="success" />
          <StatusDot label="ENCRYPTED CONNECTION" tone="neutral" />
        </div>
      </div>

      <div className="flex flex-col justify-center px-6 py-16 sm:px-12 lg:px-20">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
          <p className="mt-1.5 text-sm text-text-secondary">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}