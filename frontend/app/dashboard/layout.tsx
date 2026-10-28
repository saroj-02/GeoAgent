"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { Sidebar } from "@/components/dashboard/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
    } else {
      setChecked(true);
    }
  }, [router]);

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="flex items-center gap-2.5 text-sm text-text-secondary">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-border border-t-live" />
          Verifying session…
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg lg:flex-row">
      <div className="w-full lg:w-auto">
        <Sidebar />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {children}
      </div>
    </div>
  );
}