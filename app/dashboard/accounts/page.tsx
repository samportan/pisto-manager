import type { Metadata } from "next";
import { AccountsDashboard } from "@/components/accounts-dashboard";

export const metadata: Metadata = {
  title: "Accounts",
  description: "Balances by account",
};

export default function AccountsPage() {
  return (
    <div className="flex-1">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <AccountsDashboard />
      </div>
    </div>
  );
}
