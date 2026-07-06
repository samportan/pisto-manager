"use client";

import { useActiveOrg } from "@/components/active-org-provider";

export function useActiveOrganization() {
  return useActiveOrg();
}
