type TranslateFn = (key: string, values?: Record<string, string | number>) => string;

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }
  if (typeof err === "object" && err !== null) {
    const record = err as { message?: unknown; details?: unknown };
    if (typeof record.message === "string" && record.message.trim()) {
      return record.message;
    }
    if (typeof record.details === "string" && record.details.trim()) {
      return record.details;
    }
  }
  return "";
}

export function mapRpcError(
  message: string,
  t: TranslateFn,
  context: "save" | "delete" = "save"
): string {
  const lower = message.toLowerCase();

  if (lower.includes("not authenticated")) return t("toast.errorNotAuthenticated");
  if (lower.includes("no access to organization")) return t("toast.errorNoOrgAccess");
  if (lower.includes("insufficient stock for product")) {
    return t("toast.errorInsufficientStockRpc");
  }
  if (lower.includes("insufficient stock to reduce")) {
    return t("toast.errorInsufficientStockRpc");
  }
  if (lower.includes("product not found")) return t("toast.errorProductNotFound");
  if (lower.includes("cannot delete sale with outstanding balance")) {
    return t("toast.errorDeleteSaleBalance");
  }
  if (lower.includes("cannot delete sale with payment records")) {
    return t("toast.errorDeleteSalePayments");
  }
  if (lower.includes("cannot delete purchase with outstanding balance")) {
    return t("toast.errorDeletePurchaseBalance");
  }
  if (lower.includes("cannot delete purchase with payment records")) {
    return t("toast.errorDeletePurchasePayments");
  }
  if (lower.includes("payment exceeds balance")) {
    return t("business.errorPaymentExceedsBalance");
  }
  if (lower.includes("no open balance for customer")) {
    return t("business.errorNoOpenCustomerBalance");
  }
  if (lower.includes("customer required for partial or credit")) {
    return t("business.errorCustomerRequiredCredit");
  }
  if (lower.includes("supplier required for partial or credit")) {
    return t("business.supplierRequiredForCredit");
  }
  if (lower === "forbidden" || lower.includes("forbidden")) {
    return t("toast.errorForbidden");
  }
  if (
    lower.includes("products_org_barcode_unique") ||
    (lower.includes("duplicate key") && lower.includes("barcode"))
  ) {
    return t("toast.errorBarcodeDuplicate");
  }

  if (message.trim()) return message;
  return t(context === "delete" ? "common.errorDelete" : "common.errorSave");
}

export function resolveErrorMessage(
  err: unknown,
  t: TranslateFn,
  context: "save" | "delete" = "save"
): string {
  const raw = extractErrorMessage(err);
  if (!raw.trim()) {
    return t(context === "delete" ? "common.errorDelete" : "common.errorSave");
  }
  return mapRpcError(raw, t, context);
}
