"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { PistoLogo } from "@/components/pisto-logo";
import { BottomNav } from "@/components/nav/bottom-nav";
import { AppSidebar } from "@/components/nav/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";
import { cn } from "@/lib/utils";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export function DashboardShell({
  children,
  email,
}: {
  children: React.ReactNode;
  email: string | null;
}) {
  const { activeOrg } = useActiveOrganization();

  return (
    <SidebarProvider>
      <AppSidebar email={email} />
      <SidebarInset className="flex min-h-dvh flex-col bg-background">
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-md md:px-6">
          <SidebarTrigger className="inline-flex shrink-0" />
          <Link
            href="/dashboard/business"
            className="flex items-center gap-2 md:hidden"
          >
            <PistoLogo size={32} showLabel />
          </Link>
          <div className="ml-auto flex items-center gap-2">
            {activeOrg.kind === "business" ? (
              <span className="hidden max-w-[12rem] truncate rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground sm:inline">
                {activeOrg.name}
              </span>
            ) : null}
            {email ? (
              <span className="hidden max-w-[14rem] truncate text-sm text-muted-foreground lg:inline">
                {email}
              </span>
            ) : (
              <span className="hidden text-sm text-warning lg:inline">
                Supabase not configured
              </span>
            )}
            <ThemeToggle />
            <Link
              href="/dashboard/settings"
              aria-label="Settings"
              className={cn(
                "inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
              )}
            >
              <Settings className="size-4" />
            </Link>
          </div>
        </header>
        <div className="relative flex flex-1 flex-col pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </div>
        <BottomNav />
      </SidebarInset>
    </SidebarProvider>
  );
}
