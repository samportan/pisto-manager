"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";
import { useT } from "@/hooks/useTranslations";

export default function BusinessLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const { t } = useT();
  const { organizations, activeOrg, isLoading } = useActiveOrganization();

  React.useEffect(() => {
    if (isLoading) return;
    if (organizations.length === 0) return;
    if (activeOrg.kind !== "business") {
      router.replace("/dashboard");
    }
  }, [isLoading, organizations.length, activeOrg.kind, router]);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-8 sm:px-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-10 text-center">
        <h2 className="text-2xl font-semibold">{t("business.layoutCreateOrgTitle")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("business.layoutCreateOrgDescription")}
        </p>
        <Link href="/dashboard" className="mt-4 text-sm font-medium text-primary underline">
          {t("business.layoutBackPersonal")}
        </Link>
      </div>
    );
  }

  if (activeOrg.kind !== "business") {
    return null;
  }

  return <>{children}</>;
}
