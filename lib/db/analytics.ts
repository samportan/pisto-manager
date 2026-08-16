import { BUSINESS_TIMEZONE } from "@/lib/timezone";
import type { InsightsPeriod } from "@/lib/analytics/shared";
import type { PaymentMethod } from "@/lib/db/sales";
import type { UnitOfMeasure } from "@/lib/uom";
import { createClient } from "../client";

function asNumber(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

export type BusinessPnl = {
  revenue: number;
  cogs: number;
  grossProfit: number;
  operatingExpenses: number;
  operatingProfit: number;
  financialExpenses: number;
  personalExpenses: number;
  netProfit: number;
};

export type BusinessCashPosition = {
  cashIncome: number;
  bankIncome: number;
  inventoryPurchases: number;
  totalExpenses: number;
  availableBalance: number;
  recurringExpenseCount: number;
};

export type BusinessPrevTotals = {
  revenue: number;
  purchases: number;
  margin: number;
  operatingProfit: number;
  netProfit: number;
};

export type BusinessOverviewData = {
  monthTotals: { revenue: number; purchases: number; margin: number };
  prevTotals: BusinessPrevTotals | null;
  pnl: BusinessPnl;
  cashPosition: BusinessCashPosition;
  series: { key: string; revenue: number; purchases: number; margin: number }[];
  topProducts: { productId: string; productName: string; revenue: number; unitsSold: number }[];
  lowStockCount: number;
  lowStockPreview: {
    id: string;
    name: string;
    stock: number;
    min_stock: number | null;
    unit_of_measure: UnitOfMeasure;
  }[];
};

export type SaleInsightsData = {
  kpis: {
    saleCount: number;
    revenue: number;
    avgTicket: number;
    estimatedMargin: number;
    accountsReceivable: number;
    openCreditCount: number;
    collectedInPeriod: number;
  };
  paymentMethods: {
    method: PaymentMethod;
    revenue: number;
    count: number;
    percentage: number;
  }[];
  topCustomers: {
    customerId: string | null;
    customerName: string;
    saleCount: number;
    revenue: number;
  }[];
  customerRanking: {
    customerId: string | null;
    customerName: string;
    saleCount: number;
    revenue: number;
  }[];
  topDays: { date: string; revenue: number; count: number }[];
};

export type ProductInsightsData = {
  inventory: {
    inventoryValueCost: number;
    inventoryValueRetail: number;
    potentialMargin: number;
    activeProducts: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  periodSales: {
    revenue: number;
    unitsSold: number;
    estimatedMargin: number;
  };
  deadStockCount: number;
  ranking: {
    productId: string;
    productName: string;
    unitsSold: number;
    revenue: number;
    estimatedMargin: number;
    stock: number;
    lowStock: boolean;
    outOfStock: boolean;
  }[];
};

export type CustomerBalanceAgg = {
  customer_id: string;
  balance_due: number;
  open_sale_count: number;
};

export async function fetchBusinessOverview(
  orgId: string,
  period: InsightsPeriod = "this_month",
  timezone = BUSINESS_TIMEZONE
): Promise<BusinessOverviewData> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_business_overview", {
    p_organization_id: orgId,
    p_timezone: timezone,
    p_period: period,
  });
  if (error) throw error;
  const root = asRecord(data);
  const month = asRecord(root.month_totals);
  const prev = root.prev_totals == null ? null : asRecord(root.prev_totals);
  const pnl = asRecord(root.pnl);
  const cash = asRecord(root.cash_position);
  const revenue = asNumber(month.revenue);
  const purchases = asNumber(month.purchases);
  const margin = asNumber(month.margin);
  return {
    monthTotals: {
      revenue,
      purchases,
      margin,
    },
    prevTotals: prev
      ? {
          revenue: asNumber(prev.revenue),
          purchases: asNumber(prev.purchases),
          margin: asNumber(prev.margin),
          operatingProfit: asNumber(prev.operating_profit),
          netProfit: asNumber(prev.net_profit),
        }
      : null,
    pnl: {
      revenue: asNumber(pnl.revenue) || revenue,
      cogs: asNumber(pnl.cogs) || purchases,
      grossProfit: asNumber(pnl.gross_profit) || margin,
      operatingExpenses: asNumber(pnl.operating_expenses),
      operatingProfit: asNumber(pnl.operating_profit) || margin - asNumber(pnl.operating_expenses),
      financialExpenses: asNumber(pnl.financial_expenses),
      personalExpenses: asNumber(pnl.personal_expenses),
      netProfit:
        asNumber(pnl.net_profit) ||
        margin -
          asNumber(pnl.operating_expenses) -
          asNumber(pnl.financial_expenses) -
          asNumber(pnl.personal_expenses),
    },
    cashPosition: {
      cashIncome: asNumber(cash.cash_income),
      bankIncome: asNumber(cash.bank_income),
      inventoryPurchases: asNumber(cash.inventory_purchases),
      totalExpenses: asNumber(cash.total_expenses),
      availableBalance: asNumber(cash.available_balance),
      recurringExpenseCount: asNumber(cash.recurring_expense_count),
    },
    series: asArray(root.series).map((row) => {
      const r = asRecord(row);
      return {
        key: asString(r.key),
        revenue: asNumber(r.revenue),
        purchases: asNumber(r.purchases),
        margin: asNumber(r.margin),
      };
    }),
    topProducts: asArray(root.top_products).map((row) => {
      const r = asRecord(row);
      return {
        productId: asString(r.product_id),
        productName: asString(r.product_name),
        revenue: asNumber(r.revenue),
        unitsSold: asNumber(r.units_sold),
      };
    }),
    lowStockCount: asNumber(root.low_stock_count),
    lowStockPreview: asArray(root.low_stock_preview).map((row) => {
      const r = asRecord(row);
      return {
        id: asString(r.id),
        name: asString(r.name),
        stock: asNumber(r.stock),
        min_stock: r.min_stock == null ? null : asNumber(r.min_stock),
        unit_of_measure: (asString(r.unit_of_measure) || "unit") as UnitOfMeasure,
      };
    }),
  };
}

