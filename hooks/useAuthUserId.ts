"use client";

import { useAuthSession } from "@/components/auth-session-provider";

export function useAuthUserId() {
  return useAuthSession();
}
