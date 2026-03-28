"use client";

import Link from "next/link";
import { LayoutDashboard, Settings } from "lucide-react";
import { BottomNav } from "@/components/nav/bottom-nav";
import { AppSidebar } from "@/components/nav/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
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
  return (
    <SidebarProvider>
      <AppSidebar email={email} />
      <SidebarInset className="flex min-h-dvh flex-col bg-background">
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 md:px-6">
          <SidebarTrigger className="hidden md:inline-flex" />
          <Link
            href="/dashboard"
            className="flex items-center gap-2 md:hidden"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <LayoutDashboard className="size-4" aria-hidden />
            </span>
            <span className="text-sm font-semibold tracking-tight">Pisto</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            {email ? (
              <span className="hidden max-w-[14rem] truncate text-sm text-muted-foreground lg:inline">
                {email}
              </span>
            ) : (
              <span className="hidden text-sm text-amber-700 dark:text-amber-300/90 lg:inline">
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
