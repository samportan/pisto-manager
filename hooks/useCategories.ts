"use client";

import * as React from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/client";
import {
  createCategory,
  getCategoriesByUserId,
  type NewCategory,
  type NewCategoryFormValues,
} from "@/lib/db/categories";
import { isSupabaseConfigured } from "@/lib/supabase-config";

export const categoryKeys = {
  all: (userId: string) => ["categories", userId] as const,
};

export function useCategories() {
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
    queryKey: userId ? categoryKeys.all(userId) : ["categories", "idle"],
    queryFn: async () => {
      const rows = await getCategoriesByUserId(userId!);
      return rows ?? [];
    },
    enabled,
  });

  const createMutation = useMutation({
    mutationFn: (payload: NewCategory) => createCategory(payload),
    onSuccess: () => {
      if (userId) {
        void queryClient.invalidateQueries({ queryKey: categoryKeys.all(userId) });
      }
    },
  });

  const create = React.useCallback(
    async (values: NewCategoryFormValues) => {
      if (!userId) {
        throw new Error("You must be signed in to create a category.");
      }
      const payload: NewCategory = {
        user_id: userId,
        name: values.name.trim(),
        type: values.type,
        parent_category_id: null,
        icon: null,
        color: values.color,
      };
      return createMutation.mutateAsync(payload);
    },
    [userId, createMutation]
  );

  const isLoading =
    !sessionReady || (enabled && query.isLoading);

  return {
    categories: query.data ?? [],
    isLoading,
    isSessionReady: sessionReady,
    userId,
    error: query.error as Error | null,
    refetch: query.refetch,
    createCategory: create,
    isCreating: createMutation.isPending,
    createError: createMutation.error as Error | null,
  };
}

export type { NewCategoryFormValues } from "@/lib/db/categories";
