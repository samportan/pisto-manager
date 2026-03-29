import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AccountDetailPanel } from "@/components/account-detail-panel";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/server";
import { isSupabaseConfigured } from "@/lib/supabase-config";
import type { Account } from "@/lib/db/accounts";

export const metadata: Metadata = {
  title: "Account",
  description: "Account details",
};

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <div className="flex-1 px-4 py-16 text-center sm:px-6">
        <p className="text-sm text-muted-foreground">
          Configure Supabase to load account details.
        </p>
        <Button className="mt-4" render={<Link href="/dashboard/accounts" />}>
          Back to accounts
        </Button>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { data: row, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const account = row as Account | null;
  if (!account || account.user_id !== user.id) {
    notFound();
  }

  return <AccountDetailPanel account={account} />;
}
