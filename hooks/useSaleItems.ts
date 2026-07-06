"use client";

import { useQuery } from "@tanstack/react-query";
import { getSaleItems } from "@/lib/db/sale-items";

export const saleItemKeys = {
  bySale: (saleId: string) => ["sale-items", saleId] as const,
};

export function useSaleItems(saleId: string | null) {
  return useQuery({
    queryKey: saleId ? saleItemKeys.bySale(saleId) : ["sale-items", "none"],
    queryFn: () => getSaleItems(saleId!),
    enabled: !!saleId,
  });
}
