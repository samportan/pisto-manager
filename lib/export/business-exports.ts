import type { Contact } from "@/lib/db/contacts";
import { getContactsByOrgId } from "@/lib/db/contacts";
import {
  getPurchaseItemsByOrgId,
  getSaleItemsByOrgId,
  getStockMovementsByOrgId,
  type ExportStockMovement,
} from "@/lib/db/export-data";
import { getExpensesByOrgId, type Expense } from "@/lib/db/expenses";
import { getProductsByOrgId, type Product } from "@/lib/db/products";
import {
  getPurchasesHeadersByOrgId,
  type PurchaseWithMeta,
} from "@/lib/db/purchases";
import { getSalesHeadersByOrgId, type SaleWithMeta } from "@/lib/db/sales";
import type { StockAdjustmentReason } from "@/lib/db/stock-movements";
import type { ProductSalesRank } from "@/lib/analytics/business-products";
import { downloadWorkbook, todayFilename, type SheetRow } from "@/lib/export/excel";
import { formatDateForExport } from "@/lib/timezone";

export type StockAdjustmentReasonLabels = Record<StockAdjustmentReason, string>;

type ContactMap = Map<string, string>;

function contactMap(contacts: Contact[]): ContactMap {
  return new Map(contacts.map((c) => [c.id, c.name]));
}

function dateOnly(value: string): string {
  return formatDateForExport(value);
}

function countById(ids: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const id of ids) {
    m.set(id, (m.get(id) ?? 0) + 1);
  }
  return m;
}

export function productsToRows(products: Product[]): SheetRow[] {
  return products.map((p) => ({
    nombre: p.name,
    sku: p.sku ?? "",
    codigo_barras: p.barcode ?? "",
    precio_venta: Number(p.sale_price),
    precio_costo: Number(p.cost_price),
    stock: Number(p.stock),
    stock_minimo: p.min_stock != null ? Number(p.min_stock) : "",
    activo: p.is_active,
    valor_inventario_costo: Number(p.stock) * Number(p.cost_price),
    valor_inventario_venta: Number(p.stock) * Number(p.sale_price),
    margen_unitario: Number(p.sale_price) - Number(p.cost_price),
    creado: dateOnly(p.created_at),
  }));
}

export function salesToRows(sales: SaleWithMeta[], contacts: Contact[]): SheetRow[] {
  const names = contactMap(contacts);
  return sales.map((s) => ({
    fecha: dateOnly(s.date),
    cliente: s.customer_id ? names.get(s.customer_id) ?? s.customer_id : "",
    subtotal: Number(s.subtotal ?? s.total),
    recargo_tarjeta: Number(s.card_surcharge_amount ?? 0),
    recargo_aplicado: s.apply_card_surcharge ? "Sí" : "No",
    total: Number(s.total),
    metodo_pago: s.payment_method,
    estado_cobro: s.payment_status,
    pagado: Number(s.amount_paid ?? s.total),
    saldo: Number(s.balance_due ?? 0),
    lineas: s.line_count,
    notas: s.notes ?? "",
    id: s.id,
  }));
}

export function saleLinesToRows(
  lines: Awaited<ReturnType<typeof getSaleItemsByOrgId>>,
  contacts: Contact[]
): SheetRow[] {
  const names = contactMap(contacts);
  return lines.map((line) => ({
    fecha_venta: dateOnly(line.sale_date),
    id_venta: line.sale_id,
    cliente: line.customer_id ? names.get(line.customer_id) ?? line.customer_id : "",
    producto: line.product_name ?? line.product_id,
    sku: line.product_sku ?? "",
    cantidad: line.quantity,
    precio_unitario: line.unit_price,
    total_linea: line.line_total,
  }));
}

export function purchasesToRows(
  purchases: PurchaseWithMeta[],
  contacts: Contact[]
): SheetRow[] {
  const names = contactMap(contacts);
  return purchases.map((p) => ({
    fecha: dateOnly(p.date),
    proveedor: p.supplier_id ? names.get(p.supplier_id) ?? p.supplier_id : "",
    estado_recepcion: p.receipt_status,
    entrega_esperada: p.expected_at ? dateOnly(p.expected_at) : "",
    fecha_recepcion: p.received_at ? dateOnly(p.received_at) : "",
    subtotal: Number(p.subtotal ?? p.total),
    cargos: Number(p.fees_amount ?? 0),
    notas_cargos: p.fees_notes ?? "",
    total: Number(p.total),
    metodo_pago: p.payment_method,
    estado_pago: p.payment_status,
    pagado: Number(p.amount_paid ?? 0),
    saldo: Number(p.balance_due ?? 0),
    lineas: p.line_count,
    notas: p.notes ?? "",
    id: p.id,
  }));
}

