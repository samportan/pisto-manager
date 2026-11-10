import type { LucideIcon } from "lucide-react";
import {
  Boxes,
  LayoutDashboard,
  Package,
  Receipt,
  ShoppingCart,
  Users,
} from "lucide-react";

export type NavItem = {
  titleKey: string;
  href: string;
  icon: LucideIcon;
};

export const businessNavItems: NavItem[] = [
  { titleKey: "nav.overview", href: "/dashboard/business", icon: LayoutDashboard },
  { titleKey: "nav.products", href: "/dashboard/business/products", icon: Package },
  { titleKey: "nav.contacts", href: "/dashboard/business/contacts", icon: Users },
  { titleKey: "nav.sales", href: "/dashboard/business/sales", icon: ShoppingCart },
  { titleKey: "nav.purchases", href: "/dashboard/business/purchases", icon: Boxes },
  { titleKey: "nav.expenses", href: "/dashboard/business/expenses", icon: Receipt },
];

export function isNavActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
