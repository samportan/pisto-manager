"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Ellipsis, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  bottomMoreItems,
  bottomPrimaryItems,
  isNavActive,
} from "@/components/nav/nav-config";
import { useT } from "@/hooks/useTranslations";

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useT();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = bottomMoreItems.some((item) => isNavActive(pathname, item.href));

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  return (
    <>
      {moreOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-foreground/25 md:hidden"
          aria-label={t("common.close")}
          onClick={() => setMoreOpen(false)}
        />
      ) : null}

      {moreOpen ? (
        <div
          role="dialog"
          aria-label={t("nav.more")}
          className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-50 px-3 md:hidden"
        >
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
            <ul className="p-1.5">
              {bottomMoreItems.map((item) => {
                const Icon = item.icon;
                const active = isNavActive(pathname, item.href);
                const title = t(item.titleKey);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm",
                        active
                          ? "bg-accent/15 font-medium text-foreground"
                          : "text-foreground hover:bg-muted"
                      )}
                    >
                      <Icon className="size-5 text-muted-foreground" aria-hidden />
                      {title}
                    </Link>
                  </li>
                );
              })}
              <li>
                <Link
                  href="/dashboard/settings"
                  className={cn(
                    "flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm",
                    pathname.startsWith("/dashboard/settings")
                      ? "bg-accent/15 font-medium text-foreground"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <Settings className="size-5 text-muted-foreground" aria-hidden />
                  {t("nav.settings")}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      ) : null}

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
        aria-label="Main"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-4">
          {bottomPrimaryItems.map((item) => {
            const Icon = item.icon;
            const active = isNavActive(pathname, item.href);
            const title = t(item.titleKey);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[0.7rem] font-medium",
                    active ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  <Icon className="size-[1.35rem]" aria-hidden />
                  <span className="max-w-full truncate leading-none">{title}</span>
                  <span
                    aria-hidden
                    className={cn(
                      "absolute top-0 h-0.5 w-5 rounded-full",
                      active ? "bg-accent" : "bg-transparent"
                    )}
                  />
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              aria-expanded={moreOpen}
              aria-haspopup="dialog"
              onClick={() => setMoreOpen((open) => !open)}
              className={cn(
                "relative flex min-h-14 w-full flex-col items-center justify-center gap-1 px-1 text-[0.7rem] font-medium",
                moreOpen || moreActive ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <Ellipsis className="size-[1.35rem]" aria-hidden />
              <span className="leading-none">{t("nav.more")}</span>
              <span
                aria-hidden
                className={cn(
                  "absolute top-0 h-0.5 w-5 rounded-full",
                  moreOpen || moreActive ? "bg-accent" : "bg-transparent"
                )}
              />
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
