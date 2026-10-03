// nqPosRegister: a touch point-of-sale register: product grid, basket, split-tender checkout, held sales and a cash-drawer session.
//
//   <section data-slot="pos-register" x-data="nqPosRegister({ products, categories, currency, locale, session, parked, t })"> … </section>
//
// Money is integer minor units end to end. The register records nothing itself; it fires bubbling, cancelable events on the root:
//   "nq-pos-session"   { session | null }                    the register was opened (session) or closed (null)
//   "nq-pos-parked"    { parked }                            the held list changed
//   "nq-pos-park"      { sale }                              the basket was put on hold
//   "nq-pos-resume"    { sale }                              a held sale went back into the basket
//   "nq-pos-checkout"  { sale, resolve(), reject(message), waitUntil(promise) }   a finished sale, tenders filled in
//   "nq-pos-close"     { report, resolve(), reject(message), waitUntil(promise) } the drawer count
// Nobody claimed a checkout / close (no waitUntil, resolve or reject call): it goes through at once. When a handler claims it the
// dialog stays busy until it settles, and a rejection keeps it open with an error. Re-render with the saved state afterwards.

import { computeLineItems } from "./line-item-logic";
import {
  posCanAddTender,
  posDrawerSummary,
  posQuickTenders,
  posRoundMinor,
  posSaleParts,
  posSettle,
  posTenderLimit,
  posVariance,
  type PosPaymentMethod,
  type PosTender,
} from "./pos-register-logic";
import type { Register } from "./types";

