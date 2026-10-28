import type { ReactNode } from "react";
import { TopBar } from "@/components/dashboard/TopBar";

interface DashboardSectionProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}

export function DashboardSection({
  eyebrow,
  title,
  description,
  children,
}: DashboardSectionProps) {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <TopBar />
      <main className="flex flex-1 flex-col gap-5 p-4 lg:p-6">
        <header>
          <div className="font-mono text-[10px] uppercase tracking-widest text-text-secondary">
            {eyebrow}
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-text-primary">
            {title}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">{description}</p>
        </header>
        {children}
      </main>
    </div>
  );
}
