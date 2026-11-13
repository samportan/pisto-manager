"use client";

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import {
  createProduct,
  deleteProduct,
  getProductsByOrgId,
  updateProduct,
  type ListProductsOptions,
  type NewProduct,
} from "@/lib/db/products";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";
import { useAuthUserId } from "@/hooks/useAuthUserId";

export const productKeys = {
  all: (orgId: string, opts?: ListProductsOptions) =>
    ["products", orgId, opts?.includeDeleted ? "with-deleted" : "active"] as const,
};

type ProductFormValues = Omit<NewProduct, "user_id" | "organization_id">;

/**
 * Everything that shows on-hand stock: product lists (active and with deleted),
 * per-product movement history, dashboard low-stock and product insights.
 * Call after any sale, purchase, adjustment or product change.
 */
export async function refreshStockQueries(queryClient: QueryClient, orgId: string | null) {
  if (!orgId) return;
  void queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
  void queryClient.invalidateQueries({ queryKey: ["business-overview", orgId] });
  void queryClient.invalidateQueries({ queryKey: ["product-insights-agg", orgId] });
  await queryClient.invalidateQueries({ queryKey: ["products", orgId], refetchType: "all" });
}

export function useProducts(opts?: ListProductsOptions & { fresh?: boolean }) {
  const queryClient = useQueryClient();
  const { userId, sessionReady } = useAuthUserId();
  const { activeOrg, activeOrgId } = useActiveOrganization();
  const includeDeleted = opts?.includeDeleted ?? false;
  const orgId = activeOrg.kind === "business" ? activeOrgId : null;

  const query = useQuery({
    queryKey: orgId ? productKeys.all(orgId, opts) : ["products", "idle"],
    queryFn: () => getProductsByOrgId(orgId!, { includeDeleted }),
    enabled: sessionReady && !!userId && !!orgId,
    // Sale / purchase forms validate against stock: never start them from a stale list.
    refetchOnMount: opts?.fresh ? "always" : true,
  });

  const invalidate = () => refreshStockQueries(queryClient, orgId);

  const createMutation = useMutation({
    mutationFn: async (payload: ProductFormValues) => {
      if (!userId || !orgId) throw new Error("Must sign in and select a business.");
      return createProduct({ ...payload, user_id: userId, organization_id: orgId });
    },
    onSuccess: () => void invalidate(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<ProductFormValues> }) =>
      updateProduct(id, patch),
    onSuccess: () => void invalidate(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => void invalidate(),
  });

  return {
    products: query.data ?? [],
    isLoading: query.isPending && !query.data,
    isFetching: query.isFetching,
    createProduct: createMutation.mutateAsync,
    updateProduct: updateMutation.mutateAsync,
    deleteProduct: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
