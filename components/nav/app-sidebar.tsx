"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Settings } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import { isNavActive, mainNavItems } from "@/components/nav/nav-config";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

export function AppSidebar({ email }: { email: string | null }) {
  const pathname = usePathname();
  const shortEmail = email?.includes("@") ? email.split("@")[0] : email;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/dashboard" />}
              isActive={pathname === "/dashboard"}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <LayoutDashboard className="size-4" aria-hidden />
              </span>
              <span className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Pisto</span>
                <span className="truncate text-xs text-sidebar-foreground/70">
                  Money manager
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const active = isNavActive(pathname, item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={active}
                      tooltip={item.title}
                    >
                      <Icon aria-hidden />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href="/dashboard/settings" />}
              isActive={pathname.startsWith("/dashboard/settings")}
              tooltip="Settings"
            >
              <Settings aria-hidden />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {email ? (
          <p
            className={cn(
              "truncate px-2 text-xs text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden"
            )}
            title={email}
          >
            {shortEmail}
          </p>
        ) : (
          <p className="px-2 text-xs text-amber-700/90 dark:text-amber-300/90 group-data-[collapsible=icon]:hidden">
            Supabase not configured
          </p>
        )}
        <div className="px-2 pb-2 group-data-[collapsible=icon]:px-0">
          <SignOutButton className="w-full border-sidebar-border bg-sidebar-accent/50 text-sidebar-foreground hover:bg-sidebar-accent md:max-w-none" />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
