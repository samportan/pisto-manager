type TranslateFn = (key: string, values?: Record<string, string | number>) => string;

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
  if (lower.includes("customer required for partial or credit")) {
    return t("business.errorCustomerRequiredCredit");
  }
  if (lower.includes("supplier required for partial or credit")) {
    return t("business.supplierRequiredForCredit");
  }
  if (lower === "forbidden" || lower.includes("forbidden")) {
    return t("toast.errorForbidden");
  }

  if (message.trim()) return message;
  return t(context === "delete" ? "common.errorDelete" : "common.errorSave");
}

export function resolveErrorMessage(
  err: unknown,
  t: TranslateFn,
  context: "save" | "delete" = "save"
): string {
  if (!(err instanceof Error)) {
    return t(context === "delete" ? "common.errorDelete" : "common.errorSave");
  }
  return mapRpcError(err.message, t, context);
}
