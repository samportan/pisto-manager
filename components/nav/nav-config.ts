import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  Boxes,
  Landmark,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Target,
  Users,
} from "lucide-react";

export type NavItem = {
  titleKey: string;
  href: string;
  icon: LucideIcon;
};

export const personalNavItems: NavItem[] = [
  { titleKey: "nav.overview", href: "/dashboard", icon: LayoutDashboard },
  {
    titleKey: "nav.transactions",
    href: "/dashboard/transactions",
    icon: ArrowLeftRight,
  },
  { titleKey: "nav.budgets", href: "/dashboard/budgets", icon: Target },
  { titleKey: "nav.accounts", href: "/dashboard/accounts", icon: Landmark },
];

export const businessNavItems: NavItem[] = [
  { titleKey: "nav.overview", href: "/dashboard/business", icon: LayoutDashboard },
  { titleKey: "nav.products", href: "/dashboard/business/products", icon: Package },
  { titleKey: "nav.contacts", href: "/dashboard/business/contacts", icon: Users },
  { titleKey: "nav.sales", href: "/dashboard/business/sales", icon: ShoppingCart },
  { titleKey: "nav.purchases", href: "/dashboard/business/purchases", icon: Boxes },
];

export function isNavActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
