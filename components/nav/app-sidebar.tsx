"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Settings } from "lucide-react";
import { TeamSwitcher } from "@/components/nav/team-switcher";
import { useSignOut } from "@/components/sign-out-button";
import {
  businessNavItems,
  isNavActive,
  personalNavItems,
} from "@/components/nav/nav-config";
import { cn } from "@/lib/utils";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";
import { useT } from "@/hooks/useTranslations";
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
  const { t } = useT();
  const { signOut, pending } = useSignOut();
  const { activeOrg } = useActiveOrganization();
  const shortEmail = email?.includes("@") ? email.split("@")[0] : email;
  const navItems = activeOrg.kind === "business" ? businessNavItems : personalNavItems;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <TeamSwitcher />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {activeOrg.kind === "business" ? t("nav.business") : t("nav.personal")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isNavActive(pathname, item.href);
                const title = t(item.titleKey);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={active}
                      tooltip={title}
                    >
                      <Icon aria-hidden />
                      <span>{title}</span>
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
              tooltip={t("nav.settings")}
            >
              <Settings aria-hidden />
              <span>{t("nav.settings")}</span>
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
              tooltip={t("auth.signOut")}
              disabled={pending}
              onClick={signOut}
            >
              <LogOut aria-hidden />
              <span>{pending ? t("auth.signingOut") : t("auth.signOut")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
