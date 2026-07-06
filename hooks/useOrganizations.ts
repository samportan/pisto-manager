"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createOrganization, getOrganizationsForUser, type NewOrganization } from "@/lib/db/organizations";
import { useAuthUserId } from "@/hooks/useAuthUserId";

export const organizationKeys = {
  all: (userId: string) => ["organizations", userId] as const,
};

export function useOrganizations() {
  const queryClient = useQueryClient();
  const { userId, sessionReady } = useAuthUserId();

  const query = useQuery({
    queryKey: userId ? organizationKeys.all(userId) : ["organizations", "idle"],
    queryFn: async () => {
      const rows = await getOrganizationsForUser(userId!);
      return rows.map((row) => ({
        ...row.organizations!,
        role: row.role,
      }));
    },
    enabled: sessionReady && !!userId,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: Omit<NewOrganization, "owner_user_id">) => {
      if (!userId) throw new Error("Must sign in first.");
      return createOrganization({ ...payload, owner_user_id: userId });
    },
    onSuccess: () => {
      if (userId) {
        void queryClient.invalidateQueries({ queryKey: organizationKeys.all(userId) });
      }
    },
  });

  return {
    organizations: query.data ?? [],
    isLoading: !sessionReady || query.isLoading,
    userId,
    createOrganization: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error as Error | null,
  };
}
