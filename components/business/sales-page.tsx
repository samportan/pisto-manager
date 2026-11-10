"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";

import { SaleInsightsView } from "@/components/business/sale-insights-view";
import { SalesView } from "@/components/business/sales-view";
import { SegmentedControl } from "@/components/ui/segmented";
import { useT } from "@/hooks/useTranslations";

type SalesTab = "list" | "insights";

export function SalesPage() {
  const { t } = useT();
  const searchParams = useSearchParams();
  const customerFilter = searchParams.get("customer") ?? undefined;
  const [tab, setTab] = React.useState<SalesTab>("list");

  return (
    <div className="flex-1 overflow-x-hidden">
      <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6">
        <SegmentedControl
          className="mb-6"
          label={t("business.salesTitle")}
          value={tab}
          onChange={setTab}
          options={[
            { value: "list", label: t("business.salesTabList") },
            { value: "insights", label: t("business.salesTabInsights") },
          ]}
        />
      </div>
      {tab === "list" ? <SalesView embedded customerFilter={customerFilter} /> : <SaleInsightsView />}
    </div>
  );
}
