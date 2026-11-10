"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { CreateOrganizationSheet } from "@/components/create-organization-sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";
import { useT } from "@/hooks/useTranslations";

export function WorkspaceGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useT();
  const { activeOrg, organizations, isLoading, setWorkspace } = useActiveOrganization();
  const [ready, setReady] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const isBusinessRoute = pathname?.startsWith("/dashboard/business") ?? false;
  const needsBusiness = !isLoading && isBusinessRoute && organizations.length === 0;

  React.useEffect(() => {
    if (isLoading) return;
    setReady(true);
  }, [isLoading]);

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

  if (needsBusiness) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-16 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t("nav.needBusinessTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("nav.needBusinessBody")}</p>
        <Button className="mt-6 w-fit" onClick={() => setCreateOpen(true)}>
          {t("nav.createBusiness")}
        </Button>
        <CreateOrganizationSheet
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={(id) => {
            setWorkspace("business", id);
          }}
        />
      </div>
    );
  }

  if (activeOrg.kind !== "business" && isBusinessRoute) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-8 sm:px-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    );
  }

  return <>{children}</>;
}
