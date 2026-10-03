// nqStockLedger: the on-hand grid, the movement list of one product and the record dialog of the stock ledger.
//
//   <section data-slot="stock-ledger" x-data="nqStockLedger({ products, warehouses, movements, canRecord, locale, t })"> … </section>
//
// On-hand is derived from the movements and nothing else. Recording a movement fires a bubbling, cancelable event:
//   "nq-stock-record"  { movements, resolve(), reject(message), waitUntil(promise) }   one movement, or two for a transfer
// Nobody claimed it (no waitUntil / resolve / reject call): the movements are added locally and the dialog closes at once.
// When a handler claims it the dialog stays busy until it settles; a rejection keeps the dialog open with an error.
// Re-render the section with the saved movements afterwards.

import {
  stockCanIssue,
  stockCellKey,
  stockLevel,
  stockMatrix,
  stockOnHand,
  stockSignedQuantity,
  stockStatement,
  stockTransfer,
  type StockMovement,
  type StockProduct,
  type StockWarehouse,
} from "./stock-ledger-logic";
import type { Register } from "./types";

type Kind = "receive" | "issue" | "adjust" | "transfer";

interface Config {
  products: StockProduct[];
  warehouses: StockWarehouse[];
  movements: StockMovement[];
  asOf?: string | null;
  canRecord?: boolean;
  locale?: string;
  today?: string;
  t: Record<string, string>;
}

const ALL = "__all__";
let counter = 0;

export const stockLedger: Register = (Alpine) => {
  Alpine.data("nqStockLedger", (config: Config) => ({
    products: config.products,
    warehouses: config.warehouses,
    movements: [...config.movements],
    asOf: config.asOf ?? undefined,
    canRecord: Boolean(config.canRecord),
    t: config.t,
    productId: config.products[0]?.id ?? "",
    warehouseId: ALL,
    dialogOpen: false,
    kind: ["receive"] as string[],
    dir: ["increase"] as string[],
    formProduct: "",
    formWarehouse: "",
    formTo: "",
    qty: null as number | null,
    day: config.today ?? new Date().toISOString().slice(0, 10),
    reference: "",
    note: "",
    touched: false,
    busy: false,
    failed: "",

    get numberFormat() {
      return new Intl.NumberFormat(new Intl.Locale(config.locale ?? "en", { numberingSystem: "latn" }).toString(), { maximumFractionDigits: 3 });
    },
    num(v: number, blank = false, sign = false): string {
      if (blank && v === 0) return "–";
      const s = this.numberFormat.format(Math.abs(v));
      return v < 0 ? `-${s}` : sign && v > 0 ? `+${s}` : s;
    },
    date(iso: string): string {
      return new Intl.DateTimeFormat(new Intl.Locale(config.locale ?? "en", { numberingSystem: "latn" }).toString(), { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
    },
    get matrix() {
      return stockMatrix(this.products, this.warehouses, this.movements, { asOf: this.asOf });
    },
    get statement() {
      return stockStatement(this.movements, { productId: this.productId, warehouseId: this.warehouseId === ALL ? undefined : this.warehouseId });
    },
    warehouseName(id: string): string {
      return this.warehouses.find((w: StockWarehouse) => w.id === id)?.name ?? id;
    },
    levelLabel(level: string): string {
      return level === "ok" ? this.t.inStock : level === "low" ? this.t.low : this.t.out;
    },
    levelTone(level: string): string {
      return level === "ok" ? "success" : level === "low" ? "warning" : "danger";
    },
    select(id: string) {
      this.productId = id;
    },
    openRecord(type: Kind, productId?: string) {
      this.kind = [type];
      this.dir = ["increase"];
      this.formProduct = productId ?? "";
      this.formWarehouse = this.warehouses[0]?.id ?? "";
      this.formTo = "";
      this.qty = null;
      this.reference = "";
      this.note = "";
      this.touched = false;
      this.failed = "";
      this.dialogOpen = true;
    },
    get kindValue(): Kind {
      return (this.kind[0] ?? "receive") as Kind;
    },
    get outgoing(): boolean {
      const k = this.kindValue;
      return k === "issue" || k === "transfer" || (k === "adjust" && this.dir[0] === "decrease");
    },
    get quantity(): number {
      return (this.qty ?? 0) / 1000;
    },
    get available(): number {
      return this.formProduct && this.formWarehouse ? (stockOnHand(this.movements).get(stockCellKey(this.formProduct, this.formWarehouse)) ?? 0) : 0;
    },
    get unit(): string {
      return this.products.find((p: StockProduct) => p.id === this.formProduct)?.unit ?? "";
    },
    get error(): string {
      if (!this.formProduct) return this.t.errProduct;
      if (!this.formWarehouse || (this.kindValue === "transfer" && !this.formTo)) return this.t.errWarehouse;
      if (this.kindValue === "transfer" && this.formTo === this.formWarehouse) return this.t.errSame;
      if (this.quantity <= 0) return this.t.errQuantity;
      if (this.outgoing && !stockCanIssue(this.movements, this.formProduct, this.formWarehouse, this.quantity)) return this.t.errStock.replace("{n}", String(this.available));
      return "";
    },
    get badProduct(): boolean {
      return this.touched && !this.formProduct;
    },
    get badTo(): boolean {
      return this.touched && (!this.formTo || this.formTo === this.formWarehouse);
    },
    get shownError(): string {
      return this.touched && this.error ? this.error : this.failed;
    },
    async submit() {
      this.touched = true;
      if (this.error || this.busy) return;
      const base = { date: `${this.day}T00:00:00`, productId: this.formProduct, reference: this.reference.trim() || undefined, note: this.note.trim() || undefined };
      const k = this.kindValue;
      const id = `mv-${Date.now().toString(36)}-${(counter++).toString(36)}`;
      const out: StockMovement[] =
        k === "transfer"
          ? stockTransfer({ id, ...base, fromWarehouseId: this.formWarehouse, toWarehouseId: this.formTo, quantity: this.quantity })
          : [{ ...base, id, warehouseId: this.formWarehouse, type: k, quantity: stockSignedQuantity(k, k === "adjust" && this.dir[0] === "decrease" ? -this.quantity : this.quantity) }];
      let claimed: Promise<unknown> | null = null;
      const claim = (p: Promise<unknown>) => (claimed = claimed ?? p);
      const event = new CustomEvent("nq-stock-record", {
        bubbles: true,
        cancelable: true,
        detail: {
          movements: out,
          waitUntil: (p: Promise<unknown>) => void claim(Promise.resolve(p)),
          resolve: () => void claim(Promise.resolve()),
          reject: (message?: string) => void claim(Promise.reject(new Error(message ?? ""))),
        },
      });
      (this.$root as HTMLElement).dispatchEvent(event);
      this.failed = "";
      this.busy = true;
      try {
        if (claimed) await claimed;
        this.movements = [...this.movements, ...out];
        this.dialogOpen = false;
      } catch {
        this.failed = this.t.errSave;
      } finally {
        this.busy = false;
      }
    },
    stockLevel,
  }));
};

