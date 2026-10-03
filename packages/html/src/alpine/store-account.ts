// nqStoreOrderHistory / nqStoreAccountOrder / nqStoreReturnRequest / nqStoreReturnStatus / nqStoreWishlist /
// nqStoreAddressBook / nqStoreRecentlyViewed: the customer account of the Blade store-account components. The markup is the
// React StoreAccount's; the state lives here and the maths comes from store-account-logic.ts (the same pure code as the React kit).
//
//   <div data-slot="store-order-history" x-data="nqStoreOrderHistory(config)"> … </div>
//
// Money is integer minor units; `config.currency` is the ISO code (USD, or SAR in Arabic) and `config.t` the strings.
// Events (bubbling, from the root):
//   "nq-open-order"     { order }                         history: a row was opened
//   "nq-reorder"        { order, plan }                   history / order: "Order again" with the lines that can go in the cart
//   "nq-open-cart"      {}                                the "Go to cart" button of the reorder notice
//   "nq-retry"          {}                                the error state's retry button
//   "nq-return"         { order }                         order: "Return items"
//   "nq-back"           {}                                order / return request: the back button
//   "nq-return-submit"  { submission }                    return request: a valid request ({ orderId, lines, reason, note, photos, refundMethod, refundAmount })
//   "nq-cancel-return"  { request }                       return status: the cancel was confirmed
//   "nq-move-to-cart"   { entry }   "nq-toggle-notify" { item }   "nq-remove" { item | id }   "nq-open-product" { product }   (wishlist, recently viewed)
//   "nq-address-change" { addresses }                     address book: the whole new book
//   "nq-clear"          {}                                recently viewed: clear all

import {
  type CommerceAddress,
  type CommerceOrder,
  type CommerceProduct,
  type ReorderPlan,
  type ReturnReason,
  type RefundMethod,
  type ReturnRequest,
  type WishlistItem,
  type OrderGroup,
  ORDER_GROUPS,
  backInStock,
  commerceMinorFactor,
  deliveredAt,
  filterCustomerOrders,
  lineFulfilled,
  lineRefunded,
  newestOrdersFirst,
  orderGroupCounts,
  planReturn,
  reasonNeedsPhotos,
  refundMethodsFor,
  removeAddress,
  removeRecent,
  removeWishlistItem,
  reorderPlan,
  returnWindow,
  returnableLines,
  rmaIsOpen,
  rmaSteps,
  setDefaultAddress,
  toggleNotify,
  upsertAddress,
  validateAddress,
  addressLines,
  wishlistEntries,
} from "./store-account-logic";
import type { Register } from "./types";

type Chip = { label: string; variant: string };
interface Labels {
  status: Record<string, Chip>;
  payment: Record<string, Chip>;
  fulfilment: Record<string, Chip>;
}
interface Base {
  locale?: string;
  currency: string;
  t: Record<string, any>;
  labels?: Labels;
}

const CHIP: Record<string, string> = {
  neutral: "border-border bg-secondary text-foreground",
  success: "border-nq-success/40 bg-nq-success-soft text-nq-success-text",
  warning: "border-nq-warning/40 bg-nq-warning-soft text-nq-warning-text",
  danger: "border-nq-danger/40 bg-nq-danger-soft text-nq-danger-text",
  info: "border-nq-info/40 bg-nq-info-soft text-nq-info-text",
};
const RMA_VARIANT: Record<string, string> = { requested: "warning", approved: "info", "shipped-back": "info", received: "info", refunded: "success", rejected: "danger", cancelled: "neutral" };
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
let counter = 0;

/** The carrier link of a shipment: its own url, else the template with the number filled in. */
function trackingUrl(tracking: { number?: string; url?: string } | undefined, template?: string | null): string | undefined {
  if (!tracking) return undefined;
  if (tracking.url) return tracking.url;
  return template && tracking.number ? template.replace("{number}", encodeURIComponent(tracking.number)) : undefined;
}