export function purchaseLinesToRows(
  lines: Awaited<ReturnType<typeof getPurchaseItemsByOrgId>>,
  contacts: Contact[]
): SheetRow[] {
  const names = contactMap(contacts);
  return lines.map((line) => ({
    fecha_compra: dateOnly(line.purchase_date),
    id_compra: line.purchase_id,
    proveedor: line.supplier_id ? names.get(line.supplier_id) ?? line.supplier_id : "",
    producto: line.product_name ?? line.product_id,
    sku: line.product_sku ?? "",
    cantidad_pedida: line.quantity_ordered ?? line.quantity,
    cantidad_recibida: line.quantity_received ?? "",
    costo_unitario: line.unit_cost,
    total_linea: line.line_total,
  }));
}

export function expensesToRows(
  expenses: Expense[],
  labels: {
    category: (key: string) => string;
    subcategory: (key: string) => string;
    paymentMethod: (key: string) => string;
    yes: string;
    no: string;
  }
): SheetRow[] {
  return expenses.map((e) => ({
    fecha: dateOnly(e.date),
    categoria: labels.category(e.category),
    concepto: labels.subcategory(e.subcategory),
    monto: Number(e.amount),
    metodo_pago: labels.paymentMethod(e.payment_method),
    recurrente: e.is_recurring ? labels.yes : labels.no,
    notas: e.notes ?? "",
    id: e.id,
  }));
}

export function buildExpensesWorkbook(
  expenses: Expense[],
  sheetName: string,
  labels: {
    category: (key: string) => string;
    subcategory: (key: string) => string;
    paymentMethod: (key: string) => string;
    yes: string;
    no: string;
  }
) {
  return [{ name: sheetName, rows: expensesToRows(expenses, labels) }];
}

export function performanceToRows(ranking: ProductSalesRank[]): SheetRow[] {
  return ranking.map((row) => ({
    producto: row.productName,
    unidades_vendidas: row.unitsSold,
    ingresos: row.revenue,
    margen_estimado: row.estimatedMargin,
    stock: row.stock,
    estado_stock: row.lowStock ? "bajo" : "ok",
  }));
}

export function stockMovementsToRows(
  movements: ExportStockMovement[],
  reasonLabels: StockAdjustmentReasonLabels
): SheetRow[] {
  return movements.map((m) => {
    const cost = Number(m.cost_price);
    const qty = Number(m.quantity_delta);
    return {
      fecha: dateOnly(m.created_at),
      producto: m.product_name ?? m.product_id,
      sku: m.product_sku ?? "",
      codigo_barras: m.product_barcode ?? "",
      motivo: reasonLabels[m.reason] ?? m.reason,
      cantidad: qty,
      stock_antes: Number(m.stock_before),
      stock_despues: Number(m.stock_after),
      precio_costo: cost,
      valor_costo: qty * cost,
      unidad: m.unit_of_measure,
      notas: m.notes ?? "",
    };
  });
}

export async function buildProductsWorkbook(
  products: Product[],
  orgId: string,
  labels: { products: string; adjustments: string },
  reasonLabels: StockAdjustmentReasonLabels
) {
  const movements = await getStockMovementsByOrgId(orgId);
  return [
    { name: labels.products, rows: productsToRows(products) },
    { name: labels.adjustments, rows: stockMovementsToRows(movements, reasonLabels) },
  ];
}

export async function buildSalesWorkbookOnDemand(
  orgId: string,
  contacts: Contact[],
  labels: { sales: string; saleLines: string }
) {
  const [headers, saleLines] = await Promise.all([
    getSalesHeadersByOrgId(orgId),
    getSaleItemsByOrgId(orgId),
  ]);
  const lineCounts = countById(saleLines.map((l) => l.sale_id));
  const sales: SaleWithMeta[] = headers.map((s) => ({
    ...s,
    line_count: lineCounts.get(s.id) ?? 0,
    top_products: [],
    items_preview: "",
  }));
  return [
    { name: labels.sales, rows: salesToRows(sales, contacts) },
    { name: labels.saleLines, rows: saleLinesToRows(saleLines, contacts) },
  ];
}

/** @deprecated Use buildSalesWorkbookOnDemand */
export async function buildSalesWorkbook(
  orgId: string,
  sales: SaleWithMeta[],
  contacts: Contact[],
  labels: { sales: string; saleLines: string }
) {
  if (sales.length === 0) {
    return buildSalesWorkbookOnDemand(orgId, contacts, labels);
  }
  const saleLines = orgId ? await getSaleItemsByOrgId(orgId) : [];
  const lineCounts = countById(saleLines.map((l) => l.sale_id));
  const withCounts = sales.map((s) => ({
    ...s,
    line_count: s.line_count || lineCounts.get(s.id) || 0,
  }));
  return [
    { name: labels.sales, rows: salesToRows(withCounts, contacts) },
    { name: labels.saleLines, rows: saleLinesToRows(saleLines, contacts) },
  ];
}

