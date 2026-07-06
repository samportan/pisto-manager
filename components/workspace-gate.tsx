"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";

export function WorkspaceGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { activeOrg, isLoading } = useActiveOrganization();
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    if (isLoading) return;

    const isBusinessRoute = pathname?.startsWith("/dashboard/business") ?? false;
    const isPersonalOverview = pathname === "/dashboard";

    if (activeOrg.kind === "business" && isPersonalOverview) {
      router.replace("/dashboard/business");
      return;
    }

    if (activeOrg.kind === "personal" && isBusinessRoute) {
      router.replace("/dashboard");
      return;
    }

    setReady(true);
  }, [activeOrg.kind, isLoading, pathname, router]);

  if (isLoading || !ready) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-8 sm:px-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
