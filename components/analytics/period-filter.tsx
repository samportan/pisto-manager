"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useT } from "@/hooks/useTranslations";
import {
  insightsPeriodToMonth,
  isCalendarMonthPeriod,
  monthToInsightsPeriod,
  type InsightsPeriod,
  type NamedInsightsPeriod,
} from "@/lib/analytics/shared";
import {
  formatZonedMonthYear,
  getZonedParts,
  shiftCalendarMonth,
} from "@/lib/timezone";
import { cn } from "@/lib/utils";

const DEFAULT_PRESETS: NamedInsightsPeriod[] = [
  "today",
  "this_month",
  "last_month",
  "last_30_days",
  "all_time",
];

type PeriodFilterProps = {
  value: InsightsPeriod;
  onChange: (period: InsightsPeriod) => void;
  presets?: NamedInsightsPeriod[];
  className?: string;
};

export function PeriodFilter({
  value,
  onChange,
  presets = DEFAULT_PRESETS,
  className,
}: PeriodFilterProps) {
  const { t, intlLocale } = useT();
  const now = new Date();
  const current = getZonedParts(now);
  const viewing = insightsPeriodToMonth(value, now) ?? {
    year: current.year,
    month: current.month,
  };
  const atCurrentMonth =
    viewing.year === current.year && viewing.month === current.month;
  const monthMode =
    value === "this_month" ||
    value === "last_month" ||
    isCalendarMonthPeriod(value);

  const presetLabels: Record<NamedInsightsPeriod, string> = {
    today: t("business.periodToday"),
    this_month: t("business.periodThisMonth"),
    last_month: t("business.periodLastMonth"),
    last_30_days: t("business.period30Days"),
    all_time: t("business.periodAllTime"),
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <Button
            key={preset}
            type="button"
            size="sm"
            variant={value === preset ? "secondary" : "outline"}
            onClick={() => onChange(preset)}
          >
            {presetLabels[preset]}
          </Button>
        ))}
      </div>
      <div
        className={cn(
          "inline-flex items-center gap-0.5 self-start rounded-lg border bg-card p-0.5",
          monthMode ? "border-border" : "border-dashed border-border/80"
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t("common.previousMonth")}
          onClick={() => {
            const next = shiftCalendarMonth(viewing.year, viewing.month, -1);
            onChange(monthToInsightsPeriod(next.year, next.month, now));
          }}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="min-w-[9.5rem] px-1 text-center text-sm font-medium capitalize tabular-nums">
          {formatZonedMonthYear(viewing.year, viewing.month, intlLocale)}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t("common.nextMonth")}
          disabled={atCurrentMonth}
          onClick={() => {
            const next = shiftCalendarMonth(viewing.year, viewing.month, 1);
            onChange(monthToInsightsPeriod(next.year, next.month, now));
          }}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