export async function buildPurchasesWorkbookOnDemand(
  orgId: string,
  contacts: Contact[],
  labels: { purchases: string; purchaseLines: string }
) {
  const [headers, purchaseLines] = await Promise.all([
    getPurchasesHeadersByOrgId(orgId),
    getPurchaseItemsByOrgId(orgId),
  ]);
  const lineCounts = countById(purchaseLines.map((l) => l.purchase_id));
  const purchases: PurchaseWithMeta[] = headers.map((p) => ({
    ...p,
    line_count: lineCounts.get(p.id) ?? 0,
    top_products: [],
    items_preview: "",
  }));
  return [
    { name: labels.purchases, rows: purchasesToRows(purchases, contacts) },
    { name: labels.purchaseLines, rows: purchaseLinesToRows(purchaseLines, contacts) },
  ];
}

/** @deprecated Use buildPurchasesWorkbookOnDemand */
export async function buildPurchasesWorkbook(
  orgId: string,
  purchases: PurchaseWithMeta[],
  contacts: Contact[],
  labels: { purchases: string; purchaseLines: string }
) {
  if (purchases.length === 0) {
    return buildPurchasesWorkbookOnDemand(orgId, contacts, labels);
  }
  const purchaseLines = orgId ? await getPurchaseItemsByOrgId(orgId) : [];
  const lineCounts = countById(purchaseLines.map((l) => l.purchase_id));
  const withCounts = purchases.map((p) => ({
    ...p,
    line_count: p.line_count || lineCounts.get(p.id) || 0,
  }));
  return [
    { name: labels.purchases, rows: purchasesToRows(withCounts, contacts) },
    { name: labels.purchaseLines, rows: purchaseLinesToRows(purchaseLines, contacts) },
  ];
}

export async function buildFullBusinessWorkbookOnDemand(args: {
  orgId: string;
  ranking: ProductSalesRank[];
  labels: {
    products: string;
    adjustments: string;
    sales: string;
    saleLines: string;
    purchases: string;
    purchaseLines: string;
    expenses: string;
    performance: string;
  };
  reasonLabels: StockAdjustmentReasonLabels;
  expenseLabels: {
    category: (key: string) => string;
    subcategory: (key: string) => string;
    paymentMethod: (key: string) => string;
    yes: string;
    no: string;
  };
}) {
  const [
    products,
    contacts,
    saleHeaders,
    purchaseHeaders,
    saleLines,
    purchaseLines,
    movements,
    expenses,
  ] = await Promise.all([
    getProductsByOrgId(args.orgId),
    getContactsByOrgId(args.orgId),
    getSalesHeadersByOrgId(args.orgId),
    getPurchasesHeadersByOrgId(args.orgId),
    getSaleItemsByOrgId(args.orgId),
    getPurchaseItemsByOrgId(args.orgId),
    getStockMovementsByOrgId(args.orgId),
    getExpensesByOrgId(args.orgId),
  ]);

  const saleLineCounts = countById(saleLines.map((l) => l.sale_id));
  const purchaseLineCounts = countById(purchaseLines.map((l) => l.purchase_id));

  const sales: SaleWithMeta[] = saleHeaders.map((s) => ({
    ...s,
    line_count: saleLineCounts.get(s.id) ?? 0,
    top_products: [],
    items_preview: "",
  }));
  const purchases: PurchaseWithMeta[] = purchaseHeaders.map((p) => ({
    ...p,
    line_count: purchaseLineCounts.get(p.id) ?? 0,
    top_products: [],
    items_preview: "",
  }));

  return [
    { name: args.labels.products, rows: productsToRows(products) },
    {
      name: args.labels.adjustments,
      rows: stockMovementsToRows(movements, args.reasonLabels),
    },
    { name: args.labels.sales, rows: salesToRows(sales, contacts) },
    { name: args.labels.saleLines, rows: saleLinesToRows(saleLines, contacts) },
    { name: args.labels.purchases, rows: purchasesToRows(purchases, contacts) },
    {
      name: args.labels.purchaseLines,
      rows: purchaseLinesToRows(purchaseLines, contacts),
    },
    { name: args.labels.expenses, rows: expensesToRows(expenses, args.expenseLabels) },
    { name: args.labels.performance, rows: performanceToRows(args.ranking) },
  ];
}

export { downloadWorkbook, todayFilename };
