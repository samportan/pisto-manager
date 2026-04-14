"use client";

import * as React from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/client";
import {
  createBudget,
  deleteBudget,
  getBudgetsByUserId,
  updateBudget,
  type Budget,
  type BudgetFormValues,
  type BudgetWithCategory,
  type NewBudget,
} from "@/lib/db/budgets";
import { isSupabaseConfigured } from "@/lib/supabase-config";

export const budgetKeys = {
  all: (userId: string) => ["budgets", userId] as const,
};

export function useBudgets() {
  const queryClient = useQueryClient();
  const [userId, setUserId] = React.useState<string | null>(null);
  const [sessionReady, setSessionReady] = React.useState(false);
  const fetchSeq = React.useRef(0);

  React.useEffect(() => {
    if (!isSupabaseConfigured()) {
      setSessionReady(true);
      return;
    }

    const supabase = createClient();
    const seq = ++fetchSeq.current;

    void supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      if (seq !== fetchSeq.current) return;
      setUserId(data.session?.user?.id ?? null);
      setSessionReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setUserId(session?.user?.id ?? null);
      }
    );

    return () => {
      fetchSeq.current += 1;
      subscription.unsubscribe();
    };
  }, []);

  const enabled =
    isSupabaseConfigured() && sessionReady && userId !== null;

  const query = useQuery({
    queryKey: userId ? budgetKeys.all(userId) : ["budgets", "idle"],
    queryFn: async () => {
      const rows = await getBudgetsByUserId(userId!);
      return rows ?? [];
    },
    enabled,
  });

  const invalidate = React.useCallback(() => {
    if (userId) {
      void queryClient.invalidateQueries({ queryKey: budgetKeys.all(userId) });
    }
  }, [queryClient, userId]);

  const createMutation = useMutation({
    mutationFn: (payload: NewBudget) => createBudget(payload),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<
        Pick<Budget, "amount" | "period" | "start_date" | "end_date" | "category_id">
      >;
    }) => updateBudget(id, patch),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBudget(id),
    onSuccess: invalidate,
  });

  const create = React.useCallback(
    async (values: BudgetFormValues) => {
      if (!userId) {
        throw new Error("You must be signed in to create a budget.");
      }
      const payload: NewBudget = {
        user_id: userId,
        category_id: values.category_id,
        amount: values.amount,
        period: values.period,
        start_date: values.start_date,
        end_date: values.end_date,
      };
      return createMutation.mutateAsync(payload);
    },
    [userId, createMutation]
  );

  const update = React.useCallback(
    async (
      id: string,
      values: BudgetFormValues
    ) => {
      return updateMutation.mutateAsync({
        id,
        patch: {
          category_id: values.category_id,
          amount: values.amount,
          period: values.period,
          start_date: values.start_date,
          end_date: values.end_date,
        },
      });
    },
    [updateMutation]
  );

  const remove = React.useCallback(
    async (id: string) => deleteMutation.mutateAsync(id),
    [deleteMutation]
  );

  const isLoading =
    !sessionReady || (enabled && query.isLoading);

  return {
    budgets: query.data ?? ([] as BudgetWithCategory[]),
    isLoading,
    isSessionReady: sessionReady,
    userId,
    error: query.error as Error | null,
    refetch: query.refetch,
    createBudget: create,
    updateBudget: update,
    deleteBudget: remove,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    createError: createMutation.error as Error | null,
    updateError: updateMutation.error as Error | null,
    deleteError: deleteMutation.error as Error | null,
  };
}

export type { BudgetFormValues, BudgetWithCategory } from "@/lib/db/budgets";
