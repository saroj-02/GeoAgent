"use client";

import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { StatusDot } from "@/components/ui/StatusDot";
import { Button } from "@/components/ui/Button";
import { logout } from "@/lib/auth";

export function TopBar() {
  const router = useRouter();

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-panel px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-4 lg:gap-6">
        <div className="lg:hidden">
          <Logo />
        </div>

        <div className="hidden lg:block">
          <span className="font-mono text-xs uppercase tracking-wider text-text-secondary">
            Geospatial Intelligence Console
          </span>
        </div>

        <div className="lg:hidden">
          <span className="font-mono text-[10px] uppercase tracking-wider text-text-secondary">
            GEOAGENT
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 lg:gap-5">
        <div className="hidden sm:block">
          <StatusDot label="SYSTEM ONLINE" tone="success" />
        </div>

        <div className="hidden font-mono text-xs text-text-secondary md:block">
          Saroj
        </div>

        <Button
          variant="ghost"
          onClick={() => {
            logout();
            router.push("/login");
          }}
        >
          Sign out
        </Button>
      </div>
    </header>
  );
}