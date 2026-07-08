"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSaleWithItems,
  getSalesByOrgId,
  listSalesPaginated,
  softDeleteSale,
  type ListSalesOptions,
  type PaymentMethod,
  type SaleLineInput,
  type SalesListFilters,
} from "@/lib/db/sales";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";
import { useAuthUserId } from "@/hooks/useAuthUserId";
import { productKeys } from "@/hooks/useProducts";

export const salesKeys = {
  all: (orgId: string, opts?: ListSalesOptions) =>
    ["sales", orgId, opts?.includeDeleted ? "with-deleted" : "active"] as const,
  paginated: (orgId: string, page: number, pageSize: number, filters?: SalesListFilters) =>
    ["sales", orgId, "paginated", page, pageSize, filters] as const,
};

function useSalesOrgId() {
  const { activeOrg, activeOrgId } = useActiveOrganization();
  const orgId = activeOrg.kind === "business" ? activeOrgId : null;
  return orgId;
}

function useInvalidateSales() {
  const queryClient = useQueryClient();
  const orgId = useSalesOrgId();

  return () => {
    if (!orgId) return;
    void queryClient.invalidateQueries({ queryKey: ["sales", orgId] });
  };
}

export function useSales(opts?: ListSalesOptions) {
  const queryClient = useQueryClient();
  const { userId, sessionReady } = useAuthUserId();
  const includeDeleted = opts?.includeDeleted ?? false;
  const orgId = useSalesOrgId();
  const invalidate = useInvalidateSales();

  const query = useQuery({
    queryKey: orgId ? salesKeys.all(orgId, opts) : ["sales", "idle"],
    queryFn: () => getSalesByOrgId(orgId!, { includeDeleted }),
    enabled: sessionReady && !!userId && !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: {
      customer_id: string | null;
      date: string;
      notes: string | null;
      payment_method: PaymentMethod;
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
    isLoading: query.isPending && !query.data,
    isFetching: query.isFetching,
    createSaleWithItems: createMutation.mutateAsync,
    deleteSale: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function useDeleteSale() {
  const queryClient = useQueryClient();
  const orgId = useSalesOrgId();
  const invalidate = useInvalidateSales();

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
    deleteSale: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}

export function useSalesPaginated(
  page: number,
  pageSize: number,
  filters?: SalesListFilters
) {
  const { userId, sessionReady } = useAuthUserId();
  const orgId = useSalesOrgId();

  const query = useQuery({
    queryKey: orgId
      ? salesKeys.paginated(orgId, page, pageSize, filters)
      : ["sales", "paginated", "idle"],
    queryFn: () => listSalesPaginated(orgId!, page, pageSize, filters),
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
