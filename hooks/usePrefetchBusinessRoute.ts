"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { contactKeys } from "@/hooks/useContacts";
import { expenseKeys } from "@/hooks/useExpenses";
import { productKeys } from "@/hooks/useProducts";
import { purchasesKeys } from "@/hooks/usePurchases";
import { salesKeys } from "@/hooks/useSales";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";
import { useAuthUserId } from "@/hooks/useAuthUserId";
import { getContactsByOrgId } from "@/lib/db/contacts";
import { getExpensesByOrgId } from "@/lib/db/expenses";
import { listPurchasesPaginated } from "@/lib/db/purchases";
import { getProductsByOrgId } from "@/lib/db/products";
import { listSalesPaginated } from "@/lib/db/sales";

export function usePrefetchBusinessRoute() {
  const queryClient = useQueryClient();
  const { userId, sessionReady } = useAuthUserId();
  const { activeOrg, activeOrgId } = useActiveOrganization();
  const orgId = activeOrg.kind === "business" ? activeOrgId : null;

  return useCallback(
    (href: string) => {
      if (!sessionReady || !userId || !orgId) return;

      if (href === "/dashboard/business/products") {
        void queryClient.prefetchQuery({
          queryKey: productKeys.all(orgId),
          queryFn: () => getProductsByOrgId(orgId),
        });
        return;
      }

      if (href === "/dashboard/business/contacts") {
        void queryClient.prefetchQuery({
          queryKey: contactKeys.all(orgId),
          queryFn: () => getContactsByOrgId(orgId),
        });
        return;
      }

      if (href === "/dashboard/business/sales") {
        void queryClient.prefetchQuery({
          queryKey: salesKeys.paginated(orgId, 1, 10, undefined),
          queryFn: () => listSalesPaginated(orgId, 1, 10, undefined),
        });
        void queryClient.prefetchQuery({
          queryKey: contactKeys.all(orgId),
          queryFn: () => getContactsByOrgId(orgId),
        });
        return;
      }

      if (href === "/dashboard/business/purchases") {
        void queryClient.prefetchQuery({
          queryKey: purchasesKeys.paginated(orgId, 1, 10, undefined),
          queryFn: () => listPurchasesPaginated(orgId, 1, 10, undefined),
        });
        void queryClient.prefetchQuery({
          queryKey: contactKeys.all(orgId),
          queryFn: () => getContactsByOrgId(orgId),
        });
        return;
      }

      if (href === "/dashboard/business/expenses") {
        void queryClient.prefetchQuery({
          queryKey: expenseKeys.all(orgId),
          queryFn: () => getExpensesByOrgId(orgId),
        });
      }
    },
    [orgId, queryClient, sessionReady, userId]
  );
}
