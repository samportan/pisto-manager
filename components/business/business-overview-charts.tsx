"use client";

import { useT } from "@/hooks/useTranslations";
import { formatMoney } from "@/lib/format-money";

type RevenuePurchasesChartProps = {
  data: Array<{ label: string; revenue: number; purchases: number }>;
  height?: number;
};

export function BusinessRevenuePurchasesChart({
  data,
  height = 200,
}: RevenuePurchasesChartProps) {
  const { intlLocale, currency, t } = useT();
  const max = Math.max(1, ...data.flatMap((d) => [d.revenue, d.purchases]));

  return (
    <div className="space-y-3">
      <div
        className="flex items-end gap-2 border-b border-border pb-2"
        style={{ height }}
        role="img"
        aria-label={t("business.revenueVsPurchases")}
      >
        {data.map((d) => (
          <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
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
                title={`${d.label} ${t("business.revenue")}: ${formatMoney(d.revenue, { currency, locale: intlLocale })}`}
              />
              <div
                className="w-2 rounded-t bg-amber-500/80 sm:w-3"
                style={{
                  height: `${(d.purchases / max) * 100}%`,
                  minHeight: d.purchases > 0 ? 4 : 0,
                }}
                title={`${d.label} ${t("business.purchases")}: ${formatMoney(d.purchases, { currency, locale: intlLocale })}`}
              />
            </div>
            <span className="text-[10px] text-muted-foreground sm:text-xs">{d.label}</span>
          </div>
        ))}
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
              {formatMoney(d.total, { currency, locale: intlLocale })}
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
