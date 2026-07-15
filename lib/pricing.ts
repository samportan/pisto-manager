import { truncMoney } from "@/lib/money";

/** Target contribution margin: (sale − cost) / sale */
export const TARGET_CONTRIBUTION_MARGIN = 0.25;

export function suggestedSalePrice(
  cost: number,
  margin: number = TARGET_CONTRIBUTION_MARGIN
): number {
  if (!Number.isFinite(cost) || cost <= 0) return 0;
  if (!Number.isFinite(margin) || margin <= 0 || margin >= 1) return 0;
  return truncMoney(cost / (1 - margin));
}

export function contributionMarginPercent(sale: number, cost: number): number | null {
  if (!Number.isFinite(sale) || !Number.isFinite(cost) || sale <= 0) return null;
  return ((sale - cost) / sale) * 100;
}
