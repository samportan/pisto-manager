"use client";

import * as React from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/client";
import {
  createTransaction,
  deleteTransaction,
  getTransactionsByUserId,
  updateTransaction,
  type NewTransaction,
  type NewTransactionFormValues,
  type Transaction,
  type TransactionUpdate,
} from "@/lib/db/transactions";
import { financialSummaryKeys } from "@/lib/financial-summary";
import { isSupabaseConfigured } from "@/lib/supabase-config";

export const transactionKeys = {
  all: (userId: string) => ["transactions", userId] as const,
};

export type UseTransactionsResult = {
  transactions: Transaction[];
  isLoading: boolean;
  isSessionReady: boolean;
  userId: string | null;
  error: Error | null;
  refetch: () => Promise<unknown>;
  createTransaction: (values: NewTransactionFormValues) => Promise<Transaction | null>;
  updateTransaction: (
    id: string,
    values: NewTransactionFormValues
  ) => Promise<Transaction | null>;
  deleteTransaction: (id: string) => Promise<void>;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  createError: Error | null;
  updateError: Error | null;
  deleteError: Error | null;
};

export function useTransactions(): UseTransactionsResult {
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
    queryKey: userId ? transactionKeys.all(userId) : ["transactions", "idle"],
    queryFn: async () => {
      const rows = await getTransactionsByUserId(userId!);
      return rows ?? [];
    },
    enabled,
  });

  const invalidateTx = () => {
    if (userId) {
      void queryClient.invalidateQueries({ queryKey: transactionKeys.all(userId) });
      void queryClient.invalidateQueries({
        queryKey: financialSummaryKeys.all(userId),
      });
    }
  };

  const createMutation = useMutation({
    mutationFn: (payload: NewTransaction) => createTransaction(payload),
    onSuccess: () => invalidateTx(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TransactionUpdate }) => {
      if (!userId) throw new Error("You must be signed in to update a transaction.");
      return updateTransaction(id, userId, patch);
    },
    onSuccess: () => invalidateTx(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      if (!userId) throw new Error("You must be signed in to delete a transaction.");
      return deleteTransaction(id, userId);
    },
    onSuccess: () => invalidateTx(),
  });

  const create = React.useCallback(
    async (values: NewTransactionFormValues) => {
      if (!userId) {
        throw new Error("You must be signed in to add a transaction.");
      }
      const payload: NewTransaction = {
        user_id: userId,
        account_id: values.account_id,
        category_id: values.category_id,
        type: values.type,
        amount: values.amount,
        date: values.date,
        destination_account_id: values.destination_account_id,
        description: values.description,
      };
      return createMutation.mutateAsync(payload);
    },
    [userId, createMutation]
  );

  const update = React.useCallback(
    async (id: string, values: NewTransactionFormValues) => {
      const patch: TransactionUpdate = {
        account_id: values.account_id,
        category_id: values.category_id,
        type: values.type,
        amount: values.amount,
        date: values.date,
        destination_account_id: values.destination_account_id,
        description: values.description,
      };
      return updateMutation.mutateAsync({ id, patch });
    },
    [updateMutation]
  );

  const remove = React.useCallback(
    async (id: string) => {
      await deleteMutation.mutateAsync(id);
    },
    [deleteMutation]
  );

  const isLoading =
    !sessionReady || (enabled && query.isLoading);

  return {
    transactions: query.data ?? [],
    isLoading,
    isSessionReady: sessionReady,
    userId,
    error: query.error as Error | null,
    refetch: query.refetch,
    createTransaction: create,
    updateTransaction: update,
    deleteTransaction: remove,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    createError: createMutation.error as Error | null,
    updateError: updateMutation.error as Error | null,
    deleteError: deleteMutation.error as Error | null,
  };
}

export type { NewTransactionFormValues };
