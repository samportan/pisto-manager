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

const exactHrefs = new Set(["/dashboard", "/dashboard/business"]);

export function isNavActive(pathname: string, href: string) {
  if (exactHrefs.has(href)) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

const bottomPrimaryHrefs = [
  "/dashboard/business",
  "/dashboard/business/sales",
  "/dashboard/business/products",
];

const bottomMoreHrefs = [
  "/dashboard/business/purchases",
  "/dashboard/business/expenses",
  "/dashboard/business/contacts",
];

function pickNav(hrefs: string[]) {
  return hrefs.flatMap((href) => {
    const item = businessNavItems.find((entry) => entry.href === href);
    return item ? [item] : [];
  });
}

export const bottomPrimaryItems = pickNav(bottomPrimaryHrefs);
export const bottomMoreItems = pickNav(bottomMoreHrefs);