export async function fetchSaleInsights(
  orgId: string,
  period: InsightsPeriod,
  walkInLabel: string,
  timezone = BUSINESS_TIMEZONE,
  topN = 5
): Promise<SaleInsightsData> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_sale_insights", {
    p_organization_id: orgId,
    p_period: period,
    p_timezone: timezone,
    p_top_n: topN,
    p_walk_in_label: walkInLabel,
  });
  if (error) throw error;
  const root = asRecord(data);
  const kpis = asRecord(root.kpis);

  const mapCustomer = (row: unknown) => {
    const r = asRecord(row);
    return {
      customerId: r.customer_id == null ? null : asString(r.customer_id),
      customerName: asString(r.customer_name),
      saleCount: asNumber(r.sale_count),
      revenue: asNumber(r.revenue),
    };
  };

  return {
    kpis: {
      saleCount: asNumber(kpis.sale_count),
      revenue: asNumber(kpis.revenue),
      avgTicket: asNumber(kpis.avg_ticket),
      estimatedMargin: asNumber(kpis.estimated_margin),
      accountsReceivable: asNumber(kpis.accounts_receivable),
      openCreditCount: asNumber(kpis.open_credit_count),
      collectedInPeriod: asNumber(kpis.collected_in_period),
    },
    paymentMethods: asArray(root.payment_methods).map((row) => {
      const r = asRecord(row);
      return {
        method: asString(r.method) as PaymentMethod,
        revenue: asNumber(r.revenue),
        count: asNumber(r.count),
        percentage: asNumber(r.percentage),
      };
    }),
    topCustomers: asArray(root.top_customers).map(mapCustomer),
    customerRanking: asArray(root.customer_ranking).map(mapCustomer),
    topDays: asArray(root.top_days).map((row) => {
      const r = asRecord(row);
      return {
        date: asString(r.date),
        revenue: asNumber(r.revenue),
        count: asNumber(r.count),
      };
    }),
  };
}

export async function fetchProductInsights(
  orgId: string,
  period: InsightsPeriod,
  timezone = BUSINESS_TIMEZONE
): Promise<ProductInsightsData> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_product_insights", {
    p_organization_id: orgId,
    p_period: period,
    p_timezone: timezone,
  });
  if (error) throw error;
  const root = asRecord(data);
  const inv = asRecord(root.inventory);
  const periodSales = asRecord(root.period_sales);
  return {
    inventory: {
      inventoryValueCost: asNumber(inv.inventory_value_cost),
      inventoryValueRetail: asNumber(inv.inventory_value_retail),
      potentialMargin: asNumber(inv.potential_margin),
      activeProducts: asNumber(inv.active_products),
      lowStockCount: asNumber(inv.low_stock_count),
      outOfStockCount: asNumber(inv.out_of_stock_count),
    },
    periodSales: {
      revenue: asNumber(periodSales.revenue),
      unitsSold: asNumber(periodSales.units_sold),
      estimatedMargin: asNumber(periodSales.estimated_margin),
    },
    deadStockCount: asNumber(root.dead_stock_count),
    ranking: asArray(root.ranking).map((row) => {
      const r = asRecord(row);
      return {
        productId: asString(r.product_id),
        productName: asString(r.product_name),
        unitsSold: asNumber(r.units_sold),
        revenue: asNumber(r.revenue),
        estimatedMargin: asNumber(r.estimated_margin),
        stock: asNumber(r.stock),
        lowStock: Boolean(r.low_stock),
        outOfStock: Boolean(r.out_of_stock),
      };
    }),
  };
}

export async function fetchCustomerBalancesAgg(
  orgId: string
): Promise<CustomerBalanceAgg[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_customer_balances_agg", {
    p_organization_id: orgId,
  });
  if (error) throw error;
  return asArray(data).map((row) => {
    const r = asRecord(row);
    return {
      customer_id: asString(r.customer_id),
      balance_due: asNumber(r.balance_due),
      open_sale_count: asNumber(r.open_sale_count),
    };
  });
}

export async function fetchUserMonthExpenseTotal(
  timezone = BUSINESS_TIMEZONE
): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_user_month_expense_total", {
    p_timezone: timezone,
  });
  if (error) throw error;
  return asNumber(data);
}
