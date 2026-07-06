"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

export function useProducts(opts?: ListProductsOptions) {
  const queryClient = useQueryClient();
  const { userId, sessionReady } = useAuthUserId();
  const { activeOrg, activeOrgId } = useActiveOrganization();
  const includeDeleted = opts?.includeDeleted ?? false;
  const orgId = activeOrg.kind === "business" ? activeOrgId : null;

  const query = useQuery({
    queryKey: orgId ? productKeys.all(orgId, opts) : ["products", "idle"],
    queryFn: () => getProductsByOrgId(orgId!, { includeDeleted }),
    enabled: sessionReady && !!userId && !!orgId,
  });

  const invalidate = async () => {
    if (orgId) await queryClient.invalidateQueries({ queryKey: ["products", orgId] });
  };

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
    isLoading: !sessionReady || query.isLoading,
    createProduct: createMutation.mutateAsync,
    updateProduct: updateMutation.mutateAsync,
    deleteProduct: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
