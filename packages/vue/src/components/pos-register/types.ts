import type { Component, HTMLAttributes } from "vue";
import type { LineItemTotals, LineTaxMode } from "../line-item-editor";
import type { PosDrawerSummary, PosPaymentMethod, PosTender } from "./pos-math";
import type { PosRegisterLabels } from "./strings";

export interface PosProduct {
  id: string;
  name: string;
  sku?: string;
  /** Matched exactly when the search box gets Enter (a scanner types the code then Enter). */
  barcode?: string;
  /** Minor units. */
  price: number;
  /** Basis points. Falls back to `defaultTaxBps`. */
  taxBps?: number;
  category?: string;
  /** Units on hand. The tile is disabled once the basket holds them all. Leave it out for unlimited. */
  stock?: number;
  /** A glyph component for the tile. For a picture use the `artwork` slot. */
  artwork?: Component;
}

export interface PosCategory {
  id: string;
  label: string;
}

export interface PosBasketLine {
  id: string;
  productId: string;
  name: string;
  /** A whole number of units. */
  quantity: number;
  /** Minor units. */
  unitPrice: number;
  taxBps?: number;
}

export interface PosSession {
  id: string;
  cashier: string;
  /** ISO date-time. */
  openedAt: string;
  /** Cash put in the drawer at the start, in minor units. */
  openingFloat: number;
}

export interface PosSale {
  id: string;
  number: string;
  /** ISO date-time. */
  at: string;
  cashier: string;
  lines: PosBasketLine[];
  totals: LineItemTotals;
  /** The one method used, or "split" when the sale was paid with more than one tender. */
  method: PosPaymentMethod | "split";
  /** Everything handed over: the cash given, or the total for card and wallet. Across all tenders for a split. */
  tendered: number;
  change: number;
  /** Every tender, in the order taken. Cash tenders hold what was handed over, before change. */
  tenders: PosTender[];
  /** Always null: the register sells to walk-in customers. */
  customerId: null;
}

/** A sale as passed back in through `defaultSales`. `tenders` may be missing on sales saved before split payments. */
export type PosSaleRecord = Omit<PosSale, "tenders"> & { tenders?: PosTender[] };

/** A basket put on hold. */
export interface PosParkedSale {
  id: string;
  /** ISO date-time it was parked. */
  at: string;
  cashier: string;
  note?: string;
  lines: PosBasketLine[];
  totals: LineItemTotals;
}

export interface PosCloseReport extends PosDrawerSummary {
  session: PosSession;
  counted: number;
  variance: number;
  closedAt: string;
}

export interface PosRegisterProps {
  products: readonly PosProduct[];
  categories?: readonly PosCategory[];
  /** ISO 4217 code. Default USD, or SAR in Arabic. */
  currency?: string;
  taxMode?: LineTaxMode;
  defaultTaxBps?: number;
  /** The open cash-drawer session (`v-model:session`). `null` shows the closed register. Leave undefined to let the register hold it. */
  session?: PosSession | null;
  defaultSession?: PosSession | null;
  /** Who is at the till. Used when the register opens a session. */
  cashier?: string;
  /** Sales already made in the session, so the drawer count is right after a reload. */
  defaultSales?: readonly PosSaleRecord[];
  /** Sales on hold (`v-model:parkedSales`). Pass it to control the list; leave it undefined to let the register hold it. */
  parkedSales?: readonly PosParkedSale[];
  defaultParkedSales?: readonly PosParkedSale[];
  /** Called with the finished sale, `tenders` filled in. Throw to show that the payment failed; nothing is recorded. */
  onCheckout?: (sale: PosSale) => void | Promise<void>;
  onCloseRegister?: (report: PosCloseReport) => void | Promise<void>;
  /** Override the built-in strings. */
  labels?: PosRegisterLabels;
  class?: HTMLAttributes["class"];
}
