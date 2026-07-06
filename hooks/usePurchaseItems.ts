"use client";

import { useQuery } from "@tanstack/react-query";
import { getPurchaseItems } from "@/lib/db/purchase-items";

export const purchaseItemKeys = {
  byPurchase: (purchaseId: string) => ["purchase-items", purchaseId] as const,
};

export function usePurchaseItems(purchaseId: string | null) {
  return useQuery({
    queryKey: purchaseId ? purchaseItemKeys.byPurchase(purchaseId) : ["purchase-items", "none"],
    queryFn: () => getPurchaseItems(purchaseId!),
    enabled: !!purchaseId,
  });
}
