"use client";

import * as React from "react";

import { ProductInsightsView } from "@/components/business/product-insights-view";
import { ProductsView } from "@/components/business/products-view";
import { Button } from "@/components/ui/button";
import { useT } from "@/hooks/useTranslations";

type ProductsTab = "catalog" | "insights";

export function ProductsPage() {
  const { t } = useT();
  const [tab, setTab] = React.useState<ProductsTab>("catalog");

  return (
    <div className="flex-1">
      <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6">
        <div className="mb-6 flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={tab === "catalog" ? "secondary" : "outline"}
            onClick={() => setTab("catalog")}
          >
            {t("business.productsTabCatalog")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tab === "insights" ? "secondary" : "outline"}
            onClick={() => setTab("insights")}
          >
            {t("business.productsTabInsights")}
          </Button>
        </div>
      </div>
      {tab === "catalog" ? <ProductsView embedded /> : <ProductInsightsView />}
    </div>
  );
}
