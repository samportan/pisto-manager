"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isNavActive, mainNavItems } from "@/components/nav/nav-config";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      aria-label="Main"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around gap-0 px-1 pt-1">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const active = isNavActive(pathname, item.href);
          return (
            <li key={item.href} className="min-w-0 flex-1">
              <Link
                href={item.href}
                aria-label={item.title}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-[0.65rem] font-medium transition-colors max-[359px]:min-h-[3.25rem] max-[359px]:gap-0 max-[359px]:text-[0.6rem]",
                  active
                    ? "text-sidebar-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "size-5 shrink-0 max-[359px]:size-[1.125rem]",
                    active && "text-sidebar-primary"
                  )}
                  aria-hidden
                />
                <span className="truncate leading-tight max-[359px]:hidden">
                  {item.title}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
