"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Settings } from "lucide-react";
import { useSignOut } from "@/components/sign-out-button";
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
  const { signOut, pending } = useSignOut();
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
              className="h-auto py-2"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary/80 text-sidebar-primary-foreground font-bold">
                P
              </span>
              <span className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-bold">Pisto</span>
                <span className="truncate text-xs text-sidebar-foreground/60">
                  Finance
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
              "truncate px-2 text-xs text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden"
            )}
            title={email}
          >
            {shortEmail}
          </p>
        ) : (
          <p className="px-2 text-xs text-warning group-data-[collapsible=icon]:hidden">
            Supabase not configured
          </p>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              type="button"
              tooltip="Sign out"
              disabled={pending}
              onClick={signOut}
            >
              <LogOut aria-hidden />
              <span>{pending ? "Signing out…" : "Sign out"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
