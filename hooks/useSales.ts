"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSaleWithItems,
  getSalesByOrgId,
  softDeleteSale,
  type ListSalesOptions,
  type SaleLineInput,
} from "@/lib/db/sales";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";
import { useAuthUserId } from "@/hooks/useAuthUserId";
import { productKeys } from "@/hooks/useProducts";

const salesKeys = {
  all: (orgId: string, opts?: ListSalesOptions) =>
    ["sales", orgId, opts?.includeDeleted ? "with-deleted" : "active"] as const,
};

export function useSales(opts?: ListSalesOptions) {
  const queryClient = useQueryClient();
  const { userId, sessionReady } = useAuthUserId();
  const { activeOrg, activeOrgId } = useActiveOrganization();
  const includeDeleted = opts?.includeDeleted ?? false;
  const orgId = activeOrg.kind === "business" ? activeOrgId : null;

  const query = useQuery({
    queryKey: orgId ? salesKeys.all(orgId, opts) : ["sales", "idle"],
    queryFn: () => getSalesByOrgId(orgId!, { includeDeleted }),
    enabled: sessionReady && !!userId && !!orgId,
  });

  const invalidate = () => {
    if (!orgId) return;
    void queryClient.invalidateQueries({
      queryKey: ["sales", orgId],
    });
  };

  const createMutation = useMutation({
    mutationFn: async (payload: {
      customer_id: string | null;
      date: string;
      notes: string | null;
      items: SaleLineInput[];
    }) => {
      if (!orgId) throw new Error("Must select a business organization.");
      return createSaleWithItems({ ...payload, organization_id: orgId });
    },
    onSuccess: async () => {
      invalidate();
      if (orgId) {
        await queryClient.refetchQueries({ queryKey: productKeys.all(orgId) });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => softDeleteSale(id),
    onSuccess: async () => {
      invalidate();
      void queryClient.invalidateQueries({ queryKey: ["sale-items"] });
      if (orgId) {
        await queryClient.refetchQueries({ queryKey: productKeys.all(orgId) });
      }
    },
  });

  return {
    sales: query.data ?? [],
    isLoading: !sessionReady || query.isLoading,
    createSaleWithItems: createMutation.mutateAsync,
    deleteSale: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

