import { createClient } from "@/lib/client";

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

  const { error: userError } = await supabase.auth.getUser();
  if (userError) {
    throw new Error("Not authenticated");
  }

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

  if (fnError) {
    const msg =
      fnError instanceof Error ? fnError.message : "Request failed";
    throw new Error(msg);
  }

  return parseUserFinancialSummary(raw);
}
