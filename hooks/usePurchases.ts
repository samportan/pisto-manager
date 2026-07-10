"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelPendingPurchase,
  createPurchaseWithItems,
  getPurchasesByOrgId,
  listPurchasesPaginated,
  receivePurchase,
  softDeletePurchase,
  updatePendingPurchase,
  updateReceivedPurchase,
  type CreatePurchaseArgs,
  type ListPurchasesOptions,
  type ReceivePurchaseArgs,
  type UpdatePendingPurchaseArgs,
  type UpdateReceivedPurchaseArgs,
  type PurchasesListFilters,
} from "@/lib/db/purchases";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";
import { useAuthUserId } from "@/hooks/useAuthUserId";
import { productKeys } from "@/hooks/useProducts";

export const purchasesKeys = {
  all: (orgId: string, opts?: ListPurchasesOptions) =>
    ["purchases", orgId, opts?.includeDeleted ? "with-deleted" : "active"] as const,
  paginated: (orgId: string, page: number, pageSize: number, filters?: PurchasesListFilters) =>
    ["purchases", orgId, "paginated", page, pageSize, filters] as const,
};

function usePurchasesOrgId() {
  const { activeOrg, activeOrgId } = useActiveOrganization();
  const orgId = activeOrg.kind === "business" ? activeOrgId : null;
  return orgId;
}

function useInvalidatePurchases() {
  const queryClient = useQueryClient();
  const orgId = usePurchasesOrgId();

  return () => {
    if (!orgId) return;
    void queryClient.invalidateQueries({ queryKey: ["purchases", orgId] });
  };
}

async function refetchProductsIfNeeded(
  queryClient: ReturnType<typeof useQueryClient>,
  orgId: string | null,
  affectsStock: boolean
) {
  if (orgId && affectsStock) {
    await queryClient.refetchQueries({ queryKey: productKeys.all(orgId) });
  }
}

export function usePurchases(opts?: ListPurchasesOptions) {
  const queryClient = useQueryClient();
  const { userId, sessionReady } = useAuthUserId();
  const includeDeleted = opts?.includeDeleted ?? false;
  const orgId = usePurchasesOrgId();
  const invalidate = useInvalidatePurchases();

  const query = useQuery({
    queryKey: orgId ? purchasesKeys.all(orgId, opts) : ["purchases", "idle"],
    queryFn: () => getPurchasesByOrgId(orgId!, { includeDeleted }),
    enabled: sessionReady && !!userId && !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: Omit<CreatePurchaseArgs, "organization_id">) => {
      if (!orgId) throw new Error("Must select a business organization.");
      return createPurchaseWithItems({ ...payload, organization_id: orgId });
    },
    onSuccess: async (_data, variables) => {
      invalidate();
      await refetchProductsIfNeeded(
        queryClient,
        orgId,
        variables.receipt_status === "received"
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => softDeletePurchase(id),
    onSuccess: async () => {
      invalidate();
      void queryClient.invalidateQueries({ queryKey: ["purchase-items"] });
      await refetchProductsIfNeeded(queryClient, orgId, true);
    },
  });

  return {
    purchases: query.data ?? [],
    isLoading: query.isPending && !query.data,
    isFetching: query.isFetching,
    createPurchaseWithItems: createMutation.mutateAsync,
    deletePurchase: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function useDeletePurchase() {
  const queryClient = useQueryClient();
  const orgId = usePurchasesOrgId();
  const invalidate = useInvalidatePurchases();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => softDeletePurchase(id),
    onSuccess: async () => {
      invalidate();
      void queryClient.invalidateQueries({ queryKey: ["purchase-items"] });
      await refetchProductsIfNeeded(queryClient, orgId, true);
    },
  });

  return {
    deletePurchase: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}

export function useUpdatePendingPurchase() {
  const queryClient = useQueryClient();
  const orgId = usePurchasesOrgId();
  const invalidate = useInvalidatePurchases();

  const mutation = useMutation({
    mutationFn: (args: UpdatePendingPurchaseArgs) => updatePendingPurchase(args),
    onSuccess: async () => {
      invalidate();
      void queryClient.invalidateQueries({ queryKey: ["purchase-items"] });
    },
  });

  return {
    updatePendingPurchase: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  };
}

export function useReceivePurchase() {
  const queryClient = useQueryClient();
  const orgId = usePurchasesOrgId();
  const invalidate = useInvalidatePurchases();

  const mutation = useMutation({
    mutationFn: (args: ReceivePurchaseArgs) => receivePurchase(args),
    onSuccess: async () => {
      invalidate();
      void queryClient.invalidateQueries({ queryKey: ["purchase-items"] });
      await refetchProductsIfNeeded(queryClient, orgId, true);
    },
  });

  return {
    receivePurchase: mutation.mutateAsync,
    isReceiving: mutation.isPending,
  };
}

export function useUpdateReceivedPurchase() {
  const queryClient = useQueryClient();
  const orgId = usePurchasesOrgId();
  const invalidate = useInvalidatePurchases();

  const mutation = useMutation({
    mutationFn: (args: UpdateReceivedPurchaseArgs) => updateReceivedPurchase(args),
    onSuccess: async () => {
      invalidate();
      void queryClient.invalidateQueries({ queryKey: ["purchase-items"] });
      await refetchProductsIfNeeded(queryClient, orgId, true);
    },
  });

  return {
    updateReceivedPurchase: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  };
}

export function useCancelPendingPurchase() {
  const queryClient = useQueryClient();
  const orgId = usePurchasesOrgId();
  const invalidate = useInvalidatePurchases();

  const mutation = useMutation({
    mutationFn: (id: string) => cancelPendingPurchase(id),
    onSuccess: async () => {
      invalidate();
      void queryClient.invalidateQueries({ queryKey: ["purchase-items"] });
    },
  });

  return {
    cancelPendingPurchase: mutation.mutateAsync,
    isCancelling: mutation.isPending,
  };
}

export function usePurchasesPaginated(
  page: number,
  pageSize: number,
  filters?: PurchasesListFilters
) {
  const { userId, sessionReady } = useAuthUserId();
  const orgId = usePurchasesOrgId();

  const query = useQuery({
    queryKey: orgId
      ? purchasesKeys.paginated(orgId, page, pageSize, filters)
      : ["purchases", "paginated", "idle"],
    queryFn: () => listPurchasesPaginated(orgId!, page, pageSize, filters),
    enabled: sessionReady && !!userId && !!orgId,
    placeholderData: (prev) => prev,
  });

  return {
    result: query.data,
    isLoading: query.isPending && !query.data,
    isPageLoading: query.isFetching && (query.isPlaceholderData || !query.data),
    isRefreshing: query.isFetching && !!query.data && !query.isPlaceholderData,
    isFetching: query.isFetching,
  };
}
