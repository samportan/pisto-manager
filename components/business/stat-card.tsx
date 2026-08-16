import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function DeltaBadge({ value }: { value: number | null }) {
  if (value === null) return null;
  const up = value > 0;
  const down = value < 0;
  return (
    <span
      className={cn(
        "text-xs font-medium tabular-nums",
        up ? "text-emerald-600 dark:text-emerald-400" : down ? "text-destructive" : "text-muted-foreground"
      )}
    >
      {up ? "↑" : down ? "↓" : "—"} {Math.abs(value).toFixed(0)}%
    </span>
  );
}

export function StatCard({
  title,
  value,
  icon: Icon,
  hint,
  delta,
  deltaLabel,
  tone = "default",
  href,
}: {
  title: string;
  value: string;
  icon?: LucideIcon;
  hint?: string;
  delta?: number | null;
  deltaLabel?: string;
  tone?: "default" | "positive" | "warning" | "danger";
  href?: string;
}) {
  const body = (
    <article
      className={cn(
        "relative h-full overflow-hidden rounded-xl border bg-card p-4 transition-colors",
        href && "hover:bg-muted/30",
        tone === "danger" && "border-destructive/40",
        tone === "warning" && "border-amber-500/40",
        tone === "positive" && "border-emerald-500/30"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p
          className={cn(
            "text-xs font-semibold uppercase tracking-wide text-muted-foreground",
            tone === "danger" && "text-destructive"
          )}
        >
          {title}
        </p>
        {Icon ? (
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-lg",
              tone === "danger"
                ? "bg-destructive/10 text-destructive"
                : tone === "positive"
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : tone === "warning"
                    ? "bg-amber-500/15 text-amber-600"
                    : "bg-primary/10 text-primary"
            )}
          >
            <Icon className="size-4" aria-hidden />
          </span>
        ) : null}
      </div>
      <p
        className={cn(
          "mt-2 text-2xl font-bold tabular-nums",
          tone === "danger" && "text-destructive",
          tone === "positive" && "text-emerald-600 dark:text-emerald-400"
        )}
      >
        {value}
      </p>
      {delta != null || hint ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {delta != null ? (
            <span className="flex items-center gap-1">
              <DeltaBadge value={delta} />
              {deltaLabel ? (
                <span className="text-xs text-muted-foreground">{deltaLabel}</span>
              ) : null}
            </span>
          ) : null}
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      ) : null}
    </article>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {body}
      </Link>
    );
  }

  return body;
}

export function StatCardSkeleton() {
  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-8 w-32" />
    </article>
  );
}
