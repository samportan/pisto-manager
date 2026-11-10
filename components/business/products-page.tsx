"use client";

import * as React from "react";

import { ProductInsightsView } from "@/components/business/product-insights-view";
import { ProductsView } from "@/components/business/products-view";
import { SegmentedControl } from "@/components/ui/segmented";
import { useT } from "@/hooks/useTranslations";

type ProductsTab = "catalog" | "insights";

export function ProductsPage() {
  const { t } = useT();
  const [tab, setTab] = React.useState<ProductsTab>("catalog");

  return (
    <div className="flex-1">
      <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6">
        <SegmentedControl
          className="mb-6"
          label={t("business.productsTitle")}
          value={tab}
          onChange={setTab}
          options={[
            { value: "catalog", label: t("business.productsTabCatalog") },
            { value: "insights", label: t("business.productsTabInsights") },
          ]}
        />
      </div>
      {tab === "catalog" ? <ProductsView embedded /> : <ProductInsightsView />}
    </div>
  );
}
