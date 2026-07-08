"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createStockAdjustment,
  getStockMovementsByProductId,
  type StockAdjustmentReason,
} from "@/lib/db/stock-movements";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";
import { productKeys } from "@/hooks/useProducts";

const stockMovementKeys = {
  byProduct: (productId: string) => ["stock-movements", productId] as const,
};

export function useStockMovements(productId: string | null) {
  const query = useQuery({
    queryKey: productId ? stockMovementKeys.byProduct(productId) : ["stock-movements", "idle"],
    queryFn: () => getStockMovementsByProductId(productId!),
    enabled: !!productId,
  });

  return {
    movements: query.data ?? [],
    isLoading: query.isLoading,
  };
}

export function useStockAdjustment() {
  const queryClient = useQueryClient();
  const { activeOrg, activeOrgId } = useActiveOrganization();
  const orgId = activeOrg.kind === "business" ? activeOrgId : null;

  const mutation = useMutation({
    mutationFn: async (args: {
      product_id: string;
      quantity_delta: number;
      reason: StockAdjustmentReason;
      notes?: string | null;
    }) => {
      if (!orgId) throw new Error("Must select a business organization.");
      return createStockAdjustment({ ...args, organization_id: orgId });
    },
    onSuccess: async (_data, vars) => {
      void queryClient.invalidateQueries({
        queryKey: stockMovementKeys.byProduct(vars.product_id),
      });
      if (orgId) {
        await queryClient.refetchQueries({ queryKey: productKeys.all(orgId) });
      }
    },
  });

  return {
    adjustStock: mutation.mutateAsync,
    isAdjusting: mutation.isPending,
  };
}
