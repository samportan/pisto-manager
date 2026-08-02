import { createClient } from "@/lib/client";
import type { Account } from "@/lib/db/accounts";
import type { Transaction } from "@/lib/db/transactions";
import { getAccountsByUserId } from "@/lib/db/accounts";
import { fetchUserMonthExpenseTotal } from "@/lib/db/analytics";

export const financialSummaryKeys = {
  all: (userId: string) => ["financial-summary", userId] as const,
};

export type UserFinancialSummary = {
  totalBalanceExcludingCreditAndLoans: number;
  totalSpentThisMonth: number;
  totalNetWorth: number;
};

function asNumber(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function unwrapBody(raw: unknown): unknown {
  if (
    raw &&
    typeof raw === "object" &&
    "data" in raw &&
    (raw as { data: unknown }).data !== undefined
  ) {
    return (raw as { data: unknown }).data;
  }
  return raw;
}

export function parseUserFinancialSummary(raw: unknown): UserFinancialSummary {
  const body = unwrapBody(raw);
  if (!body || typeof body !== "object") {
    throw new Error("Invalid financial summary response");
  }
  const o = body as Record<string, unknown>;
  return {
    totalBalanceExcludingCreditAndLoans: asNumber(
      o.totalBalanceExcludingCreditAndLoans
    ),
    totalSpentThisMonth: asNumber(o.totalSpentThisMonth),
    totalNetWorth: asNumber(o.totalNetWorth),
  };
}

/** Duck-typed: avoids importing `@supabase/functions-js` (not a direct dep; breaks pnpm/Turbopack resolve). */
function isFunctionsHttp401(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { name?: unknown; context?: unknown };
  return (
    e.name === "FunctionsHttpError" &&
    e.context instanceof Response &&
    e.context.status === 401
  );
}

/**
 * Ensures cookie-backed session has a fresh access token before the Edge
 * Function gateway validates the JWT (avoids stale `getSession()` tokens).
 */
async function syncSessionForEdgeCall(
  supabase: ReturnType<typeof createClient>
): Promise<void> {
  const { error: refreshError } = await supabase.auth.refreshSession();
  if (!refreshError) return;

  const { error: userError } = await supabase.auth.getUser();
  if (userError) {
    throw new Error("Not authenticated");
  }
}

export async function fetchUserFinancialSummary(): Promise<UserFinancialSummary> {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("Not authenticated");
  }

  try {
    await syncSessionForEdgeCall(supabase);

    let { data: raw, error: fnError } = await supabase.functions.invoke(
      "user-financial-summary",
      { body: {} }
    );

    if (fnError && isFunctionsHttp401(fnError)) {
      await supabase.auth.refreshSession();
      const retry = await supabase.functions.invoke("user-financial-summary", {
        body: {},
      });
      raw = retry.data;
      fnError = retry.error;
    }

    if (!fnError) {
      return parseUserFinancialSummary(raw);
    }
  } catch {
    // fall through to client-side computation
  }

  return computeSummaryClientSide(user.id);
}

export function computeSummaryFromData(
  accounts: Account[],
  transactions: Transaction[]
): UserFinancialSummary {
  const active = accounts.filter((a) => a.is_active);
  let totalNetWorth = 0;
  let creditAndLoans = 0;

  for (const a of active) {
    const bal = Number(a.balance);
    if (a.type === "credit") {
      creditAndLoans += Math.abs(bal);
      totalNetWorth -= Math.abs(bal);
    } else {
      totalNetWorth += bal;
    }
  }

  const now = new Date();
  let totalSpentThisMonth = 0;
  for (const tx of transactions) {
    if (tx.type !== "expense") continue;
    const d = new Date(tx.date);
    if (
      d.getUTCFullYear() === now.getUTCFullYear() &&
      d.getUTCMonth() === now.getUTCMonth()
    ) {
      totalSpentThisMonth += Number(tx.amount);
    }
  }

  return {
    totalNetWorth,
    totalBalanceExcludingCreditAndLoans: totalNetWorth - creditAndLoans,
    totalSpentThisMonth,
  };
}

async function computeSummaryClientSide(userId: string): Promise<UserFinancialSummary> {
  const [accounts, totalSpentThisMonth] = await Promise.all([
    getAccountsByUserId(userId),
    fetchUserMonthExpenseTotal(),
  ]);
  const fromAccounts = computeSummaryFromData(accounts ?? [], []);
  return {
    ...fromAccounts,
    totalSpentThisMonth,
  };
}
