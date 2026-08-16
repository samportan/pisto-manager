"use client";

import { useQuery } from "@tanstack/react-query";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";
import { useAuthUserId } from "@/hooks/useAuthUserId";
import type { InsightsPeriod } from "@/lib/analytics/shared";
import {
  fetchBusinessOverview,
  fetchProductInsights,
  fetchSaleInsights,
} from "@/lib/db/analytics";

export const businessAnalyticsKeys = {
  overview: (orgId: string, period: InsightsPeriod) =>
    ["business-overview", orgId, period] as const,
  saleInsights: (orgId: string, period: InsightsPeriod) =>
    ["sale-insights", orgId, period] as const,
  productInsights: (orgId: string, period: InsightsPeriod) =>
    ["product-insights-agg", orgId, period] as const,
};

function useBusinessOrgId() {
  const { activeOrg, activeOrgId } = useActiveOrganization();
  return activeOrg.kind === "business" ? activeOrgId : null;
}

export function useBusinessOverview(period: InsightsPeriod = "this_month") {
  const { userId, sessionReady } = useAuthUserId();
  const orgId = useBusinessOrgId();

  const query = useQuery({
    queryKey: orgId
      ? businessAnalyticsKeys.overview(orgId, period)
      : ["business-overview", "idle"],
    queryFn: () => fetchBusinessOverview(orgId!, period),
    enabled: sessionReady && !!userId && !!orgId,
    placeholderData: (previous) => previous,
  });

  return {
    data: query.data,
    isLoading: query.isPending && !query.data,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useSaleInsights(period: InsightsPeriod, walkInLabel: string) {
  const { userId, sessionReady } = useAuthUserId();
  const orgId = useBusinessOrgId();

  const query = useQuery({
    queryKey: orgId
      ? businessAnalyticsKeys.saleInsights(orgId, period)
      : ["sale-insights", "idle"],
    queryFn: () => fetchSaleInsights(orgId!, period, walkInLabel),
    enabled: sessionReady && !!userId && !!orgId,
    placeholderData: (previous) => previous,
  });

  return {
    data: query.data,
    isLoading: query.isPending && !query.data,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useProductInsightsAgg(period: InsightsPeriod) {
  const { userId, sessionReady } = useAuthUserId();
  const orgId = useBusinessOrgId();

  const query = useQuery({
    queryKey: orgId
      ? businessAnalyticsKeys.productInsights(orgId, period)
      : ["product-insights-agg", "idle"],
    queryFn: () => fetchProductInsights(orgId!, period),
    enabled: sessionReady && !!userId && !!orgId,
    placeholderData: (previous) => previous,
  });

  return {
    data: query.data,
    isLoading: query.isPending && !query.data,
    error: query.error,
    refetch: query.refetch,
  };
}