/** Formatting and string helpers every component of the module shares. Methods only, so they spread safely. */
function helpers(config: Base) {
  const tag = new Intl.Locale(config.locale ?? "en", { numberingSystem: "latn" }).toString();
  const factor = commerceMinorFactor(config.currency);
  const digits = Math.round(Math.log10(factor));
  const money = new Intl.NumberFormat(tag, { style: "currency", currency: config.currency, minimumFractionDigits: digits, maximumFractionDigits: digits });
  const numbers = new Intl.NumberFormat(tag, { maximumFractionDigits: 3 });
  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames([tag], { type: "region" });
  } catch {
    names = null;
  }
  const tt = (key: string, vars: Record<string, string | number> = {}): string => String(config.t[key] ?? key).replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
  const tn = (key: string, n: number): string => (n === 1 && config.t[`${key}One`] ? String(config.t[`${key}One`]) : tt(key, { n: numbers.format(n) }));
  return {
    t: config.t,
    currency: config.currency,
    labels: (config.labels ?? { status: {}, payment: {}, fulfilment: {} }) as Labels,
    tt,
    tn,
    money(minor: number, negative = false): string {
      return money.format((negative ? -Math.abs(minor) : minor) / factor);
    },
    num(n: number): string {
      return numbers.format(n);
    },
    date(iso: string | undefined, style: "medium" | "long" = "medium"): string {
      if (!iso) return "";
      return new Intl.DateTimeFormat(tag, { dateStyle: style, timeZone: "UTC" }).format(new Date(iso));
    },
    chipClass(variant: string): string {
      return CHIP[variant] ?? CHIP.neutral!;
    },
    statusChip(status: string): Chip {
      return (config.labels?.status ?? {})[status] ?? { label: status, variant: "neutral" };
    },
    rmaChip(status: string): Chip {
      return { label: (config.t.rmaStatus ?? {})[status] ?? status, variant: RMA_VARIANT[status] ?? "neutral" };
    },
    countryName(code: string): string {
      try {
        return names?.of(code) ?? code;
      } catch {
        return code;
      }
    },
    /** What "Order again" did, as lines of text: added / reduced / skipped / price change. Safe on null. */
    noticeView(plan: ReorderPlan | null) {
      const added = plan?.add.length ?? 0;
      return {
        title: !plan ? "" : added > 0 ? tn("reorderAdded", added) : String(config.t.reorderNothing),
        reduced: plan && plan.reduced.length > 0 ? tn("reorderReduced", plan.reduced.length) : "",
        skipped: plan && plan.skipped.length > 0 && added > 0 ? tn("reorderSkipped", plan.skipped.length) : "",
        price: plan?.add.some((l) => l.priceChanged) ? String(config.t.reorderPriceChanged) : "",
        cart: added > 0,
      };
    },
    lineCount(order: CommerceOrder): number {
      return order.lines.reduce((s, l) => s + l.quantity, 0);
    },
  };
}

interface HistoryConfig extends Base {
  orders: CommerceOrder[];
  products?: CommerceProduct[];
  trackingTemplate?: string | null;
  loading?: boolean;
  error?: boolean;
}
interface OrderConfig extends Base {
  order: CommerceOrder;
  requests?: ReturnRequest[];
  products?: CommerceProduct[];
  trackingTemplate?: string | null;
  returnDays?: number;
  now?: string;
}
interface ReturnRequestConfig extends Base {
  order: CommerceOrder;
  requests?: ReturnRequest[];
  returnDays?: number;
  now?: string;
  maxPhotos?: number;
  canBack?: boolean;
}
interface StatusConfig extends Base {
  request: ReturnRequest;
  order: Pick<CommerceOrder, "lines" | "number">;
  canCancel?: boolean;
}
interface WishlistConfig extends Base {
  items: WishlistItem[];
  products: CommerceProduct[];
  loading?: boolean;
  error?: boolean;
}
interface AddressConfig extends Base {
  addresses: CommerceAddress[];
  countries: string[];
  loading?: boolean;
  error?: boolean;
}
interface RecentConfig extends Base {
  ids: string[];
  products: CommerceProduct[];
  loading?: boolean;
  canClear?: boolean;
  canRemove?: boolean;
}

