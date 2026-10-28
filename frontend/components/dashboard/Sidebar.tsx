"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";

type NavigationItem = {
  label: string;
  href: string;
  icon: string;
};

const workspaceItems: NavigationItem[] = [
  {
    label: "Assistant",
    href: "/assistant",
    icon: "🧠",
  },
  {
    label: "Map",
    href: "/dashboard/map",
    icon: "🗺️",
  },
  {
    label: "Satellite",
    href: "/satellite",
    icon: "🛰️",
  },
  {
    label: "Locations",
    href: "/dashboard/locations",
    icon: "📍",
  },
  {
    label: "Geofences",
    href: "/dashboard/geofences",
    icon: "🛡️",
  },
  {
    label: "Sharing",
    href: "/dashboard/sharing",
    icon: "👥",
  },
  {
    label: "Devices",
    href: "/dashboard/devices",
    icon: "📱",
  },
  {
    label: "Activity",
    href: "/dashboard/activity",
    icon: "📊",
  },
];

const accountItems: NavigationItem[] = [
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: "⚙️",
  },
  {
    label: "Profile",
    href: "/dashboard/profile",
    icon: "👤",
  },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>
    <aside className="hidden h-screen w-64 flex-col border-r border-border bg-panel lg:flex">
      {/* Brand */}
      <div className="flex h-16 shrink-0 items-center border-b border-border px-5">
        <Logo />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-5">
        {/* Workspace */}
        <div className="mb-3 px-3 font-mono text-[10px] uppercase tracking-widest text-text-secondary">
          Workspace
        </div>

        <div className="space-y-1">
          {workspaceItems.map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex items-center gap-3 rounded-md px-3 py-2.5",
                  "font-sans text-sm transition-colors",
                  active
                    ? "bg-bg text-text-primary"
                    : "text-text-secondary hover:bg-bg hover:text-text-primary",
                ].join(" ")}
              >
                <span className="flex w-5 shrink-0 items-center justify-center text-base">
                  {item.icon}
                </span>

                <span className="flex-1">{item.label}</span>

                {active && (
                  <span className="h-1.5 w-1.5 rounded-full bg-live" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Divider */}
        <div className="my-5 border-t border-border" />

        {/* Account */}
        <div className="mb-3 px-3 font-mono text-[10px] uppercase tracking-widest text-text-secondary">
          Account
        </div>

        <div className="space-y-1">
          {accountItems.map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex items-center gap-3 rounded-md px-3 py-2.5",
                  "font-sans text-sm transition-colors",
                  active
                    ? "bg-bg text-text-primary"
                    : "text-text-secondary hover:bg-bg hover:text-text-primary",
                ].join(" ")}
              >
                <span className="flex w-5 shrink-0 items-center justify-center text-base">
                  {item.icon}
                </span>

                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* System Status */}
      <div className="shrink-0 border-t border-border p-4">
        <div className="rounded-md border border-border bg-bg px-3 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-success" />

            <span className="font-mono text-[10px] uppercase tracking-wider text-text-secondary">
              System Online
            </span>
          </div>

          <div className="mt-1 font-mono text-[9px] text-text-secondary">
            GeoAgent Console
          </div>
        </div>
      </div>
    </aside>
    <nav
      aria-label="Dashboard navigation"
      className="flex gap-1 overflow-x-auto border-b border-border bg-panel px-2 py-2 lg:hidden"
    >
      {[...workspaceItems, ...accountItems].map((item) => {
        const active = isActive(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={[
              "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs",
              active
                ? "bg-bg text-text-primary"
                : "text-text-secondary hover:bg-bg hover:text-text-primary",
            ].join(" ")}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
    </>
  );
}