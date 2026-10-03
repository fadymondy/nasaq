// nqLineItemEditor: the lines of an invoice, quote or order. The Blade partials draw one row per line with x-for; this holds the lines,
// the product pick, the stepper and the totals (integer minor units, see line-item-logic.ts), and tells the page through bubbling events:
//
//   nq-change { lines, totals }                  after every edit (lines use the public shape: quantity as a decimal)
//   nq-order-discount-change { orderDiscount }   when the order discount editor changes (only rendered when `orderDiscountOn`)
//
// nqLineItemDecimal is the scaled-integer field (quantity thousandths, percent basis points): x-modelable on `value`.

import {
  bpsToPercentText,
  computeLineItems,
  currencyDecimals,
  minorToMajor,
  plainToMinor,
  quantityMilli,
  quantityText,
  toPlainDecimal,
  type LineItemTotals,
  type LineOrderDiscount,
} from "./line-item-logic";
import type { Magics, Register } from "./types";

interface PublicLine {
  id: string;
  productId?: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  discountBps?: number;
  taxBps?: number;
}

interface Row {
  id: string;
  productId: string | null;
  name: string;
  qtyMilli: number;
  unitPrice: number;
  discountBps: number;
  taxBps: number;
  taxKey: string;
  touched: boolean;
}

interface Product {
  id: string;
  name: string;
  sku?: string;
  price: number;
  taxBps?: number;
  stock?: number;
  unit?: string;
}

interface Config {
  lines: PublicLine[];
  products: Product[];
  currency: string;
  locale: string;
  taxMode: "exclusive" | "inclusive";
  taxRounding: "line" | "invoice";
  defaultTaxBps: number;
  showTax: boolean;
  allowFreeLines: boolean;
  maxLines: number | null;
  readOnly: boolean;
  disabled: boolean;
  orderDiscount: LineOrderDiscount | null;
  labels: Record<string, string>;
}

interface EditorState extends Magics, Omit<Config, "lines" | "labels" | "orderDiscount"> {
  rows: Row[];
  t: Record<string, string>;
  focusId: string | null;
  odType: string[];
  odBps: number;
  odMinor: number | null;
  totals: LineItemTotals;
  orderDiscount: LineOrderDiscount | null;
  productOf(row: Row): Product | null;
  editable: boolean;
  canAdd: boolean;
}

let counter = 0;
const newId = () => `line-${Date.now().toString(36)}-${(counter++).toString(36)}`;
const toRow = (l: PublicLine, defaultTaxBps: number): Row => ({
  id: l.id,
  productId: l.productId ?? null,
  name: l.name ?? "",
  qtyMilli: quantityMilli(l.quantity),
  unitPrice: l.unitPrice,
  discountBps: l.discountBps ?? 0,
  taxBps: l.taxBps ?? defaultTaxBps,
  taxKey: String(l.taxBps ?? defaultTaxBps),
  touched: false,
});
const toPublic = (r: Row): PublicLine => ({ id: r.id, productId: r.productId, name: r.name, quantity: r.qtyMilli / 1000, unitPrice: r.unitPrice, discountBps: r.discountBps, taxBps: r.taxBps });

const self = (x: unknown) => x as EditorState;

