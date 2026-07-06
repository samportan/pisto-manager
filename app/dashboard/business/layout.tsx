"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";

export default function BusinessLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const { organizations, activeOrg, isLoading } = useActiveOrganization();

  React.useEffect(() => {
    if (isLoading) return;
    if (organizations.length === 0) return;
    if (activeOrg.kind !== "business") {
      router.replace("/dashboard");
    }
  }, [isLoading, organizations.length, activeOrg.kind, router]);

  if (isLoading) {
    return null;
  }

  if (organizations.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-10 text-center">
        <h2 className="text-2xl font-semibold">Create business organization first</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Use sidebar team switcher and choose create organization.
        </p>
        <Link href="/dashboard" className="mt-4 text-sm font-medium text-primary underline">
          Back to personal dashboard
        </Link>
      </div>
    );
  }

  if (activeOrg.kind !== "business") {
    return null;
  }

  return <>{children}</>;
}