interface Product {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  price: number;
  taxBps?: number;
  category?: string;
  stock?: number;
}
interface Line {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  taxBps?: number;
}
interface Session {
  id: string;
  cashier: string;
  openedAt: string;
  openingFloat: number;
}
interface Totals {
  lines: { id: string; total: number }[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
}
interface Sale {
  id: string;
  number: string;
  at: string;
  cashier: string;
  lines: Line[];
  totals: Totals;
  method: PosPaymentMethod | "split";
  tendered: number;
  change: number;
  tenders: PosTender[];
  customerId: null;
}
interface Parked {
  id: string;
  at: string;
  cashier: string;
  note?: string;
  lines: Line[];
  totals: Totals;
}
type SaleRecord = Omit<Sale, "tenders"> & { tenders?: PosTender[] };

interface Config {
  products: Product[];
  categories?: { id: string; label: string }[];
  currency?: string;
  locale?: string;
  taxMode?: "exclusive" | "inclusive";
  defaultTaxBps?: number;
  session?: Session | null;
  cashier?: string;
  sales?: SaleRecord[];
  parked?: Parked[];
  t: Record<string, string>;
}

let counter = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(counter++).toString(36)}`;
const METHODS: PosPaymentMethod[] = ["cash", "card", "wallet"];

export const posRegister: Register = (Alpine) => {
  Alpine.data("nqPosRegister", (config: Config) => ({
    products: config.products,
    categories: config.categories ?? [],
    currency: config.currency ?? "USD",
    locale: config.locale ?? "en",
    taxMode: config.taxMode ?? "exclusive",
    defaultTaxBps: config.defaultTaxBps ?? 0,
    cashier: config.cashier ?? "",
    t: config.t,
    methods: METHODS,
    session: (config.session ?? null) as Session | null,
    sales: [...(config.sales ?? [])] as SaleRecord[],
    parked: [...(config.parked ?? [])] as Parked[],
    basket: [] as Line[],
    search: "",
    category: "all",
    floatMinor: 0 as number | null,
    holding: false,
    holdNote: "",
    parkedOpen: false,
    confirmOpen: false,
    confirmKind: "resume" as "resume" | "discard",
    confirmId: "",
    paying: false,
    closing: false,
    done: null as Sale | null,
    methodSel: ["cash"] as string[],
    amount: null as number | null,
    tenders: [] as PosTender[],
    payBusy: false,
    payError: false,
    counted: null as number | null,
    closeBusy: false,
    closeError: false,

    init() {
      this.$watch("paying", (v: boolean) => {
        if (v && !this.done) this.resetPay();
        if (!v) this.done = null;
      });
      this.$watch("closing", (v: boolean) => {
        if (v) {
          this.counted = null;
          this.closeError = false;
        }
      });
      this.$watch("holding", (v: boolean) => {
        if (v) this.holdNote = "";
      });
    },

    /* ------------------------------------------------------------- format */
    get tag(): string {
      return new Intl.Locale(this.locale, { numberingSystem: "latn" }).toString();
    },
    money(minor: number, sign = false): string {
      const decimals = new Intl.NumberFormat("en", { style: "currency", currency: this.currency }).resolvedOptions().maximumFractionDigits ?? 2;
      const major = minor / 10 ** decimals;
      try {
        return new Intl.NumberFormat(this.tag, { style: "currency", currency: this.currency, signDisplay: sign ? "exceptZero" : "auto" }).format(major);
      } catch {
        return major.toFixed(decimals);
      }
    },
    time(iso: string): string {
      return new Intl.DateTimeFormat(this.tag, { timeStyle: "short" }).format(new Date(iso));
    },
    methodLabel(id: string): string {
      return this.t[id] ?? id;
    },

    /* ------------------------------------------------------------- basket */
    get totals(): Totals {
      return computeLineItems(
        this.basket.map((l: Line) => ({ id: l.id, quantity: l.quantity, unitPrice: l.unitPrice, taxBps: l.taxBps })),
        { taxMode: this.taxMode, defaultTaxBps: this.defaultTaxBps },
      ) as unknown as Totals;
    },
    get itemCount(): number {
      return this.basket.reduce((n: number, l: Line) => n + l.quantity, 0);
    },
    get noVisible(): boolean {
      return this.visible.length === 0;
    },
    get noBasket(): boolean {
      return this.basket.length === 0;
    },
    get hasDiscount(): boolean {
      return this.totals.discountTotal !== 0;
    },
    get hasBasket(): boolean {
      return this.basket.length > 0;
    },
    inBasket(productId: string): number {
      return this.basket.filter((l: Line) => l.productId === productId).reduce((n: number, l: Line) => n + l.quantity, 0);
    },
    available(p: Product): number {
      return p.stock === undefined || p.stock === null ? Infinity : p.stock - this.inBasket(p.id);
    },
    isOut(p: Product): boolean {
      return this.available(p) <= 0;
    },
    isLow(p: Product): boolean {
      const left = this.available(p);
      return left > 0 && p.stock !== undefined && p.stock !== null && left <= 10;
    },
    get categoryTabs() {
      return [{ id: "all", label: this.t.all }, ...this.categories];
    },
    get visible(): Product[] {
      const q = this.search.trim().toLowerCase();
      return this.products.filter(
        (p: Product) => (this.category === "all" || p.category === this.category) && (!q || p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.barcode === q),
      );
    },
    add(p: Product) {
      if (this.available(p) <= 0) return;
      const found = this.basket.find((l: Line) => l.productId === p.id);
      if (found) this.basket = this.basket.map((l: Line) => (l.id === found.id ? { ...l, quantity: l.quantity + 1 } : l));
      else this.basket = [...this.basket, { id: uid("pos"), productId: p.id, name: p.name, quantity: 1, unitPrice: p.price, taxBps: p.taxBps }];
    },
    bump(id: string, by: number) {
      this.basket = this.basket.flatMap((l: Line) => (l.id !== id ? [l] : l.quantity + by <= 0 ? [] : [{ ...l, quantity: l.quantity + by }]));
    },
    canBump(l: Line): boolean {
      const p = this.products.find((x: Product) => x.id === l.productId);
      return !p || this.available(p) > 0;
    },
    inc(l: Line) {
      if (this.canBump(l)) this.bump(l.id, 1);
    },
    dec(l: Line) {
      this.bump(l.id, -1);
    },
    remove(l: Line) {
      this.bump(l.id, -l.quantity);
    },
    clear() {
      this.basket = [];
    },
    lineTotal(id: string): number {
      return this.totals.lines.find((x: { id: string; total: number }) => x.id === id)?.total ?? 0;
    },
    scan() {
      const code = this.search.trim();
      const c = code.toLowerCase();
      if (!c) return;
      const visible = this.visible;
      const hit = this.products.find((p: Product) => p.barcode === code || p.sku?.toLowerCase() === c) ?? (visible.length === 1 ? visible[0] : undefined);
      if (hit) {
        this.add(hit);
        this.search = "";
      }
    },
    focusSearch() {
      this.$nextTick(() => (this.$refs.searchWrap?.querySelector("input") as HTMLInputElement | null)?.focus());
    },

    /* ------------------------------------------------------------ session */
    openRegister() {
      this.sales = [];
      this.basket = [];
      this.session = { id: uid("session"), cashier: this.cashier, openedAt: new Date().toISOString(), openingFloat: this.floatMinor ?? 0 };
      this.emit("nq-pos-session", { session: this.session });
    },
    emit(name: string, detail: Record<string, unknown>) {
      (this.$root as HTMLElement).dispatchEvent(new CustomEvent(name, { bubbles: true, cancelable: true, detail }));
    },
    /** Fires a claimable event and resolves once whoever claimed it settles (at once when nobody did). */
    async claim(name: string, detail: Record<string, unknown>): Promise<void> {
      let claimed: Promise<unknown> | null = null;
      const take = (p: Promise<unknown>) => (claimed = claimed ?? p);
      const event = new CustomEvent(name, {
        bubbles: true,
        cancelable: true,
        detail: {
          ...detail,
          waitUntil: (p: Promise<unknown>) => void take(Promise.resolve(p)),
          resolve: () => void take(Promise.resolve()),
          reject: (message?: string) => void take(Promise.reject(new Error(message ?? ""))),
        },
      });
      (this.$root as HTMLElement).dispatchEvent(event);
      if (claimed) await claimed;
    },

    /* --------------------------------------------------------------- hold */
    get hasParked(): boolean {
      return this.parked.length > 0;
    },
    get noParked(): boolean {
      return this.parked.length === 0;
    },
    get parkedNewest(): Parked[] {
      return [...this.parked].reverse();
    },
    parkedCount(sale: Parked): number {
      return sale.lines.reduce((n, l) => n + l.quantity, 0);
    },
    setParked(next: Parked[]) {
      this.parked = next;
      this.emit("nq-pos-parked", { parked: next });
    },
    park() {
      const note = this.holdNote.trim();
      const sale: Parked = { id: uid("parked"), at: new Date().toISOString(), cashier: this.session?.cashier ?? this.cashier, ...(note ? { note } : {}), lines: this.basket, totals: this.totals };
      this.setParked([...this.parked, sale]);
      this.basket = [];
      this.emit("nq-pos-park", { sale });
      this.holding = false;
      this.focusSearch();
    },
    resume(sale: Parked) {
      this.setParked(this.parked.filter((p: Parked) => p.id !== sale.id));
      this.basket = sale.lines;
      this.emit("nq-pos-resume", { sale });
      this.parkedOpen = false;
    },
    discard(sale: Parked) {
      this.setParked(this.parked.filter((p: Parked) => p.id !== sale.id));
    },
    askResume(sale: Parked) {
      if (this.basket.length > 0) this.ask("resume", sale);
      else this.resume(sale);
    },
    ask(kind: "resume" | "discard", sale: Parked) {
      this.confirmKind = kind;
      this.confirmId = sale.id;
      this.confirmOpen = true;
    },
    get isDiscard(): boolean {
      return this.confirmKind === "discard";
    },
    confirm() {
      const sale = this.parked.find((p: Parked) => p.id === this.confirmId);
      if (!sale) return;
      if (this.confirmKind === "discard") this.discard(sale);
      else this.resume(sale);
    },

    /* ------------------------------------------------------------- drawer */
    get drawer() {
      return posDrawerSummary(
        this.session?.openingFloat ?? 0,
        this.sales.map((s: SaleRecord) => ({ method: s.method === "split" ? "cash" : s.method, total: s.totals.total, parts: s.tenders ? posSaleParts(s.totals.total, s.tenders) : undefined })),
      );
    },
    get variance(): number | null {
      return this.counted === null ? null : posVariance(this.drawer.expectedCash, this.counted);
    },
    get hasVariance(): boolean {
      return this.variance !== null;
    },
    get varExact(): boolean {
      return this.variance === 0;
    },
    get varShort(): boolean {
      return this.variance !== null && this.variance < 0;
    },
    get varOver(): boolean {
      return this.variance !== null && this.variance > 0;
    },
    get noCount(): boolean {
      return this.counted === null;
    },
    async submitClose() {
      if (this.counted === null || this.closeBusy) return;
      this.closeBusy = true;
      this.closeError = false;
      try {
        const report = { ...this.drawer, session: this.session, counted: this.counted, variance: posVariance(this.drawer.expectedCash, this.counted), closedAt: new Date().toISOString() };
        await this.claim("nq-pos-close", { report });
        this.closing = false;
        this.basket = [];
        this.session = null;
        this.emit("nq-pos-session", { session: null });
      } catch {
        this.closeError = true;
      } finally {
        this.closeBusy = false;
      }
    },

    /* ----------------------------------------------------------- checkout */
    get due(): number {
      return this.done ? this.done.totals.total : this.totals.total;
    },
    get curMethod(): PosPaymentMethod {
      return (this.methodSel[0] ?? "cash") as PosPaymentMethod;
    },
    get isCash(): boolean {
      return this.curMethod === "cash";
    },
    get base() {
      return posSettle(this.due, this.tenders);
    },
    /** On a first tender, card and wallet left empty mean the whole sale. After that, and for cash, empty means nothing yet. */
    get entered(): number {
      return this.amount === null ? (this.curMethod === "cash" || this.tenders.length > 0 ? 0 : this.base.remaining) : posRoundMinor(this.amount);
    },
    get limit(): number {
      return posTenderLimit(this.due, this.tenders, this.curMethod);
    },
    get over(): boolean {
      return this.amount !== null && this.entered > this.limit;
    },
    get canAdd(): boolean {
      return posCanAddTender(this.due, this.tenders, this.curMethod, this.entered);
    },
    get allTenders(): PosTender[] {
      return this.canAdd ? [...this.tenders, { id: uid("tender"), method: this.curMethod, amount: this.entered }] : this.tenders;
    },
    get settlement() {
      return posSettle(this.due, this.allTenders);
    },
    get complete(): boolean {
      return this.base.remaining <= 0;
    },
    get cashOpen(): boolean {
      return this.curMethod === "cash" && !this.complete;
    },
    get showChange(): boolean {
      return this.cashOpen || this.settlement.change > 0;
    },
    get quicks(): number[] {
      return this.curMethod === "cash" ? posQuickTenders(this.base.remaining, this.currency) : [this.base.remaining];
    },
    get cannotConfirm(): boolean {
      return !this.settlement.settled || this.over;
    },
    get confirmDisabled(): boolean {
      return this.cannotConfirm || this.payBusy;
    },
    get cannotAdd(): boolean {
      return !this.canAdd || this.payBusy;
    },
    get hasTenders(): boolean {
      return this.tenders.length > 0;
    },
    get hasPaid(): boolean {
      return this.settlement.paid > 0;
    },
    get hasRemaining(): boolean {
      return this.settlement.remaining > 0;
    },
    get notComplete(): boolean {
      return !this.complete;
    },
    get noSession(): boolean {
      return !this.session;
    },
    get floatMissing(): boolean {
      return this.floatMinor === null;
    },
    resetPay() {
      this.tenders = [];
      this.amount = null;
      this.methodSel = ["cash"];
      this.payError = false;
    },
    pickMethod(m: string) {
      this.methodSel = [m];
    },
    addTender() {
      if (!this.canAdd) return;
      this.tenders = [...this.tenders, { id: uid("tender"), method: this.curMethod, amount: this.entered }];
      this.amount = null;
      this.payError = false;
    },
    removeTender(id: string) {
      this.tenders = this.tenders.filter((x: PosTender) => x.id !== id);
    },
    async submitPay() {
      if (this.payBusy || this.over) return;
      if (!this.settlement.settled) {
        this.addTender();
        return;
      }
      const tenders: PosTender[] = [...this.allTenders];
      const total = this.totals.total;
      const settled = posSettle(total, tenders);
      const sale: Sale = {
        id: uid("sale"),
        number: `POS-${String(1001 + this.sales.length)}`,
        at: new Date().toISOString(),
        cashier: this.session?.cashier ?? "",
        lines: this.basket,
        totals: this.totals,
        method: tenders.length === 1 && tenders[0] ? tenders[0].method : "split",
        tendered: settled.paid,
        change: settled.change,
        tenders,
        customerId: null,
      };
      this.payBusy = true;
      this.payError = false;
      try {
        await this.claim("nq-pos-checkout", { sale });
        this.sales = [...this.sales, sale];
        this.basket = [];
        this.done = sale;
      } catch {
        this.payError = true;
      } finally {
        this.payBusy = false;
      }
    },
    newSale() {
      this.paying = false;
      this.done = null;
      this.focusSearch();
    },
    get doneShowsPaid(): boolean {
      return !!this.done && this.done.tenders.length > 1;
    },
    get doneShowsChange(): boolean {
      return !!this.done && (this.done.change > 0 || this.done.method === "cash");
    },
  }));
};