export const lineItemEditor: Register = (Alpine) => {
  Alpine.data("nqLineItemEditor", (config: Config) => ({
    rows: (config.lines ?? []).map((l) => toRow(l, config.defaultTaxBps)),
    products: config.products ?? [],
    currency: config.currency,
    locale: config.locale,
    taxMode: config.taxMode,
    taxRounding: config.taxRounding,
    defaultTaxBps: config.defaultTaxBps,
    showTax: config.showTax,
    allowFreeLines: config.allowFreeLines,
    maxLines: config.maxLines,
    readOnly: config.readOnly,
    disabled: config.disabled,
    t: config.labels,
    focusId: null as string | null,
    odType: [config.orderDiscount?.type ?? "percent"],
    odBps: config.orderDiscount?.type === "percent" ? config.orderDiscount.bps : 0,
    odMinor: config.orderDiscount?.type === "amount" ? config.orderDiscount.minor : 0,
    init(this: EditorState) {
      this.$watch("rows", () => {
        this.$dispatch("nq-change", { lines: this.rows.map(toPublic), totals: this.totals });
      });
      const od = () => {
        this.$dispatch("nq-order-discount-change", { orderDiscount: this.orderDiscount });
      };
      this.$watch("odType", (now: string[], before: string[]) => {
        // Switching the kind starts from zero, as in the React editor.
        if (now[0] && before[0] && now[0] !== before[0]) {
          this.odBps = 0;
          this.odMinor = 0;
        }
        od();
      });
      this.$watch("odBps", od);
      this.$watch("odMinor", od);
    },
    get editable(): boolean {
      const s = self(this);
      return !s.readOnly && !s.disabled;
    },
    get canAdd(): boolean {
      const s = self(this);
      return s.editable && (s.maxLines === null || s.rows.length < s.maxLines);
    },
    get orderDiscount(): LineOrderDiscount | null {
      const s = self(this);
      return s.odType[0] === "amount" ? { type: "amount", minor: s.odMinor ?? 0 } : { type: "percent", bps: s.odBps };
    },
    get totals(): LineItemTotals {
      const s = self(this);
      return computeLineItems(
        s.rows.map((r) => ({ id: r.id, quantity: r.qtyMilli / 1000, unitPrice: r.unitPrice, discountBps: r.discountBps, taxBps: r.taxBps })),
        { taxMode: s.taxMode, taxRounding: s.taxRounding, defaultTaxBps: s.defaultTaxBps, orderDiscount: s.orderDiscount },
      );
    },
    /** The computed figures of one line. */
    result(this: EditorState, row: Row) {
      return this.totals.lines.find((l) => l.id === row.id);
    },
    money(this: EditorState, minor: number): string {
      try {
        return new Intl.NumberFormat(this.locale, { style: "currency", currency: this.currency }).format(minorToMajor(minor, this.currency));
      } catch {
        return String(minorToMajor(minor, this.currency).toFixed(currencyDecimals(this.currency)));
      }
    },
    percent(bps: number): string {
      return `${bpsToPercentText(bps)}%`;
    },
    qtyText(this: EditorState, row: Row): string {
      return quantityText(row.qtyMilli / 1000);
    },
    nameOf(this: EditorState, row: Row, index: number): string {
      return row.name.trim() || `${this.t.line} ${index + 1}`;
    },
    productOf(this: EditorState, row: Row): Product | null {
      return this.products.find((p) => p.id === row.productId) ?? null;
    },
    hint(this: EditorState, row: Row): string {
      const p = this.productOf(row);
      if (p) {
        const parts = [p.sku, p.stock !== undefined ? `${p.stock} ${p.unit ?? ""} ${this.t.inStock}`.replace(/\s+/g, " ").trim() : ""].filter(Boolean);
        return parts.join(" · ");
      }
      return row.name ? (this.t.freeLine ?? "") : "";
    },
    add(this: EditorState) {
      if (!this.canAdd) return;
      const row: Row = { id: newId(), productId: null, name: "", qtyMilli: 1000, unitPrice: 0, discountBps: 0, taxBps: this.defaultTaxBps, taxKey: String(this.defaultTaxBps), touched: false };
      this.rows = [...this.rows, row];
      this.focusId = row.id;
    },
    pick(this: EditorState, row: Row, productId: string | number | null) {
      const p = this.products.find((x) => x.id === String(productId));
      if (!p) return;
      if (row.productId === p.id && row.name === p.name && row.unitPrice === p.price) return;
      row.productId = p.id;
      row.name = p.name;
      row.unitPrice = p.price;
      if (p.taxBps !== undefined) {
        row.taxBps = p.taxBps;
        row.taxKey = String(p.taxBps);
      }
    },
    setTax(this: EditorState, row: Row, key: string | number | null) {
      if (key === null || key === undefined || key === "") return;
      row.taxBps = Number(key);
    },
    typed(this: EditorState, row: Row, text: string) {
      if (this.allowFreeLines) row.name = text;
    },
    step(this: EditorState, row: Row, by: number) {
      const q = row.qtyMilli / 1000;
      row.qtyMilli = (by < 0 ? Math.max(1, Math.floor(q - 1)) : Math.floor(q) + 1) * 1000;
    },
    move(this: EditorState, index: number, by: number) {
      const target = index + by;
      if (target < 0 || target >= this.rows.length) return;
      const next = [...this.rows];
      const [item] = next.splice(index, 1);
      if (item) next.splice(target, 0, item);
      this.rows = next;
    },
    duplicate(this: EditorState, index: number) {
      const source = this.rows[index];
      if (!source || !this.canAdd) return;
      this.rows = [...this.rows.slice(0, index + 1), { ...source, id: newId() }, ...this.rows.slice(index + 1)];
    },
    remove(this: EditorState, id: string) {
      this.rows = this.rows.filter((r) => r.id !== id);
    },
    /** Focuses the name input of a line that was just added. */
    focusNew(this: EditorState, row: Row, el: HTMLElement) {
      if (this.focusId !== row.id) return;
      this.focusId = null;
      this.$nextTick(() => el.querySelector<HTMLInputElement>('[data-slot="combobox-input"]')?.focus());
    },
  }));

  Alpine.data("nqLineItemDecimal", (options: { scale: number; kind: "qty" | "bps"; min?: number | null; max?: number | null; locale?: string }) => ({
    value: null as number | null,
    focused: false,
    text: "",
    scale: options.scale,
    kind: options.kind,
    min: options.min ?? null,
    max: options.max ?? null,
    locale: options.locale ?? "en",
    format(this: { kind: string }, v: number): string {
      return this.kind === "qty" ? quantityText(v / 1000) : bpsToPercentText(v);
    },
    get shown(): string {
      const s = this as unknown as { focused: boolean; text: string; value: number | null; format(v: number): string };
      return s.focused ? s.text : s.value === null ? "" : s.format(s.value);
    },
    get out(): boolean {
      const s = this as unknown as { value: number | null; min: number | null; max: number | null };
      return s.value !== null && ((s.min !== null && s.value < s.min) || (s.max !== null && s.value > s.max));
    },
    onFocus(this: { value: number | null; text: string; focused: boolean; format(v: number): string }, event: FocusEvent) {
      this.text = this.value === null ? "" : this.format(this.value);
      this.focused = true;
      (event.currentTarget as HTMLInputElement).select();
    },
    onInput(this: { value: number | null; text: string; scale: number; locale: string }, event: Event) {
      const el = event.target as HTMLInputElement;
      const plain = toPlainDecimal(el.value, this.locale);
      if (plain === null) {
        this.text = "";
        this.value = null;
        return;
      }
      const [whole = "0", fraction] = plain.replace("-", "").split(".");
      const clean = fraction === undefined ? whole : `${whole}.${fraction.slice(0, this.scale)}`;
      const scaled = plainToMinor(clean, this.scale, "truncate");
      if (scaled === null) return;
      this.text = clean;
      el.value = clean;
      if (scaled !== this.value) this.value = scaled;
    },
    field: {
      "x-bind:value"(this: { shown: string }) {
        return this.shown;
      },
      "x-bind:aria-invalid"(this: { out: boolean }) {
        return this.out ? "true" : undefined;
      },
      "x-on:focus"(this: { onFocus(e: FocusEvent): void }, event: FocusEvent) {
        this.onFocus(event);
      },
      "x-on:blur"(this: { focused: boolean }) {
        this.focused = false;
      },
      "x-on:input"(this: { onInput(e: Event): void }, event: Event) {
        this.onInput(event);
      },
    },
  }));
};
