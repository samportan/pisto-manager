import {
  CreditCard,
  Landmark,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { AccountType } from "@/lib/db/accounts";

const ACCOUNT_TYPE_ICONS: Record<AccountType, LucideIcon> = {
  cash: Wallet,
  bank: Landmark,
  credit: CreditCard,
  investment: TrendingUp,
};

export function getAccountTypeIcon(type: string): LucideIcon {
  return ACCOUNT_TYPE_ICONS[type as AccountType] ?? Landmark;
}
