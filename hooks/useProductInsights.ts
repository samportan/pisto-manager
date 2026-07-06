"use client";

import { useQuery } from "@tanstack/react-query";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";
import { useAuthUserId } from "@/hooks/useAuthUserId";
import { getSaleItemsForInsightsByOrgId } from "@/lib/db/product-insights";

export const productInsightKeys = {
  byOrg: (orgId: string) => ["product-insights", orgId] as const,
};

export function useProductInsights() {
  const { sessionReady, userId } = useAuthUserId();
  const { activeOrg, activeOrgId } = useActiveOrganization();
  const enabled =
    sessionReady && !!userId && activeOrg.kind === "business" && !!activeOrgId;

  const query = useQuery({
    queryKey: activeOrgId ? productInsightKeys.byOrg(activeOrgId) : ["product-insights", "none"],
    queryFn: () => getSaleItemsForInsightsByOrgId(activeOrgId!),
    enabled,
  });

  return {
    saleItems: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
