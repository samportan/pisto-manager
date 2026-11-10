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
        up ? "text-success" : down ? "text-destructive" : "text-muted-foreground"
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
        "relative h-full overflow-hidden rounded-xl border border-border bg-card p-4",
        tone === "danger" && "border-l-2 border-l-destructive",
        tone === "warning" && "border-l-2 border-l-warning",
        tone === "positive" && "border-l-2 border-l-success"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p
          className={cn(
            "text-sm text-muted-foreground",
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
                  ? "bg-success/15 text-success"
                  : tone === "warning"
                    ? "bg-warning/15 text-warning"
                    : "bg-primary/8 text-primary"
            )}
          >
            <Icon className="size-4" aria-hidden />
          </span>
        ) : null}
      </div>
      <p
        className={cn(
          "mt-3 font-display text-[1.75rem] leading-none tabular-nums",
          tone === "danger" && "text-destructive",
          tone === "positive" && "text-success"
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
        className="block rounded-xl transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
