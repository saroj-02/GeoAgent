import Link from "next/link";
import { DashboardSection } from "@/components/dashboard/DashboardSection";

const settingsLinks = [
  {
    href: "/dashboard/profile",
    title: "Profile details",
    description: "Review your account identity and update your display name.",
  },
  {
    href: "/dashboard/sharing",
    title: "Location sharing",
    description: "Manage which accounts can view your device locations.",
  },
  {
    href: "/dashboard/devices",
    title: "Device access",
    description: "Review registered devices and disable or remove access.",
  },
];

export default function SettingsPage() {
  return (
    <DashboardSection
      eyebrow="Account / Settings"
      title="Settings"
      description="Manage account, privacy, and connected-device settings."
    >
      <div className="grid gap-3 md:grid-cols-2">
        {settingsLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-lg border border-border bg-panel p-5 transition-colors hover:border-live/60"
          >
            <h2 className="font-medium text-text-primary">{item.title}</h2>
            <p className="mt-2 text-sm text-text-secondary">
              {item.description}
            </p>
            <span className="mt-4 inline-block text-sm text-live">
              Manage →
            </span>
          </Link>
        ))}
      </div>
      <section className="rounded-lg border border-border bg-panel p-5">
        <h2 className="font-medium text-text-primary">Location data</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text-secondary">
          Location access is controlled by the permissions you grant and by
          each device&apos;s reporting settings. Use Location sharing to revoke
          access, or Devices to deactivate a device. Data retention preferences
          are managed by the backend and are not editable from this frontend.
        </p>
      </section>
    </DashboardSection>
  );
}
