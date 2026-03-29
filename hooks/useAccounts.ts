"use client";

import * as React from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/client";
import {
  createAccount,
  creditFieldsForAccountType,
  getAccountsByUserId,
  type Account,
  type NewAccount,
  type NewAccountFormValues,
} from "@/lib/db/accounts";
import { isSupabaseConfigured } from "@/lib/supabase-config";

export const accountKeys = {
  all: (userId: string) => ["accounts", userId] as const,
};

export type UseAccountsResult = {
  accounts: Account[];
  isLoading: boolean;
  isSessionReady: boolean;
  userId: string | null;
  error: Error | null;
  refetch: () => Promise<unknown>;
  createAccount: (values: NewAccountFormValues) => Promise<Account | null>;
  isCreating: boolean;
  createError: Error | null;
};

export function useAccounts(): UseAccountsResult {
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
    queryKey: userId ? accountKeys.all(userId) : ["accounts", "idle"],
    queryFn: async () => {
      const rows = await getAccountsByUserId(userId!);
      return rows ?? [];
    },
    enabled,
  });

  const createMutation = useMutation({
    mutationFn: (payload: NewAccount) => createAccount(payload),
    onSuccess: () => {
      if (userId) {
        void queryClient.invalidateQueries({ queryKey: accountKeys.all(userId) });
      }
    },
  });

  const create = React.useCallback(
    async (values: NewAccountFormValues) => {
      if (!userId) {
        throw new Error("You must be signed in to create an account.");
      }
      const payload: NewAccount = {
        user_id: userId,
        name: values.name,
        type: values.type,
        balance: values.balance,
        color: values.color,
        is_active: values.is_active,
        ...creditFieldsForAccountType(values.type, {
          credit_limit: values.credit_limit,
          interest_rate: values.interest_rate,
          minimum_payment: values.minimum_payment,
          billing_cycle: values.billing_cycle,
          due_date: values.due_date,
        }),
      };
      return createMutation.mutateAsync(payload);
    },
    [userId, createMutation]
  );

  const isLoading =
    !sessionReady || (enabled && query.isLoading);

  return {
    accounts: query.data ?? [],
    isLoading,
    isSessionReady: sessionReady,
    userId,
    error: query.error as Error | null,
    refetch: query.refetch,
    createAccount: create,
    isCreating: createMutation.isPending,
    createError: createMutation.error as Error | null,
  };
}
