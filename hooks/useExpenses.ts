"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createExpense,
  deleteExpense,
  getExpensesByOrgId,
  updateExpense,
  type ListExpensesOptions,
  type NewExpense,
} from "@/lib/db/expenses";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";
import { useAuthUserId } from "@/hooks/useAuthUserId";

export const expenseKeys = {
  all: (orgId: string, opts?: ListExpensesOptions) =>
    ["expenses", orgId, opts?.includeDeleted ? "with-deleted" : "active"] as const,
};

type ExpenseFormValues = Omit<NewExpense, "user_id" | "organization_id">;

function useExpensesOrgId() {
  const { activeOrg, activeOrgId } = useActiveOrganization();
  return activeOrg.kind === "business" ? activeOrgId : null;
}

export function useExpenses(opts?: ListExpensesOptions) {
  const queryClient = useQueryClient();
  const { userId, sessionReady } = useAuthUserId();
  const includeDeleted = opts?.includeDeleted ?? false;
  const orgId = useExpensesOrgId();

  const query = useQuery({
    queryKey: orgId ? expenseKeys.all(orgId, opts) : ["expenses", "idle"],
    queryFn: () => getExpensesByOrgId(orgId!, { includeDeleted }),
    enabled: sessionReady && !!userId && !!orgId,
  });

  const invalidate = () => {
    if (!orgId) return;
    void queryClient.invalidateQueries({ queryKey: ["expenses", orgId] });
    void queryClient.invalidateQueries({ queryKey: ["business-overview", orgId] });
  };

  const createMutation = useMutation({
    mutationFn: async (payload: ExpenseFormValues) => {
      if (!userId || !orgId) throw new Error("Must sign in and select a business.");
      return createExpense({ ...payload, user_id: userId, organization_id: orgId });
    },
    onSuccess: () => invalidate(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<ExpenseFormValues> }) =>
      updateExpense(id, patch),
    onSuccess: () => invalidate(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: () => invalidate(),
  });

  return {
    expenses: query.data ?? [],
    isLoading: query.isPending && !query.data,
    isFetching: query.isFetching,
    createExpense: createMutation.mutateAsync,
    updateExpense: updateMutation.mutateAsync,
    deleteExpense: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
