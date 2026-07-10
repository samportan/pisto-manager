import type { Contact } from "@/lib/db/contacts";
import { getPurchaseItemsByOrgId, getSaleItemsByOrgId } from "@/lib/db/export-data";
import type { Product } from "@/lib/db/products";
import type { PurchaseWithMeta } from "@/lib/db/purchases";
import type { SaleWithMeta } from "@/lib/db/sales";
import type { ProductSalesRank } from "@/lib/analytics/business-products";
import { downloadWorkbook, todayFilename, type SheetRow } from "@/lib/export/excel";
import { formatDateForExport } from "@/lib/timezone";

type ContactMap = Map<string, string>;

function contactMap(contacts: Contact[]): ContactMap {
  return new Map(contacts.map((c) => [c.id, c.name]));
}

function dateOnly(value: string): string {
  return formatDateForExport(value);
}

export function productsToRows(products: Product[]): SheetRow[] {
  return products.map((p) => ({
    nombre: p.name,
    sku: p.sku ?? "",
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

export async function buildProductsWorkbook(products: Product[], sheetName: string) {
  return [{ name: sheetName, rows: productsToRows(products) }];
}

export async function buildSalesWorkbook(
  orgId: string,
  sales: SaleWithMeta[],
  contacts: Contact[],
  labels: { sales: string; saleLines: string }
) {
  const saleLines = orgId ? await getSaleItemsByOrgId(orgId) : [];
  return [
    { name: labels.sales, rows: salesToRows(sales, contacts) },
    { name: labels.saleLines, rows: saleLinesToRows(saleLines, contacts) },
  ];
}

export async function buildPurchasesWorkbook(
  orgId: string,
  purchases: PurchaseWithMeta[],
  contacts: Contact[],
  labels: { purchases: string; purchaseLines: string }
) {
  const purchaseLines = orgId ? await getPurchaseItemsByOrgId(orgId) : [];
  return [
    { name: labels.purchases, rows: purchasesToRows(purchases, contacts) },
    { name: labels.purchaseLines, rows: purchaseLinesToRows(purchaseLines, contacts) },
  ];
}

export async function buildFullBusinessWorkbook(args: {
  orgId: string;
  products: Product[];
  sales: SaleWithMeta[];
  purchases: PurchaseWithMeta[];
  contacts: Contact[];
  ranking: ProductSalesRank[];
  labels: {
    products: string;
    sales: string;
    saleLines: string;
    purchases: string;
    purchaseLines: string;
    performance: string;
  };
}) {
  const [saleLines, purchaseLines] = args.orgId
    ? await Promise.all([
        getSaleItemsByOrgId(args.orgId),
        getPurchaseItemsByOrgId(args.orgId),
      ])
    : [[], []];

  return [
    { name: args.labels.products, rows: productsToRows(args.products) },
    { name: args.labels.sales, rows: salesToRows(args.sales, args.contacts) },
    { name: args.labels.saleLines, rows: saleLinesToRows(saleLines, args.contacts) },
    { name: args.labels.purchases, rows: purchasesToRows(args.purchases, args.contacts) },
    {
      name: args.labels.purchaseLines,
      rows: purchaseLinesToRows(purchaseLines, args.contacts),
    },
    { name: args.labels.performance, rows: performanceToRows(args.ranking) },
  ];
}

export { downloadWorkbook, todayFilename };
