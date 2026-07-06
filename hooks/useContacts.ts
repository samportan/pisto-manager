"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContact,
  deleteContact,
  getContactsByOrgId,
  updateContact,
  type ListContactsOptions,
  type NewContact,
} from "@/lib/db/contacts";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";
import { useAuthUserId } from "@/hooks/useAuthUserId";

const contactKeys = {
  all: (orgId: string, opts?: ListContactsOptions) =>
    ["contacts", orgId, opts?.includeDeleted ? "with-deleted" : "active"] as const,
};

type ContactFormValues = Omit<NewContact, "user_id" | "organization_id">;

export function useContacts(opts?: ListContactsOptions) {
  const queryClient = useQueryClient();
  const { userId, sessionReady } = useAuthUserId();
  const { activeOrg, activeOrgId } = useActiveOrganization();
  const includeDeleted = opts?.includeDeleted ?? false;
  const orgId = activeOrg.kind === "business" ? activeOrgId : null;

  const query = useQuery({
    queryKey: orgId ? contactKeys.all(orgId, opts) : ["contacts", "idle"],
    queryFn: () => getContactsByOrgId(orgId!, { includeDeleted }),
    enabled: sessionReady && !!userId && !!orgId,
  });

  const invalidate = () => {
    if (orgId) void queryClient.invalidateQueries({ queryKey: ["contacts", orgId] });
  };

  const createMutation = useMutation({
    mutationFn: async (payload: ContactFormValues) => {
      if (!userId || !orgId) throw new Error("Must sign in and select a business.");
      return createContact({ ...payload, user_id: userId, organization_id: orgId });
    },
    onSuccess: () => invalidate(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<ContactFormValues> }) =>
      updateContact(id, patch),
    onSuccess: () => invalidate(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteContact(id),
    onSuccess: () => invalidate(),
  });

  return {
    contacts: query.data ?? [],
    isLoading: !sessionReady || query.isLoading,
    createContact: createMutation.mutateAsync,
    updateContact: updateMutation.mutateAsync,
    deleteContact: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