export const storeAccount: Register = (Alpine) => {
  const send = (root: Element, name: string, detail: Record<string, unknown> = {}) => root.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));

  /* ------------------------------------------------------------------ order history */
  Alpine.data("nqStoreOrderHistory", (config: HistoryConfig) => ({
    ...helpers(config),
    orders: [...config.orders] as CommerceOrder[],
    products: config.products ?? [],
    loading: Boolean(config.loading),
    error: Boolean(config.error),
    group: "all" as OrderGroup,
    picked: ["all"] as string[],
    query: "",
    notice: null as ReorderPlan | null,
    root: null as Element | null,

    init() {
      this.root = (this as any).$root;
      (this as any).$watch("picked", (v: string[]) => {
        if (v[0]) this.group = v[0] as OrderGroup;
        else this.picked = [this.group];
      });
    },
    get groups(): readonly OrderGroup[] {
      return ORDER_GROUPS;
    },
    get counts(): Record<string, number> {
      return orderGroupCounts(this.orders);
    },
    get shown(): CommerceOrder[] {
      return newestOrdersFirst(filterCustomerOrders(this.orders, { group: this.group, query: this.query }));
    },
    get filtered(): boolean {
      return this.orders.length > 0;
    },
    get noMatch(): boolean {
      return this.orders.length > 0 && this.shown.length === 0;
    },
    hasTrack(order: CommerceOrder): boolean {
      return this.trackUrl(order) !== "";
    },
    thumbs(order: CommerceOrder) {
      return order.lines.slice(0, 4);
    },
    more(order: CommerceOrder): number {
      return Math.max(0, order.lines.length - 4);
    },
    trackUrl(order: CommerceOrder): string {
      return trackingUrl(order.tracking, config.trackingTemplate) ?? "";
    },
    open(order: CommerceOrder) {
      send(this.root!, "nq-open-order", { order });
    },
    reorder(order: CommerceOrder) {
      const plan = reorderPlan(order, this.products);
      this.notice = plan;
      if (plan.add.length) send(this.root!, "nq-reorder", { order, plan });
    },
    openCart() {
      send(this.root!, "nq-open-cart");
    },
    retry() {
      send(this.root!, "nq-retry");
    },
    clear() {
      this.group = "all";
      this.picked = ["all"];
      this.query = "";
    },
  }));

  /* ------------------------------------------------------------------ one order */
  Alpine.data("nqStoreAccountOrder", (config: OrderConfig) => ({
    ...helpers(config),
    order: config.order,
    products: config.products ?? [],
    notice: null as ReorderPlan | null,
    root: null as Element | null,

    init() {
      this.root = (this as any).$root;
    },
    get delivered(): string | undefined {
      return deliveredAt(this.order);
    },
    get win() {
      return returnWindow(this.delivered, config.returnDays ?? 30, config.now ? new Date(config.now) : new Date());
    },
    get canReturn(): boolean {
      return this.win.open && returnableLines(this.order, config.requests ?? []).some((r) => r.returnable > 0);
    },
    get windowText(): string {
      return !this.delivered ? String(this.t.returnNotYet) : this.win.open ? this.tn("returnDaysLeft", this.win.daysLeft) : String(this.t.returnClosed);
    },
    get address(): string {
      const a = this.order.shippingAddress;
      return a ? [a.region, a.city].filter(Boolean).join(config.locale === "ar" ? "، " : ", ") : "";
    },
    shipped(line: CommerceOrder["lines"][number]): string {
      const n = lineFulfilled(line);
      return n > 0 && n < line.quantity ? this.tt("shippedQty", { n }) : "";
    },
    refunded(line: CommerceOrder["lines"][number]): string {
      const n = lineRefunded(line);
      return n > 0 ? this.tt("refundedQty", { n }) : "";
    },
    reorder() {
      const plan = reorderPlan(this.order, this.products);
      this.notice = plan;
      if (plan.add.length) send(this.root!, "nq-reorder", { order: this.order, plan });
    },
    openCart() {
      send(this.root!, "nq-open-cart");
    },
    startReturn() {
      send(this.root!, "nq-return", { order: this.order });
    },
    back() {
      send(this.root!, "nq-back");
    },
  }));

  /* ------------------------------------------------------------------ return request */
  Alpine.data("nqStoreReturnRequest", (config: ReturnRequestConfig) => {
    // Chosen files live outside the reactive state (a File cannot sit behind a proxy).
    const files = new Map<string, File>();
    const maxPhotos = config.maxPhotos ?? 5;
    return {
      ...helpers(config),
      order: config.order,
      qty: {} as Record<string, number>,
      reason: "",
      note: "",
      method: refundMethodsFor(config.order)[0] ?? "",
      photos: [] as { id: string; name: string; url: string }[],
      photoError: "",
      tried: false,
      root: null as Element | null,

      init() {
        this.root = (this as any).$root;
        for (const row of returnableLines(this.order, config.requests ?? [])) this.qty[row.line.id] = 0;
      },
      get rows() {
        return returnableLines(this.order, config.requests ?? []);
      },
      get win() {
        return returnWindow(deliveredAt(this.order), config.returnDays ?? 30, config.now ? new Date(config.now) : new Date());
      },
      get windowText(): string {
        return this.win.open ? this.tn("windowOpen", this.win.daysLeft) : String(this.t.windowShut);
      },
      get picks() {
        return Object.entries(this.qty)
          .filter(([, q]) => (q as number) > 0)
          .map(([lineId, quantity]) => ({ lineId, quantity }));
      },
      get plan() {
        return planReturn(this.order, config.requests ?? [], {
          picks: this.picks,
          reason: (this.reason || undefined) as ReturnReason | undefined,
          note: this.note,
          photos: this.photos.length,
          refundMethod: (this.method || undefined) as RefundMethod | undefined,
          windowOpen: this.win.open,
        });
      },
      get needsPhotos(): boolean {
        return reasonNeedsPhotos((this.reason || undefined) as ReturnReason | undefined);
      },
      get estimate(): string {
        return this.money(this.plan.refundAmount);
      },
      has(code: string): boolean {
        return this.tried && this.plan.issues.some((i: { code: string }) => i.code === code);
      },
      get bad(): Record<string, string | null> {
        return { reason: this.has("reason") ? "true" : null, note: this.has("note") ? "true" : null };
      },
      atMin(id: string): boolean {
        return (this.qty[id] ?? 0) <= 0;
      },
      atMax(id: string, max: number): boolean {
        return (this.qty[id] ?? 0) >= max;
      },
      get photoHint(): string {
        return String(this.needsPhotos ? this.t.photosNeeded : this.t.photosOptional);
      },
      qtyOf(id: string): number {
        return this.qty[id] ?? 0;
      },
      isOn(id: string): boolean {
        return (this.qty[id] ?? 0) > 0;
      },
      set(id: string, value: number, max: number) {
        this.qty[id] = Math.min(Math.max(value, 0), max);
      },
      toggle(id: string, max: number, on: boolean) {
        this.set(id, on ? 1 : 0, max);
      },
      over(id: string): string {
        const issue = this.plan.issues.find((i: any) => i.code === "line-over" && i.lineId === id);
        return issue && issue.code === "line-over" ? this.tt("issueLineOver", { n: issue.max }) : "";
      },
      leftText(row: { returnable: number; inRequest: number }): string {
        const left = row.returnable > 0 ? this.tt("returnableLeft", { n: row.returnable }) : String(this.t.notReturnable);
        return row.inRequest > 0 ? `${left} · ${this.tt("inRequest", { n: row.inRequest })}` : left;
      },
      qtyLabel(name: string): string {
        return `${this.t.quantity}: ${name}`;
      },
      pickFiles(event: Event) {
        const input = event.target as HTMLInputElement;
        this.photoError = "";
        for (const file of Array.from(input.files ?? [])) {
          if (!file.type.startsWith("image/") || file.size > MAX_PHOTO_BYTES) {
            this.photoError = String(this.t.photoRejected);
            continue;
          }
          if (this.photos.length >= maxPhotos) {
            this.photoError = this.tt("tooManyPhotos", { n: maxPhotos });
            break;
          }
          const id = `ph-${++counter}`;
          files.set(id, file);
          this.photos.push({ id, name: file.name, url: URL.createObjectURL(file) });
        }
        input.value = "";
      },
      removePhoto(id: string) {
        const photo = this.photos.find((p: { id: string; url: string }) => p.id === id);
        if (photo) URL.revokeObjectURL(photo.url);
        files.delete(id);
        this.photos = this.photos.filter((p: { id: string }) => p.id !== id);
      },
      removeLabel(photo: { name: string }): string {
        return `${this.t.removePhoto}: ${photo.name}`;
      },
      submit() {
        this.tried = true;
        const plan = this.plan;
        if (!plan.ok || !this.reason || !this.method) return;
        send(this.root!, "nq-return-submit", {
          submission: {
            orderId: this.order.id,
            lines: plan.picks,
            reason: this.reason,
            note: this.note.trim(),
            photos: this.photos.map((p: { id: string }) => files.get(p.id)).filter(Boolean),
            refundMethod: this.method,
            refundAmount: plan.refundAmount,
          },
        });
      },
      back() {
        send(this.root!, "nq-back");
      },
    };
  });

  /* ------------------------------------------------------------------ return status */
  Alpine.data("nqStoreReturnStatus", (config: StatusConfig) => ({
    ...helpers(config),
    request: config.request,
    confirm: false,
    root: null as Element | null,

    init() {
      this.root = (this as any).$root;
    },
    get steps() {
      return rmaSteps(this.request.status, this.request.stoppedAfter);
    },
    get stopped(): boolean {
      return this.request.status === "rejected" || this.request.status === "cancelled";
    },
    get canCancel(): boolean {
      return Boolean(config.canCancel) && (this.request.status === "requested" || this.request.status === "approved") && rmaIsOpen(this.request.status);
    },
    get hint(): string {
      return String((this.t.rmaHint ?? {})[this.request.status] ?? "");
    },
    get methodText(): string {
      return String((this.t.methods ?? {})[this.request.refundMethod] ?? "");
    },
    stepLabel(key: string): string {
      return String((this.t.rmaStatus ?? {})[key] ?? key);
    },
    stepClass(state: string): string {
      const edge = state === "done" ? "border-primary" : state === "current" ? "border-primary/50" : state === "skipped" ? "border-dashed border-border" : "border-border";
      return `${edge} ${state === "upcoming" || state === "skipped" ? "text-muted-foreground" : "text-foreground"}`;
    },
    lineName(id: string): string {
      return config.order.lines.find((l) => l.id === id)?.name ?? id;
    },
    cancel() {
      this.confirm = false;
      send(this.root!, "nq-cancel-return", { request: this.request });
    },
  }));

  /* ------------------------------------------------------------------ wishlist */
  Alpine.data("nqStoreWishlist", (config: WishlistConfig) => ({
    ...helpers(config),
    items: [...config.items] as WishlistItem[],
    products: config.products,
    loading: Boolean(config.loading),
    error: Boolean(config.error),
    root: null as Element | null,

    init() {
      this.root = (this as any).$root;
    },
    get entries() {
      return wishlistEntries(this.items, this.products);
    },
    get returned(): string {
      const n = backInStock(this.items, this.products).length;
      return n > 0 ? this.tn("backInStock", n) : "";
    },
    imageOf(entry: ReturnType<typeof wishlistEntries>[number]): string {
      return entry.variant?.image ?? entry.product?.images[0]?.src ?? "";
    },
    badge(entry: ReturnType<typeof wishlistEntries>[number]): Chip {
      const a = entry.availability;
      if (a === "in-stock") return { label: String(this.t.inStock), variant: "success" };
      if (a === "low") return { label: this.tt("lowStock", { n: entry.stock ?? 0 }), variant: "warning" };
      if (a === "out") return { label: String(this.t.outOfStock), variant: "neutral" };
      return { label: String(this.t.unavailable), variant: "danger" };
    },
    pressed(entry: ReturnType<typeof wishlistEntries>[number]): string {
      return entry.item.notify ? "true" : "false";
    },
    removeLabel(entry: ReturnType<typeof wishlistEntries>[number]): string {
      return `${this.t.remove}: ${entry.product?.name ?? ""}`;
    },
    openProduct(entry: ReturnType<typeof wishlistEntries>[number]) {
      if (entry.product) send(this.root!, "nq-open-product", { product: entry.product });
    },
    moveToCart(entry: ReturnType<typeof wishlistEntries>[number]) {
      send(this.root!, "nq-move-to-cart", { entry });
    },
    notify(entry: ReturnType<typeof wishlistEntries>[number]) {
      this.items = toggleNotify(this.items, entry.item.id);
      send(this.root!, "nq-toggle-notify", { item: this.items.find((i: WishlistItem) => i.id === entry.item.id) ?? entry.item });
    },
    remove(entry: ReturnType<typeof wishlistEntries>[number]) {
      this.items = removeWishlistItem(this.items, entry.item.id);
      send(this.root!, "nq-remove", { item: entry.item });
    },
    retry() {
      send(this.root!, "nq-retry");
    },
  }));

  /* ------------------------------------------------------------------ address book */
  const EMPTY = (): CommerceAddress => ({ name: "", phone: "", line1: "", line2: "", city: "", region: "", postalCode: "", country: "SA" });
  Alpine.data("nqStoreAddressBook", (config: AddressConfig) => ({
    ...helpers(config),
    addresses: [...config.addresses] as CommerceAddress[],
    countries: config.countries,
    loading: Boolean(config.loading),
    error: Boolean(config.error),
    dialogOpen: false,
    deleteOpen: false,
    draft: EMPTY(),
    tried: false,
    target: null as CommerceAddress | null,
    root: null as Element | null,

    init() {
      this.root = (this as any).$root;
    },
    get problems(): Record<string, string | undefined> {
      return validateAddress(this.draft);
    },
    lines(a: CommerceAddress): string[] {
      return addressLines(a);
    },
    problemText(field: string): string {
      const p = this.tried ? this.problems[field] : undefined;
      return p ? String(p === "required" ? this.t.required : this.t.invalid) : "";
    },
    get bad(): Record<string, string | null> {
      return Object.fromEntries(["name", "phone", "line1", "city", "postalCode", "country"].map((f) => [f, this.problemText(f) ? "true" : null]));
    },
    get errs(): Record<string, string> {
      return Object.fromEntries(["name", "phone", "line1", "city", "postalCode", "country"].map((f) => [f, this.problemText(f)]));
    },
    openNew() {
      this.tried = false;
      this.draft = EMPTY();
      this.dialogOpen = true;
    },
    openEdit(a: CommerceAddress) {
      this.tried = false;
      this.draft = { ...EMPTY(), ...a };
      this.dialogOpen = true;
    },
    save() {
      this.tried = true;
      if (Object.keys(validateAddress(this.draft)).length > 0) return;
      const clean: CommerceAddress = { ...this.draft };
      for (const key of ["phone", "line2", "region", "postalCode"] as const) if (!clean[key]?.trim()) delete clean[key];
      this.commit(upsertAddress(this.addresses, clean, () => `addr-${++counter}`));
      this.dialogOpen = false;
    },
    makeDefault(a: CommerceAddress) {
      if (a.id) this.commit(setDefaultAddress(this.addresses, a.id));
    },
    askDelete(a: CommerceAddress) {
      this.target = a;
      this.deleteOpen = true;
    },
    confirmDelete() {
      if (this.target?.id) this.commit(removeAddress(this.addresses, this.target.id));
      this.target = null;
      this.deleteOpen = false;
    },
    commit(next: CommerceAddress[]) {
      this.addresses = next;
      send(this.root!, "nq-address-change", { addresses: next });
    },
    retry() {
      send(this.root!, "nq-retry");
    },
  }));

  /* ------------------------------------------------------------------ recently viewed */
  Alpine.data("nqStoreRecentlyViewed", (config: RecentConfig) => ({
    ...helpers(config),
    ids: [...config.ids] as string[],
    products: config.products,
    loading: Boolean(config.loading),
    root: null as Element | null,

    init() {
      this.root = (this as any).$root;
    },
    get shown(): CommerceProduct[] {
      return this.ids.map((id: string) => this.products.find((p: CommerceProduct) => p.id === id && p.status !== "archived")).filter((p: CommerceProduct | undefined): p is CommerceProduct => !!p);
    },
    get any(): boolean {
      return this.shown.length > 0;
    },
    minPrice(product: CommerceProduct): number {
      return Math.min(...product.variants.map((v) => v.price));
    },
    viewLabel(product: CommerceProduct): string {
      return `${this.t.viewProduct}: ${product.name}`;
    },
    removeLabel(product: CommerceProduct): string {
      return `${this.t.remove}: ${product.name}`;
    },
    open(product: CommerceProduct) {
      send(this.root!, "nq-open-product", { product });
    },
    remove(product: CommerceProduct) {
      this.ids = removeRecent(this.ids, product.id);
      send(this.root!, "nq-remove", { id: product.id });
    },
    clearAll() {
      this.ids = [];
      send(this.root!, "nq-clear");
    },
  }));
};
