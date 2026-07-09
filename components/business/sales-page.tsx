"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";

import { SaleInsightsView } from "@/components/business/sale-insights-view";
import { SalesView } from "@/components/business/sales-view";
import { Button } from "@/components/ui/button";
import { useT } from "@/hooks/useTranslations";

type SalesTab = "list" | "insights";

export function SalesPage() {
  const { t } = useT();
  const searchParams = useSearchParams();
  const customerFilter = searchParams.get("customer") ?? undefined;
  const [tab, setTab] = React.useState<SalesTab>("list");

  return (
    <div className="flex-1">
      <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6">
        <div className="mb-6 flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={tab === "list" ? "secondary" : "outline"}
            onClick={() => setTab("list")}
          >
            {t("business.salesTabList")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tab === "insights" ? "secondary" : "outline"}
            onClick={() => setTab("insights")}
          >
            {t("business.salesTabInsights")}
          </Button>
        </div>
      </div>
      {tab === "list" ? <SalesView embedded customerFilter={customerFilter} /> : <SaleInsightsView />}
    </div>
  );
}
