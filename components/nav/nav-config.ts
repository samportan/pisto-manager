import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  Landmark,
  LayoutDashboard,
  Target,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export const mainNavItems: NavItem[] = [
  { title: "Overview", href: "/dashboard", icon: LayoutDashboard },
  {
    title: "Transactions",
    href: "/dashboard/transactions",
    icon: ArrowLeftRight,
  },
  { title: "Budgets", href: "/dashboard/budgets", icon: Target },
  { title: "Accounts", href: "/dashboard/accounts", icon: Landmark },
];

export function isNavActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
