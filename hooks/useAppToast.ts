"use client";

import { toast } from "sonner";

import { useT } from "@/hooks/useTranslations";
import { resolveErrorMessage } from "@/lib/rpc-error-messages";

type ToastValues = Record<string, string | number>;

export function useAppToast() {
  const { t } = useT();

  return {
    success(key: string, values?: ToastValues) {
      toast.success(t(key, values), { duration: 4000 });
    },
    error(key: string, values?: ToastValues) {
      toast.error(t(key, values), { duration: 5000 });
    },
    errorMessage(message: string) {
      toast.error(message, { duration: 5000 });
    },
    errorFrom(err: unknown, context: "save" | "delete" = "save") {
      toast.error(resolveErrorMessage(err, t, context), { duration: 5000 });
    },
  };
}
