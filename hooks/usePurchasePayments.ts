"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getOpenPurchasesBySupplier,
  getPurchasePaymentsByOrgId,
  getPurchasePaymentsByPurchaseId,
  getSupplierBalances,
  recordPurchasePayment,
  recordSupplierPayment,
} from "@/lib/db/purchase-payments";
import type { PurchasePaymentMethod } from "@/lib/db/purchases";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";
import { useAuthUserId } from "@/hooks/useAuthUserId";

export const purchasePaymentKeys = {
  byPurchase: (purchaseId: string) => ["purchase-payments", purchaseId] as const,
  byOrg: (orgId: string, dateFrom?: string, dateTo?: string) =>
    ["purchase-payments", "org", orgId, dateFrom, dateTo] as const,
};

export const supplierBalanceKeys = {
  all: (orgId: string) => ["supplier-balances", orgId] as const,
  openBySupplier: (orgId: string, supplierId: string) =>
    ["supplier-balances", orgId, "open", supplierId] as const,
};

/** Payables changed: purchase lists, supplier balances, dashboard cash. */
function invalidatePayables(
  queryClient: ReturnType<typeof useQueryClient>,
  orgId: string | null
) {
  if (!orgId) return;
  void queryClient.invalidateQueries({ queryKey: ["purchases", orgId] });
  void queryClient.invalidateQueries({ queryKey: ["purchase-payments", "org", orgId] });
  void queryClient.invalidateQueries({ queryKey: supplierBalanceKeys.all(orgId) });
  void queryClient.invalidateQueries({ queryKey: ["business-overview", orgId] });
}

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
      invalidatePayables(queryClient, orgId);
    },
  });

  return {
    recordPayment: mutation.mutateAsync,
    isRecording: mutation.isPending,
  };
}

export function useSupplierBalances() {
  const { userId, sessionReady } = useAuthUserId();
  const orgId = usePurchasePaymentsOrgId();

  const query = useQuery({
    queryKey: orgId ? supplierBalanceKeys.all(orgId) : ["supplier-balances", "idle"],
    queryFn: () => getSupplierBalances(orgId!),
    enabled: sessionReady && !!userId && !!orgId,
  });

  return {
    balances: query.data ?? [],
    balanceBySupplier: new Map((query.data ?? []).map((b) => [b.supplier_id, b])),
    isLoading: query.isPending && !query.data,
  };
}

export function useOpenPurchasesBySupplier(supplierId: string | null) {
  const { userId, sessionReady } = useAuthUserId();
  const orgId = usePurchasePaymentsOrgId();

  const query = useQuery({
    queryKey:
      orgId && supplierId
        ? supplierBalanceKeys.openBySupplier(orgId, supplierId)
        : ["supplier-balances", "open", "idle"],
    queryFn: () => getOpenPurchasesBySupplier(orgId!, supplierId!),
    enabled: sessionReady && !!userId && !!orgId && !!supplierId,
  });

  return {
    purchases: query.data ?? [],
    isLoading: query.isPending && !query.data,
  };
}

export function useRecordSupplierPayment() {
  const queryClient = useQueryClient();
  const orgId = usePurchasePaymentsOrgId();

  const mutation = useMutation({
    mutationFn: async (args: {
      supplier_id: string;
      amount: number;
      payment_method: PurchasePaymentMethod;
      purchase_ids?: string[] | null;
      date?: string;
      notes?: string | null;
    }) => {
      if (!orgId) throw new Error("Must select a business organization.");
      return recordSupplierPayment({ ...args, organization_id: orgId });
    },
    onSuccess: (result) => {
      invalidatePayables(queryClient, orgId);
      for (const alloc of result.allocations) {
        void queryClient.invalidateQueries({
          queryKey: purchasePaymentKeys.byPurchase(alloc.purchase_id),
        });
      }
    },
  });

  return {
    recordSupplierPayment: mutation.mutateAsync,
    isRecording: mutation.isPending,
  };
}
