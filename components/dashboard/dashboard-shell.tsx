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
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card/70 px-4 backdrop-blur-sm supports-[backdrop-filter]:bg-card/50 md:px-6 transition-colors">
          <SidebarTrigger className="inline-flex shrink-0" />
          <Link
            href="/dashboard"
            className="flex items-center gap-2 md:hidden"
          >
            <PistoLogo size={32} showLabel />
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground sm:inline">
              {activeOrg.kind === "business" ? activeOrg.name : "Personal"}
            </span>
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
        <div className="relative flex flex-1 flex-col pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </div>
        <BottomNav />
      </SidebarInset>
    </SidebarProvider>
  );
}
