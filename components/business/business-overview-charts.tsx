"use client";

import { useT } from "@/hooks/useTranslations";
import { formatMoneyDisplay } from "@/lib/format-money";
import { cn } from "@/lib/utils";

type RevenuePurchasesChartProps = {
  data: Array<{ key?: string; label: string; revenue: number; purchases: number }>;
  height?: number;
  activeKey?: string;
  onSelectMonth?: (key: string) => void;
};

export function BusinessRevenuePurchasesChart({
  data,
  height = 200,
  activeKey,
  onSelectMonth,
}: RevenuePurchasesChartProps) {
  const { intlLocale, currency, t } = useT();
  const max = Math.max(1, ...data.flatMap((d) => [d.revenue, d.purchases]));

  return (
    <div className="space-y-3">
      <div
        className="flex items-end gap-2 border-b border-border pb-2"
        style={{ height }}
        role={onSelectMonth ? "group" : "img"}
        aria-label={t("business.revenueVsPurchases")}
      >
        {data.map((d) => {
          const selected = Boolean(d.key && d.key === activeKey);
          const clickable = Boolean(d.key && onSelectMonth);
          return (
            <button
              key={d.label}
              type="button"
              disabled={!clickable}
              onClick={() => {
                if (d.key) onSelectMonth?.(d.key);
              }}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-md px-0.5 pt-1 transition-colors",
                clickable && "hover:bg-muted/50",
                selected && "bg-muted"
              )}
            >
              <div
                className="flex w-full items-end justify-center gap-0.5"
                style={{ height: height - 24 }}
              >
                <div
                  className="w-2 rounded-t bg-emerald-500/80 sm:w-3"
                  style={{
                    height: `${(d.revenue / max) * 100}%`,
                    minHeight: d.revenue > 0 ? 4 : 0,
                  }}
                  title={`${d.label} ${t("business.revenue")}: ${formatMoneyDisplay(d.revenue, { currency, locale: intlLocale })}`}
                />
                <div
                  className="w-2 rounded-t bg-amber-500/80 sm:w-3"
                  style={{
                    height: `${(d.purchases / max) * 100}%`,
                    minHeight: d.purchases > 0 ? 4 : 0,
                  }}
                  title={`${d.label} ${t("business.purchases")}: ${formatMoneyDisplay(d.purchases, { currency, locale: intlLocale })}`}
                />
              </div>
              <span
                className={cn(
                  "text-[10px] sm:text-xs",
                  selected ? "font-semibold text-foreground" : "text-muted-foreground"
                )}
              >
                {d.label}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-emerald-500/80" /> {t("business.revenue")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-amber-500/80" /> {t("business.purchases")}
        </span>
      </div>
    </div>
  );
}

type HorizontalBarChartProps = {
  data: Array<{ name: string; total: number }>;
  emptyLabel: string;
};

const COLORS = [
  "bg-primary",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-violet-500",
  "bg-cyan-500",
];

export function HorizontalBarChart({ data, emptyLabel }: HorizontalBarChartProps) {
  const { intlLocale, currency } = useT();
  const top = data.slice(0, 6);
  const max = Math.max(1, ...top.map((d) => d.total));

  if (top.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">{emptyLabel}</p>
    );
  }

  return (
    <ul className="space-y-3">
      {top.map((d, i) => (
        <li key={d.name}>
          <div className="mb-1 flex items-center justify-between gap-2 text-sm">
            <span className="truncate font-medium">{d.name}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {formatMoneyDisplay(d.total, { currency, locale: intlLocale })}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${COLORS[i % COLORS.length]}`}
              style={{ width: `${(d.total / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
