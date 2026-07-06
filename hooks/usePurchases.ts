"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPurchaseWithItems,
  getPurchasesByOrgId,
  softDeletePurchase,
  type ListPurchasesOptions,
  type PurchaseLineInput,
} from "@/lib/db/purchases";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";
import { useAuthUserId } from "@/hooks/useAuthUserId";
import { productKeys } from "@/hooks/useProducts";

const purchaseKeys = {
  all: (orgId: string, opts?: ListPurchasesOptions) =>
    ["purchases", orgId, opts?.includeDeleted ? "with-deleted" : "active"] as const,
};

export function usePurchases(opts?: ListPurchasesOptions) {
  const queryClient = useQueryClient();
  const { userId, sessionReady } = useAuthUserId();
  const { activeOrg, activeOrgId } = useActiveOrganization();
  const includeDeleted = opts?.includeDeleted ?? false;
  const orgId = activeOrg.kind === "business" ? activeOrgId : null;

  const query = useQuery({
    queryKey: orgId ? purchaseKeys.all(orgId, opts) : ["purchases", "idle"],
    queryFn: () => getPurchasesByOrgId(orgId!, { includeDeleted }),
    enabled: sessionReady && !!userId && !!orgId,
  });

  const invalidate = () => {
    if (!orgId) return;
    void queryClient.invalidateQueries({
      queryKey: ["purchases", orgId],
    });
  };

  const createMutation = useMutation({
    mutationFn: async (payload: {
      supplier_id: string | null;
      date: string;
      notes: string | null;
      items: PurchaseLineInput[];
    }) => {
      if (!orgId) throw new Error("Must select a business organization.");
      return createPurchaseWithItems({ ...payload, organization_id: orgId });
    },
    onSuccess: () => {
      invalidate();
      if (orgId) void queryClient.invalidateQueries({ queryKey: productKeys.all(orgId) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => softDeletePurchase(id),
    onSuccess: () => {
      invalidate();
      void queryClient.invalidateQueries({ queryKey: ["purchase-items"] });
    },
  });

  return {
    purchases: query.data ?? [],
    isLoading: !sessionReady || query.isLoading,
    createPurchaseWithItems: createMutation.mutateAsync,
    deletePurchase: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
