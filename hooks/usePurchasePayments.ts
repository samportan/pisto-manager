"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getPurchasePaymentsByOrgId,
  getPurchasePaymentsByPurchaseId,
  recordPurchasePayment,
} from "@/lib/db/purchase-payments";
import type { PurchasePaymentMethod } from "@/lib/db/purchases";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";
import { useAuthUserId } from "@/hooks/useAuthUserId";

export const purchasePaymentKeys = {
  byPurchase: (purchaseId: string) => ["purchase-payments", purchaseId] as const,
  byOrg: (orgId: string, dateFrom?: string, dateTo?: string) =>
    ["purchase-payments", "org", orgId, dateFrom, dateTo] as const,
};

function usePurchasePaymentsOrgId() {
  const { activeOrg, activeOrgId } = useActiveOrganization();
  return activeOrg.kind === "business" ? activeOrgId : null;
}

export function usePurchasePayments(purchaseId: string | null) {
  const { userId, sessionReady } = useAuthUserId();

  const query = useQuery({
    queryKey: purchaseId
      ? purchasePaymentKeys.byPurchase(purchaseId)
      : ["purchase-payments", "idle"],
    queryFn: () => getPurchasePaymentsByPurchaseId(purchaseId!),
    enabled: sessionReady && !!userId && !!purchaseId,
  });

  return {
    payments: query.data ?? [],
    isLoading: query.isPending && !query.data,
  };
}

export function useOrgPurchasePayments(dateFrom?: string, dateTo?: string) {
  const { userId, sessionReady } = useAuthUserId();
  const orgId = usePurchasePaymentsOrgId();

  const query = useQuery({
    queryKey: orgId
      ? purchasePaymentKeys.byOrg(orgId, dateFrom, dateTo)
      : ["purchase-payments", "org", "idle"],
    queryFn: () => getPurchasePaymentsByOrgId(orgId!, dateFrom, dateTo),
    enabled: sessionReady && !!userId && !!orgId,
  });

  return {
    payments: query.data ?? [],
    isLoading: query.isPending && !query.data,
  };
}

export function useRecordPurchasePayment() {
  const queryClient = useQueryClient();
  const orgId = usePurchasePaymentsOrgId();

  const mutation = useMutation({
    mutationFn: async (args: {
      purchase_id: string;
      amount: number;
      payment_method: PurchasePaymentMethod;
      date?: string;
      notes?: string | null;
    }) => recordPurchasePayment(args),
    onSuccess: async (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: purchasePaymentKeys.byPurchase(variables.purchase_id),
      });
      if (orgId) {
        void queryClient.invalidateQueries({ queryKey: ["purchases", orgId] });
      }
    },
  });

  return {
    recordPayment: mutation.mutateAsync,
    isRecording: mutation.isPending,
  };
}
