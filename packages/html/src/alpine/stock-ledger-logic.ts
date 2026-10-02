/*
 * Stock maths. On-hand is never stored: it is the sum of signed movements. Quantities may have up to three decimals (kilos,
 * litres), so sums run on thousandths as integers and never drift.
 */

export type StockMovementType = "receive" | "issue" | "adjust";

export interface StockProduct {
  id: string;
  name: string;
  sku: string;
  /** Unit label, for example "pcs" or "kg". */
  unit?: string;
  /** At or below this total on hand the product is flagged low. */
  reorderPoint?: number;
}

export interface StockWarehouse {
  id: string;
  name: string;
  code?: string;
}

export interface StockMovement {
  id: string;
  /** ISO date or date-time. */
  date: string;
  productId: string;
  warehouseId: string;
  type: StockMovementType;
  /** Signed: receive is positive, issue negative, adjust either. */
  quantity: number;
  /** A document number: purchase order, sale, transfer, count. */
  reference?: string;
  note?: string;
}

const SCALE = 1000;
const toUnits = (q: number) => Math.round((q || 0) * SCALE);
const fromUnits = (u: number) => u / SCALE;

/** Add quantities exactly. */
export function stockSum(quantities: readonly number[]): number {
  let u = 0;
  for (const q of quantities) u += toUnits(q);
  return fromUnits(u);
}

/** The signed quantity for what a person typed: receive adds, issue subtracts, adjust keeps its sign. The sign of the input is ignored for receive and issue. */
export function stockSignedQuantity(type: StockMovementType, quantity: number): number {
  if (type === "receive") return Math.abs(quantity);
  if (type === "issue") return -Math.abs(quantity);
  return quantity;
}

const cellKey = (productId: string, warehouseId: string) => `${productId}\u0000${warehouseId}`;

const inRange = (m: StockMovement, asOf?: string) => !asOf || m.date.slice(0, 10) <= asOf.slice(0, 10);

/** On-hand per product and warehouse. Keyed by `stockCellKey(productId, warehouseId)`. */
export function stockOnHand(movements: readonly StockMovement[], { asOf }: { asOf?: string } = {}): Map<string, number> {
  const units = new Map<string, number>();
  for (const m of movements) {
    if (!inRange(m, asOf)) continue;
    const k = cellKey(m.productId, m.warehouseId);
    units.set(k, (units.get(k) ?? 0) + toUnits(m.quantity));
  }
  return new Map([...units].map(([k, u]) => [k, fromUnits(u)]));
}

export const stockCellKey = cellKey;

export type StockLevel = "ok" | "low" | "out";

/** Out at zero or below, low at or under the reorder point, otherwise ok. */
export function stockLevel(onHand: number, reorderPoint?: number): StockLevel {
  if (onHand <= 0) return "out";
  if (reorderPoint !== undefined && onHand <= reorderPoint) return "low";
  return "ok";
}

export interface StockMatrixRow {
  product: StockProduct;
  /** On-hand per warehouse id. */
  cells: Record<string, number>;
  total: number;
  level: StockLevel;
}

export interface StockMatrix {
  rows: StockMatrixRow[];
  /** Total per warehouse id across products. */
  warehouseTotals: Record<string, number>;
  total: number;
}

/** Products by warehouses. Zero cells stay in so the grid is rectangular. */
export function stockMatrix(
  products: readonly StockProduct[],
  warehouses: readonly StockWarehouse[],
  movements: readonly StockMovement[],
  { asOf }: { asOf?: string } = {},
): StockMatrix {
  const onHand = stockOnHand(movements, { asOf });
  const warehouseUnits: Record<string, number> = Object.fromEntries(warehouses.map((w) => [w.id, 0]));
  let totalUnits = 0;
  const rows = products.map((product) => {
    const cells: Record<string, number> = {};
    let rowUnits = 0;
    for (const w of warehouses) {
      const q = onHand.get(cellKey(product.id, w.id)) ?? 0;
      cells[w.id] = q;
      rowUnits += toUnits(q);
      warehouseUnits[w.id] = (warehouseUnits[w.id] ?? 0) + toUnits(q);
    }
    totalUnits += rowUnits;
    const total = fromUnits(rowUnits);
    return { product, cells, total, level: stockLevel(total, product.reorderPoint) };
  });
  return {
    rows,
    warehouseTotals: Object.fromEntries(Object.entries(warehouseUnits).map(([k, u]) => [k, fromUnits(u)])),
    total: fromUnits(totalUnits),
  };
}

export interface StockStatementRow {
  movement: StockMovement;
  /** Signed change. */
  change: number;
  /** On hand after this movement, for the filtered product (and warehouse, when given). */
  balance: number;
}

const byDate = (a: StockMovement, b: StockMovement) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id, "en", { numeric: true });

/** The movements of one product (optionally one warehouse) in time order with a running balance from `opening`. */
export function stockStatement(
  movements: readonly StockMovement[],
  { productId, warehouseId, opening = 0 }: { productId?: string; warehouseId?: string; opening?: number } = {},
): StockStatementRow[] {
  let units = toUnits(opening);
  return movements
    .filter((m) => (!productId || m.productId === productId) && (!warehouseId || m.warehouseId === warehouseId))
    .sort(byDate)
    .map((movement) => {
      units += toUnits(movement.quantity);
      return { movement, change: movement.quantity, balance: fromUnits(units) };
    });
}

/** Whether an outgoing quantity fits what the warehouse holds. */
export function stockCanIssue(movements: readonly StockMovement[], productId: string, warehouseId: string, quantity: number): boolean {
  const have = stockOnHand(movements).get(cellKey(productId, warehouseId)) ?? 0;
  return toUnits(have) >= toUnits(Math.abs(quantity));
}

/** A transfer is two movements that share a reference: an issue from one warehouse and a receive in the other. */
export function stockTransfer(input: {
  id: string;
  date: string;
  productId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity: number;
  reference?: string;
  note?: string;
}): [StockMovement, StockMovement] {
  const q = Math.abs(input.quantity);
  const shared = { date: input.date, productId: input.productId, reference: input.reference, note: input.note };
  return [
    { ...shared, id: `${input.id}-out`, warehouseId: input.fromWarehouseId, type: "issue", quantity: -q },
    { ...shared, id: `${input.id}-in`, warehouseId: input.toWarehouseId, type: "receive", quantity: q },
  ];
}
