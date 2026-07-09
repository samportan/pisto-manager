"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getSalePaymentsByOrgId,
  getSalePaymentsBySaleId,
  recordSalePayment,
} from "@/lib/db/sale-payments";
import type { PaymentMethod } from "@/lib/db/sales";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";
import { useAuthUserId } from "@/hooks/useAuthUserId";

export const salePaymentKeys = {
  bySale: (saleId: string) => ["sale-payments", saleId] as const,
  byOrg: (orgId: string, dateFrom?: string, dateTo?: string) =>
    ["sale-payments", "org", orgId, dateFrom, dateTo] as const,
};

function useSalePaymentsOrgId() {
  const { activeOrg, activeOrgId } = useActiveOrganization();
  return activeOrg.kind === "business" ? activeOrgId : null;
}

export function useSalePayments(saleId: string | null) {
  const { userId, sessionReady } = useAuthUserId();

  const query = useQuery({
    queryKey: saleId ? salePaymentKeys.bySale(saleId) : ["sale-payments", "idle"],
    queryFn: () => getSalePaymentsBySaleId(saleId!),
    enabled: sessionReady && !!userId && !!saleId,
  });

  return {
    payments: query.data ?? [],
    isLoading: query.isPending && !query.data,
  };
}

export function useOrgSalePayments(dateFrom?: string, dateTo?: string) {
  const { userId, sessionReady } = useAuthUserId();
  const orgId = useSalePaymentsOrgId();

  const query = useQuery({
    queryKey: orgId
      ? salePaymentKeys.byOrg(orgId, dateFrom, dateTo)
      : ["sale-payments", "org", "idle"],
    queryFn: () => getSalePaymentsByOrgId(orgId!, dateFrom, dateTo),
    enabled: sessionReady && !!userId && !!orgId,
  });

  return {
    payments: query.data ?? [],
    isLoading: query.isPending && !query.data,
  };
}

export function useRecordSalePayment() {
  const queryClient = useQueryClient();
  const orgId = useSalePaymentsOrgId();

  const mutation = useMutation({
    mutationFn: async (args: {
      sale_id: string;
      amount: number;
      payment_method: PaymentMethod;
      date?: string;
      notes?: string | null;
    }) => recordSalePayment(args),
    onSuccess: async (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: salePaymentKeys.bySale(variables.sale_id),
      });
      if (orgId) {
        void queryClient.invalidateQueries({ queryKey: ["sales", orgId] });
        void queryClient.invalidateQueries({ queryKey: ["customer-balances", orgId] });
      }
    },
  });

  return {
    recordPayment: mutation.mutateAsync,
    isRecording: mutation.isPending,
  };
}
