// nqProductAdminList / nqProductEditor / nqMediaManager / nqOptionsEditor / nqVariantMatrix / nqCollectionsManager: the store
// products admin of the Blade store-products-admin components. The markup is the React StoreProductsAdmin's; the state lives
// here and the maths comes from store-products-admin-logic.ts (the same pure code as the React kit).
//
//   <div data-slot="product-list" x-data="nqProductAdminList(config)"> … </div>
//   <form data-slot="product-editor" x-data="nqProductEditor(config)"> … </form>
//   <section data-slot="media-manager" x-data="nqMediaManager(config)" x-modelable="images"> … </section>
//   <section data-slot="options-editor" x-data="nqOptionsEditor(config)" x-modelable="options"> … </section>
//   <section data-slot="variant-matrix" x-data="nqVariantMatrix(config)" x-modelable="variants"> … </section>
//   <section data-slot="collections-manager" x-data="nqCollectionsManager(config)"> … </section>
//
// Money is integer minor units; `config.currency` is the ISO code (USD, or SAR in Arabic) and `config.t` the strings
// (flat keys: "statuses.active", "issues.compare-at"; {0}, {1} stand for the values).
//
// Where the React kit takes an async `onSave` / `onDelete` callback, the root fires a bubbling event whose detail carries
// `wait(promise)`. Hand it a promise that resolves, or resolves `{ error: "…" }` to keep the dialog or the edits and show the
// message. When nobody listens the change is applied locally, so a page works with no code at all.
//   list         "nq-open" { product }   "nq-create" {}   "nq-retry" {}
//                "nq-bulk-edit" { ids, edit, wait }   "nq-status-change" { product, status, wait }   "nq-delete" { product, wait }
//   editor       "nq-save" { draft, wait }   "nq-cancel" {}
//   media        "nq-images-change" { images }          options   "nq-options-change" { options }
//   variants     "nq-variants-change" { variants }
//   collections  "nq-collection-save" { collection, isNew, wait }   "nq-collection-delete" { collection, wait }

import {
  type CollectionDef,
  type CommerceImage,
  type CommerceOption,
  type CommerceProduct,
  type CommerceVariant,
  type ProductBulkEdit,
  type ProductDraft,
  DEFAULT_VARIANT_ID,
  MAX_OPTIONS,
  bulkEditProducts,
  bulkFillVariants,
  decimalToMinor,
  draftChanged,
  duplicateSkus,
  emptyProductDraft,
  generateVariants,
  marginFromCost,
  matchCollection,
  moveItem,
  nearestCentre,
  optionValuesFromLabels,
  productToDraft,
  slugify,
  stockSummary,
  validateProductDraft,
  variantCount,
  variantLabel,
} from "./store-products-admin-logic";
import { newGroup, ruleUid } from "./rule-builder-logic";
import type { Register } from "./types";

interface Base {
  locale?: string;
  currency: string;
  t: Record<string, string>;
}

type Status = NonNullable<CommerceProduct["status"]>;

const CHIP: Record<string, string> = {
  neutral: "border-border bg-secondary text-foreground",
  success: "border-nq-success/40 bg-nq-success-soft text-nq-success-text",
  warning: "border-nq-warning/40 bg-nq-warning-soft text-nq-warning-text",
  danger: "border-nq-danger/40 bg-nq-danger-soft text-nq-danger-text",
  info: "border-nq-info/40 bg-nq-info-soft text-nq-info-text",
};
const STATUS_TONE: Record<string, string> = { active: "success", draft: "neutral", archived: "warning" };
const LEVEL_TONE: Record<string, string> = { in: "success", low: "warning", out: "danger", untracked: "neutral" };
const STATUSES: Status[] = ["active", "draft", "archived"];
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const priceRange = (p: CommerceProduct): [number, number] | null => {
  const prices = p.variants.map((v) => v.price);
  return prices.length ? [Math.min(...prices), Math.max(...prices)] : null;
};
const statusOf = (p: CommerceProduct): Status => p.status ?? "active";

/** Formatting and string helpers every component of the module shares. Methods only, so they spread safely. */
function helpers(config: Base) {
  const tag = new Intl.Locale(config.locale ?? "en", { numberingSystem: "latn" }).toString();
  const digits = new Intl.NumberFormat("en", { style: "currency", currency: config.currency }).resolvedOptions().maximumFractionDigits ?? 2;
  const factor = 10 ** digits;
  const money = new Intl.NumberFormat(tag, { style: "currency", currency: config.currency, minimumFractionDigits: digits, maximumFractionDigits: digits });
  const numbers = new Intl.NumberFormat(tag, { maximumFractionDigits: 3 });
  const percent = new Intl.NumberFormat(tag, { style: "percent", maximumFractionDigits: 1 });
  return {
    t: config.t,
    currency: config.currency,
    factor,
    tt(key: string, ...args: (string | number)[]): string {
      return args.reduce<string>((out, arg, i) => out.split(`{${i}}`).join(String(arg)), config.t[key] ?? key);
    },
    money(minor: number): string {
      return money.format(minor / factor);
    },
    num(n: number): string {
      return numbers.format(n);
    },
    pct(bps: number): string {
      return percent.format(bps / 10000);
    },
    chip(tone: string): string {
      return CHIP[tone] ?? CHIP.neutral!;
    },
  };
}

/** Events from the root and the ask-and-wait handshake. */
function bus() {
  return {
    root: null as HTMLElement | null,
    emit(this: any, name: string, detail: Record<string, unknown> = {}) {
      (this.root ?? this.$el).dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
    },
    /** undefined: nobody listens; null: the host said yes; text: the error ("" for a generic failure). */
    async ask(this: any, name: string, detail: Record<string, unknown>): Promise<string | null | undefined> {
      let pending: Promise<unknown> | undefined;
      const event = new CustomEvent(name, { bubbles: true, detail: { ...detail, wait: (p: Promise<unknown>) => (pending = Promise.resolve(p)) } });
      (this.root ?? this.$el).dispatchEvent(event);
      if (!pending) return undefined;
      try {
        const result = (await pending) as { error?: string } | null | undefined;
        return result && typeof result === "object" && result.error ? result.error : null;
      } catch {
        return "";
      }
    },
  };
}

/** A picture that falls back to a placeholder when its URL is missing or fails. */
function thumbs() {
  return {
    broken: {} as Record<string, boolean>,
    imgOk(this: any, src: string | undefined): boolean {
      return Boolean(src) && !this.broken[src as string];
    },
  };
}

/** The draft as it is saved and compared: no nulls and empty strings, no `allowBackorder: false`. */
function clean(draft: ProductDraft): ProductDraft {
  const c = clone(draft);
  c.variants = c.variants.map((v) => {
    const o = { ...v } as unknown as Record<string, unknown>;
    if (o.price === null || o.price === undefined || o.price === "") o.price = 0;
    for (const k of ["compareAt", "stock", "weightGrams", "image"]) if (o[k] === null || o[k] === undefined || o[k] === "") delete o[k];
    if (typeof o.sku !== "string" || !o.sku.trim()) delete o.sku;
    if (!o.allowBackorder) delete o.allowBackorder;
    return o as unknown as CommerceVariant;
  });
  if (c.cost === undefined) c.cost = null;
  return c;
}

const wholeOrNull = (s: unknown): number | null => (/^\d+$/.test(String(s ?? "").trim()) ? Number(String(s).trim()) : null);

interface ListConfig extends Base {
  products: CommerceProduct[];
  lowStockAt?: number;
  pageSize?: number;
  loading?: boolean;
  error?: boolean | string;
  canCreate?: boolean;
  canBulk?: boolean;
  canStatus?: boolean;
  canDelete?: boolean;
}

interface EditorConfig extends Base {
  draft?: ProductDraft | null;
  product?: CommerceProduct | null;
  extra?: Partial<Pick<ProductDraft, "cost" | "visibility" | "seoTitle" | "seoDescription">>;
  loading?: boolean;
  canCancel?: boolean;
}

interface CollectionsConfig extends Base {
  collections: CollectionDef[];
  products: CommerceProduct[];
  loading?: boolean;
  error?: boolean | string;
}

export const storeProductsAdmin: Register = (Alpine) => {
  /* ------------------------------------------------------------------ product list */
  Alpine.data("nqProductAdminList", (config: ListConfig) => ({
    ...helpers(config),
    ...bus(),
    ...thumbs(),
    products: [...config.products] as CommerceProduct[],
    lowAt: config.lowStockAt ?? 5,
    pageSize: config.pageSize ?? 10,
    loading: Boolean(config.loading),
    failed: config.error ? (typeof config.error === "string" ? config.error : config.t.loadFailed ?? "") : "",
    canCreate: config.canCreate !== false,
    canBulk: config.canBulk !== false,
    canStatus: config.canStatus !== false,
    canDelete: config.canDelete !== false,
    query: "",
    facet: { status: {}, stock: {} } as Record<string, Record<string, boolean>>,
    sel: {} as Record<string, boolean>,
    sortKey: "product",
    sortDir: "asc" as "asc" | "desc",
    page: 1,
    busy: false,
    notice: "" as string,
    bulkOpen: false,
    delOpen: false,
    deleting: null as CommerceProduct | null,
    priceMode: "keep",
    percentText: "",
    amount: null as number | null,
    alsoCompare: false,
    stockMode: "keep",
    stockText: "",
    bulkStatus: "keep",

    init(this: any) {
      this.root = this.$el;
    },

    /* ---- reading */
    on(this: any, facet: string): string[] {
      return Object.keys(this.facet[facet] ?? {}).filter((k) => this.facet[facet][k]);
    },
    stock(this: any, p: CommerceProduct) {
      return stockSummary(p.variants, this.lowAt);
    },
    searchText(p: CommerceProduct): string {
      return [p.name, p.brand, p.category, ...(p.tags ?? []), ...p.variants.map((v) => v.sku)].filter(Boolean).join(" ").toLowerCase();
    },
    get filtered(): CommerceProduct[] {
      const q = this.query.trim().toLowerCase();
      const status = this.on("status");
      const stock = this.on("stock");
      return this.products.filter((p: CommerceProduct) => {
        if (q && !this.searchText(p).includes(q)) return false;
        if (status.length && !status.includes(statusOf(p))) return false;
        if (stock.length && !stock.includes(this.stock(p).level)) return false;
        return true;
      });
    },
    get isFiltered(): boolean {
      return Boolean(this.query.trim()) || this.on("status").length > 0 || this.on("stock").length > 0;
    },
    get sorted(): CommerceProduct[] {
      const key: Record<string, (p: CommerceProduct) => string | number> = {
        product: (p) => p.name.toLowerCase(),
        status: (p) => statusOf(p),
        stock: (p) => (this.stock(p).level === "untracked" ? Number.MAX_SAFE_INTEGER : this.stock(p).total),
        variants: (p) => p.variants.length,
        price: (p) => priceRange(p)?.[0] ?? 0,
      };
      const by = key[this.sortKey] ?? key.product!;
      const dir = this.sortDir === "asc" ? 1 : -1;
      return [...this.filtered].sort((a, b) => {
        const x = by(a);
        const y = by(b);
        return (x < y ? -1 : x > y ? 1 : 0) * dir;
      });
    },
    get pages(): number {
      return Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
    },
    get rows(): CommerceProduct[] {
      const p = Math.min(this.page, this.pages);
      return this.sorted.slice((p - 1) * this.pageSize, p * this.pageSize);
    },
    get selected(): CommerceProduct[] {
      return this.products.filter((p: CommerceProduct) => this.sel[p.id]);
    },
    get allOnPage(): boolean {
      return this.rows.length > 0 && this.rows.every((p: CommerceProduct) => this.sel[p.id]);
    },
    get showEmpty(): boolean {
      return !this.loading && !this.failed && this.products.length === 0;
    },
    get showNoMatch(): boolean {
      return !this.loading && !this.failed && this.products.length > 0 && this.filtered.length === 0;
    },
    get showTable(): boolean {
      return !this.loading && !this.failed && this.filtered.length > 0;
    },
    get showPager(): boolean {
      return this.filtered.length > this.pageSize;
    },
    sortBy(this: any, key: string) {
      if (this.sortKey === key) this.sortDir = this.sortDir === "asc" ? "desc" : "asc";
      else {
        this.sortKey = key;
        this.sortDir = "asc";
      }
    },
    ariaSort(this: any, key: string): string | null {
      return this.sortKey === key ? (this.sortDir === "asc" ? "ascending" : "descending") : null;
    },
    toggleAll(this: any, on: boolean) {
      for (const p of this.rows as CommerceProduct[]) this.sel[p.id] = on;
    },
    clear(this: any) {
      this.query = "";
      this.facet = { status: {}, stock: {} };
      this.page = 1;
    },

    /* ---- row view */
    statusOf,
    statusLabel(this: any, p: CommerceProduct): string {
      return this.t[`statuses.${statusOf(p)}`] ?? statusOf(p);
    },
    statusClass(this: any, p: CommerceProduct): string {
      return this.chip(STATUS_TONE[statusOf(p)] ?? "neutral");
    },
    levelLabel(this: any, p: CommerceProduct): string {
      return this.t[`stockLevels.${this.stock(p).level}`] ?? "";
    },
    levelClass(this: any, p: CommerceProduct): string {
      return this.chip(LEVEL_TONE[this.stock(p).level] ?? "neutral");
    },
    unitsText(this: any, p: CommerceProduct): string {
      return this.stock(p).level === "untracked" ? "" : this.tt("units", this.num(this.stock(p).total));
    },
    priceText(this: any, p: CommerceProduct): string {
      const r = priceRange(p);
      if (!r) return "—";
      return r[0] === r[1] ? this.money(r[0]) : `${this.money(r[0])} – ${this.money(r[1])}`;
    },
    variantsText(this: any, p: CommerceProduct): string {
      return this.num(p.options.length ? variantCount(p.options) || p.variants.length : p.variants.length);
    },
    can(this: any, p: CommerceProduct, status: Status): boolean {
      return this.canStatus && statusOf(p) !== status;
    },

    /* ---- actions */
    openProduct(this: any, product: CommerceProduct) {
      this.emit("nq-open", { product });
    },
    create(this: any) {
      this.emit("nq-create");
    },
    retry(this: any) {
      this.emit("nq-retry");
    },
    async setStatus(this: any, product: CommerceProduct, status: Status) {
      this.notice = "";
      const r = await this.ask("nq-status-change", { product, status });
      if (typeof r === "string") {
        this.notice = r || this.t.saveFailed;
        return;
      }
      this.products = this.products.map((p: CommerceProduct) => (p.id === product.id ? { ...p, status } : p));
    },
    askDelete(this: any, product: CommerceProduct) {
      this.notice = "";
      this.deleting = product;
      this.delOpen = true;
    },
    async confirmDelete(this: any) {
      const product = this.deleting as CommerceProduct | null;
      if (!product) return;
      this.busy = true;
      this.notice = "";
      const r = await this.ask("nq-delete", { product });
      this.busy = false;
      if (typeof r === "string") {
        this.notice = r || this.t.saveFailed;
        return;
      }
      this.products = this.products.filter((p: CommerceProduct) => p.id !== product.id);
      delete this.sel[product.id];
      this.delOpen = false;
    },

    /* ---- bulk edit */
    openBulk(this: any) {
      this.notice = "";
      this.priceMode = "keep";
      this.percentText = "";
      this.amount = null;
      this.alsoCompare = false;
      this.stockMode = "keep";
      this.stockText = "";
      this.bulkStatus = "keep";
      this.bulkOpen = true;
    },
    get percentMode(): boolean {
      return this.priceMode === "increase-percent" || this.priceMode === "decrease-percent";
    },
    get edit(): ProductBulkEdit {
      const price = this.priceMode === "keep" ? null : this.percentMode ? decimalToMinor(this.percentText, 100) : this.amount;
      const stock = wholeOrNull(this.stockText);
      const out: ProductBulkEdit = {};
      if (price !== null && price !== undefined) out.price = { mode: this.priceMode, value: price, ...(this.alsoCompare ? { compareAt: true } : {}) };
      if (this.stockMode !== "keep" && stock !== null) out.stock = { mode: this.stockMode, value: stock };
      if (this.bulkStatus !== "keep") out.status = this.bulkStatus;
      return out;
    },
    get hasChange(): boolean {
      const e = this.edit as ProductBulkEdit;
      return Boolean(e.price || e.stock || e.status);
    },
    /** Before and after of the selected products, as text, for the preview. */
    get preview(): { id: string; name: string; price: string; stock: string; status: string }[] {
      const before = this.selected as CommerceProduct[];
      const after = this.hasChange ? bulkEditProducts(before, before.map((p) => p.id), this.edit) : before;
      const rows: { id: string; name: string; price: string; stock: string; status: string }[] = [];
      before.forEach((p, i) => {
        const a = after[i] as CommerceProduct;
        if (JSON.stringify([p.variants, p.status]) === JSON.stringify([a.variants, a.status])) return;
        const pb = priceRange(p);
        const pa = priceRange(a);
        const moved = pb && pa && (pb[0] !== pa[0] || pb[1] !== pa[1]);
        const sb = stockSummary(p.variants).total;
        const sa = stockSummary(a.variants).total;
        rows.push({
          id: p.id,
          name: this.tt("previewRow", p.name),
          price: moved ? `${this.money(pb[0])} → ${this.money(pa[0])}` : "",
          stock: sb !== sa ? `${this.num(sb)} → ${this.num(sa)}` : "",
          status: statusOf(p) !== statusOf(a) ? `${this.t[`statuses.${statusOf(p)}`]} → ${this.t[`statuses.${statusOf(a)}`]}` : "",
        });
      });
      return rows;
    },
    get previewShown() {
      return this.preview.slice(0, 6);
    },
    get previewMore(): number {
      return Math.max(0, this.preview.length - 6);
    },
    async applyBulk(this: any) {
      if (!this.hasChange || this.busy) return;
      const ids = this.selected.map((p: CommerceProduct) => p.id) as string[];
      const edit = this.edit as ProductBulkEdit;
      this.busy = true;
      this.notice = "";
      const r = await this.ask("nq-bulk-edit", { ids, edit });
      this.busy = false;
      if (typeof r === "string") {
        this.notice = r || this.t.saveFailed;
        return;
      }
      this.products = bulkEditProducts(this.products, ids, edit);
      this.sel = {};
      this.bulkOpen = false;
    },
  }));

  /* ------------------------------------------------------------------ media manager */
  Alpine.data("nqMediaManager", (config: Base & { images?: CommerceImage[]; maxImages?: number; disabled?: boolean }) => {
    const DRAG_DISTANCE = 4;
    let session: { from: number; startX: number; startY: number; centres: { x: number; y: number }[]; id: number; active: boolean } | null = null;
    return {
      ...helpers(config),
      ...bus(),
      ...thumbs(),
      images: [...(config.images ?? [])] as CommerceImage[],
      maxImages: config.maxImages ?? 12,
      off: Boolean(config.disabled),
      url: "",
      announce: "",
      drag: null as { from: number; over: number; dx: number; dy: number } | null,

      init(this: any) {
        this.root = this.$el;
      },
      destroy(this: any) {
        this.stopDrag();
      },
      get missing(): number {
        return this.images.filter((i: CommerceImage) => !String(i.alt ?? "").trim()).length;
      },
      get full(): boolean {
        return this.images.length >= this.maxImages;
      },
      get canAdd(): boolean {
        return !this.off && !this.full && Boolean(this.url.trim());
      },
      commit(this: any, next: CommerceImage[]) {
        this.images = next;
        this.emit("nq-images-change", { images: clone(next) });
      },
      move(this: any, from: number, to: number) {
        if (to < 0 || to >= this.images.length || from === to) return;
        this.commit(moveItem(this.images, from, to));
        this.announce = this.tt("movedTo", this.num(to + 1), this.num(this.images.length));
      },
      add(this: any) {
        const src = this.url.trim();
        if (!src || this.images.some((i: CommerceImage) => i.src === src) || this.full) return;
        this.commit([...this.images, { src, alt: "" }]);
        this.url = "";
      },
      remove(this: any, index: number) {
        this.commit(this.images.filter((_: CommerceImage, k: number) => k !== index));
      },
      setAlt(this: any, index: number, alt: string) {
        this.commit(this.images.map((x: CommerceImage, k: number) => (k === index ? { ...x, alt } : x)));
      },
      tileClass(this: any, index: number): string {
        const d = this.drag;
        if (!d) return "";
        if (d.from === index) return "relative z-10 shadow-lg";
        return d.over === index ? "border-primary" : "";
      },
      tileStyle(this: any, index: number): string {
        const d = this.drag;
        return d && d.from === index ? `transform: translate(${d.dx}px, ${d.dy}px); transition: none` : "";
      },
      isDragging(this: any, index: number): boolean {
        return Boolean(this.drag) && this.drag.from === index;
      },

      /* ---- pointer drag */
      dragStart(this: any, index: number, event: PointerEvent) {
        if (this.off || (event.pointerType === "mouse" && event.button !== 0)) return;
        const tiles = [...this.$el.querySelectorAll('[data-slot="media-tile"]')] as HTMLElement[];
        if (tiles.length < 2) return;
        session = {
          from: index,
          startX: event.clientX,
          startY: event.clientY,
          centres: tiles.map((el) => {
            const r = el.getBoundingClientRect();
            return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
          }),
          id: event.pointerId,
          active: false,
        };
        this.onMove = (e: PointerEvent) => this.dragMove(e);
        this.onUp = (e: PointerEvent) => this.dragEnd(e);
        this.onCancel = () => this.stopDrag();
        window.addEventListener("pointermove", this.onMove);
        window.addEventListener("pointerup", this.onUp);
        window.addEventListener("pointercancel", this.onCancel);
      },
      dragMove(this: any, event: PointerEvent) {
        if (!session || event.pointerId !== session.id) return;
        const dx = event.clientX - session.startX;
        const dy = event.clientY - session.startY;
        if (!session.active) {
          if (Math.hypot(dx, dy) < DRAG_DISTANCE) return;
          session.active = true;
        }
        event.preventDefault();
        const from = session.centres[session.from];
        this.drag = { from: session.from, over: from ? nearestCentre(session.centres, from.x + dx, from.y + dy) : session.from, dx, dy };
      },
      stopDrag(this: any) {
        if (this.onMove) window.removeEventListener("pointermove", this.onMove);
        if (this.onUp) window.removeEventListener("pointerup", this.onUp);
        if (this.onCancel) window.removeEventListener("pointercancel", this.onCancel);
        this.onMove = this.onUp = this.onCancel = null;
        session = null;
        this.drag = null;
      },
      dragEnd(this: any, event: PointerEvent) {
        if (!session || event.pointerId !== session.id) return;
        const result = this.drag as { from: number; over: number } | null;
        this.stopDrag();
        if (result && result.over !== result.from) this.move(result.from, result.over);
      },
      handleKey(this: any, index: number, e: KeyboardEvent) {
        const rtl = getComputedStyle(this.$el).direction === "rtl";
        const back = rtl ? "ArrowRight" : "ArrowLeft";
        const forward = rtl ? "ArrowLeft" : "ArrowRight";
        if (e.key === back || e.key === "ArrowUp") this.move(index, index - 1);
        else if (e.key === forward || e.key === "ArrowDown") this.move(index, index + 1);
        else return;
        e.preventDefault();
      },
    };
  });

  /* ------------------------------------------------------------------ options editor */
  Alpine.data("nqOptionsEditor", (config: Base & { options?: CommerceOption[]; maxOptions?: number; disabled?: boolean }) => {
    /** What each row's tag input last showed, to tell a typed change from a change made from outside. */
    const seen = new Map<string, string>();
    const join = (labels: readonly string[]) => labels.join("");
    return {
      ...helpers(config),
      ...bus(),
      options: clone(config.options ?? []) as CommerceOption[],
      maxOptions: config.maxOptions ?? MAX_OPTIONS,
      off: Boolean(config.disabled),

      init(this: any) {
        this.root = this.$el;
      },
      get canAdd(): boolean {
        return !this.off && this.options.length < this.maxOptions;
      },
      labelsOf(o: CommerceOption): string[] {
        return o.values.map((v) => v.label);
      },
      commit(this: any, next: CommerceOption[]) {
        this.options = next;
        this.emit("nq-options-change", { options: clone(next) });
      },
      update(this: any, id: string, change: (o: CommerceOption) => CommerceOption) {
        this.commit(this.options.map((o: CommerceOption) => (o.id === id ? change(o) : o)));
      },
      setName(this: any, id: string, name: string) {
        this.update(id, (o: CommerceOption) => ({ ...o, name }));
      },
      /** Keeps a row's tag input and its option's values the same: a typed change is written to the option, an outside change is read back. */
      reconcile(this: any, o: CommerceOption, labels: string[]): string[] {
        const current = join(this.labelsOf(o));
        const mine = join(labels);
        const before = seen.get(o.id);
        if (before === undefined) {
          seen.set(o.id, current);
          return this.labelsOf(o);
        }
        if (mine !== before) {
          seen.set(o.id, mine);
          this.update(o.id, (x: CommerceOption) => ({ ...x, values: optionValuesFromLabels(x, labels) }));
          return labels;
        }
        if (current !== before) {
          seen.set(o.id, current);
          return this.labelsOf(o);
        }
        return labels;
      },
      add(this: any) {
        const taken = new Set(this.options.map((o: CommerceOption) => o.id));
        let n = this.options.length + 1;
        while (taken.has(`option-${n}`)) n += 1;
        this.commit([...this.options, { id: `option-${n}`, name: "", display: "button", values: [] }]);
      },
      remove(this: any, id: string) {
        seen.delete(id);
        this.commit(this.options.filter((o: CommerceOption) => o.id !== id));
      },
    };
  });

  /* ------------------------------------------------------------------ variant matrix */
  Alpine.data("nqVariantMatrix", (config: Base & { options?: CommerceOption[]; variants?: CommerceVariant[]; images?: CommerceImage[]; disabled?: boolean }) => ({
    ...helpers(config),
    ...bus(),
    options: [...(config.options ?? [])] as CommerceOption[],
    variants: clone(config.variants ?? []) as CommerceVariant[],
    images: [...(config.images ?? [])] as CommerceImage[],
    off: Boolean(config.disabled),
    selected: {} as Record<string, boolean>,
    fill: { price: null as number | null, compareAt: null as number | null, stock: "", add: "", sku: "" },

    init(this: any) {
      this.root = this.$el;
      this.$watch("variants", () => this.emit("nq-variants-change", { variants: clone(this.variants) }));
    },
    /** Called from an x-effect of the host: the options and pictures the variants are built on. */
    setContext(this: any, options: CommerceOption[], images: CommerceImage[]) {
      this.options = options;
      this.images = images;
    },
    get dupes(): Set<string> {
      return new Set(duplicateSkus(this.variants));
    },
    get ids(): string[] {
      return this.variants.map((v: CommerceVariant) => v.id);
    },
    get all(): boolean {
      return this.variants.length > 0 && this.ids.every((id: string) => this.selected[id]);
    },
    get some(): boolean {
      return this.ids.some((id: string) => this.selected[id]);
    },
    get selectedCount(): number {
      return this.ids.filter((id: string) => this.selected[id]).length;
    },
    get fillPatch() {
      const f = this.fill;
      const stock = wholeOrNull(f.stock);
      return {
        ...(f.price !== null && f.price !== undefined ? { price: f.price } : {}),
        ...(f.compareAt !== null && f.compareAt !== undefined ? { compareAt: f.compareAt } : {}),
        ...(stock !== null ? { stock } : {}),
        ...(/^-?\d+$/.test(String(f.add).trim()) ? { stockDelta: Number(String(f.add).trim()) } : {}),
        ...(String(f.sku).trim() ? { skuPrefix: String(f.sku).trim().toUpperCase() } : {}),
      };
    },
    get canFill(): boolean {
      return !this.off && this.some && Object.keys(this.fillPatch).length > 0;
    },
    get selectedText(): string {
      return this.some ? this.tt("variantsSelected", this.num(this.selectedCount)) : this.t.selectVariants;
    },
    applyFill(this: any) {
      this.variants = bulkFillVariants(this.variants, new Set(this.ids.filter((id: string) => this.selected[id])), this.fillPatch);
      this.fill = { price: null, compareAt: null, stock: "", add: "", sku: "" };
    },
    clearSelection(this: any) {
      this.selected = {};
    },
    toggleAll(this: any, on: boolean) {
      this.selected = on ? Object.fromEntries(this.ids.map((id: string) => [id, true])) : {};
    },
    label(this: any, v: CommerceVariant, index: number): string {
      return variantLabel(this.options, v) || `#${index + 1}`;
    },
    isDup(this: any, v: CommerceVariant): boolean {
      return Boolean(v.sku && this.dupes.has(String(v.sku).trim().toUpperCase()));
    },
    badCompare(v: CommerceVariant): boolean {
      return v.compareAt !== undefined && v.compareAt !== null && v.compareAt <= (v.price ?? 0);
    },
    setStock(v: CommerceVariant, text: string) {
      const n = wholeOrNull(text);
      if (n === null) delete v.stock;
      else v.stock = n;
    },
    setSku(v: CommerceVariant, text: string) {
      if (text) v.sku = text;
      else delete v.sku;
    },
    imageAlt(this: any, im: CommerceImage, index: number): string {
      return im.alt || `#${index + 1}`;
    },
  }));

  /* ------------------------------------------------------------------ product editor */
  Alpine.data("nqProductEditor", (config: EditorConfig) => {
    const start = (): ProductDraft => (config.draft ? clone(config.draft) : config.product ? productToDraft(config.product, config.extra) : emptyProductDraft());
    const initial = start();
    return {
      ...helpers(config),
      ...bus(),
      base: clean(initial),
      draft: initial,
      loading: Boolean(config.loading),
      canCancel: Boolean(config.canCancel),
      isNew: !initial.id,
      touched: false,
      saving: false,
      error: "",
      saved: false,
      note: "",

      init(this: any) {
        this.root = this.$el;
      },
      get hasOptions(): boolean {
        return this.draft.options.some((o: CommerceOption) => o.values.length > 0);
      },
      get activeOptions(): CommerceOption[] {
        return this.draft.options.filter((o: CommerceOption) => o.values.length > 0);
      },
      get single(): CommerceVariant | undefined {
        return this.draft.variants[0];
      },
      get showSingle(): boolean {
        return !this.hasOptions && Boolean(this.single);
      },
      get tracked(): boolean {
        const s = this.single;
        return Boolean(s) && s.stock !== undefined && s.stock !== null;
      },
      set tracked(on: boolean) {
        const s = this.single;
        if (!s) return;
        if (on) s.stock = 0;
        else delete s.stock;
      },
      get refPrice(): number | null {
        if (this.hasOptions) return this.draft.variants.length ? Math.min(...this.draft.variants.map((v: CommerceVariant) => v.price ?? 0)) : null;
        return this.single?.price ?? null;
      },
      get margin() {
        return marginFromCost(this.refPrice && this.refPrice > 0 ? this.refPrice : null, this.draft.cost);
      },
      get hasMargin(): boolean {
        return this.margin !== null;
      },
      get profitText(): string {
        return this.margin ? this.money(this.margin.profit) : "";
      },
      get marginText(): string {
        return this.margin ? this.pct(this.margin.marginBps) : "";
      },
      get marginNegative(): boolean {
        return Boolean(this.margin) && this.margin.marginBps < 0;
      },
      get markupText(): string {
        return this.margin && this.margin.markupBps !== null ? this.pct(this.margin.markupBps) : "—";
      },
      get skuBase(): string | undefined {
        return (this.draft.slug || slugify(this.draft.title)).toUpperCase().slice(0, 12) || undefined;
      },
      get slugHolder(): string {
        return slugify(this.draft.title);
      },
      get issues() {
        const d = this.draft as ProductDraft;
        const s = this.single;
        return validateProductDraft({
          title: d.title,
          price: this.isNew && !this.hasOptions && (s?.price ?? 0) <= 0 ? null : (s?.price ?? 0),
          compareAt: s?.compareAt ?? null,
          options: this.activeOptions,
          variants: clean(d).variants,
          slug: d.slug,
        });
      },
      has(this: any, code: string): boolean {
        return this.issues.some((i: { code: string }) => i.code === code);
      },
      get issueCodes(): string[] {
        return [...new Set(this.issues.map((i: { code: string }) => i.code))] as string[];
      },
      get dirty(): boolean {
        return draftChanged(clean(this.draft), this.base);
      },
      get saveOff(): boolean {
        return !this.dirty && !this.isNew;
      },
      get discardOff(): boolean {
        return this.saving || (!this.dirty && !this.canCancel);
      },
      get showTitleError(): boolean {
        return this.touched && this.has("title");
      },
      get showPriceError(): boolean {
        return this.touched && this.has("price");
      },
      get fixText(): string {
        return `${this.tt("fixIssues", this.num(this.issueCodes.length))}: ${this.issueCodes.map((c: string) => this.t[`issues.${c}`]).join(" ")}`;
      },
      get showFix(): boolean {
        return !this.error && this.touched && this.issueCodes.length > 0;
      },
      get showUnsaved(): boolean {
        return !this.error && !this.showFix && this.dirty;
      },
      get showSaved(): boolean {
        return !this.error && !this.showFix && !this.dirty && this.saved;
      },
      get variantsSummary(): string {
        return this.tt("variantsSummary", this.num(this.draft.variants.length));
      },
      seoMeta(this: any) {
        return { title: this.draft.seoTitle || this.draft.title, description: this.draft.seoDescription, url: "" };
      },
      setWeight(this: any, text: string) {
        const s = this.single;
        if (!s) return;
        const n = wholeOrNull(text);
        if (n === null) delete s.weightGrams;
        else s.weightGrams = n;
      },
      setStock(this: any, text: string) {
        const s = this.single;
        if (s) s.stock = wholeOrNull(text) ?? 0;
      },
      setSeo(this: any, meta: { title?: string; description?: string }) {
        this.draft.seoTitle = meta.title ?? "";
        this.draft.seoDescription = meta.description ?? "";
      },
      /** The options changed: rebuild the variants and keep what was typed on the ones that remain. */
      changeOptions(this: any, options: CommerceOption[]) {
        const d = this.draft as ProductDraft;
        d.options = options;
        const axes = options.filter((o) => o.values.length > 0);
        if (axes.length === 0) {
          const first = d.variants[0] ?? { id: DEFAULT_VARIANT_ID, options: {}, price: 0 };
          d.variants = [{ ...first, options: {} }];
          this.note = "";
          return;
        }
        const first = d.variants[0];
        const r = generateVariants(options, d.variants, {
          defaults: {
            price: first?.price ?? 0,
            ...(first?.compareAt !== undefined && first?.compareAt !== null ? { compareAt: first.compareAt } : {}),
            ...(first?.stock !== undefined && first?.stock !== null ? { stock: first.stock } : {}),
            ...(first?.weightGrams !== undefined ? { weightGrams: first.weightGrams } : {}),
          },
          ...(this.skuBase ? { skuBase: this.skuBase } : {}),
        });
        this.note = r.dropped.length ? this.tt("variantsRemoved", this.num(r.dropped.length)) : r.truncated ? this.tt("variantsTruncated", this.num(100)) : "";
        d.variants = r.variants;
      },
      async save(this: any) {
        this.touched = true;
        if (this.issues.length > 0 || this.saving) return;
        this.saving = true;
        this.error = "";
        const draft = clean(this.draft);
        const r = await this.ask("nq-save", { draft });
        this.saving = false;
        if (typeof r === "string") {
          this.error = r || this.t.saveFailed;
          return;
        }
        this.base = draft;
        this.saved = true;
      },
      discard(this: any) {
        if (this.dirty) {
          this.draft = clone(this.base);
          this.touched = false;
          this.error = "";
          this.note = "";
        } else this.emit("nq-cancel");
      },
    };
  });

  /* ------------------------------------------------------------------ collections manager */
  Alpine.data("nqCollectionsManager", (config: CollectionsConfig) => ({
    ...helpers(config),
    ...bus(),
    ...thumbs(),
    collections: clone(config.collections ?? []) as CollectionDef[],
    products: config.products as CommerceProduct[],
    loading: Boolean(config.loading),
    failed: config.error ? (typeof config.error === "string" ? config.error : config.t.loadFailed ?? "") : "",
    editOpen: false,
    delOpen: false,
    deleting: null as CollectionDef | null,
    isNewC: false,
    cid: "",
    ctitle: "",
    kind: "manual",
    ids: [] as string[],
    ruleDoc: { event: "product", conditions: newGroup("and"), actions: [{ id: "a-collection", type: "add", config: {} }] } as Record<string, any>,
    touched: false,
    busy: false,
    notice: "",

    init(this: any) {
      this.root = this.$el;
    },
    get showEmpty(): boolean {
      return !this.loading && !this.failed && this.collections.length === 0;
    },
    get showList(): boolean {
      return !this.loading && !this.failed && this.collections.length > 0;
    },
    matched(this: any, c: Pick<CollectionDef, "kind" | "productIds" | "conditions">, includeInactive = false): CommerceProduct[] {
      return matchCollection(this.products, c, { minorPerMajor: this.factor, includeInactive });
    },
    cardMatches(this: any, c: CollectionDef): CommerceProduct[] {
      return this.matched(c);
    },
    countText(this: any, c: CollectionDef): string {
      return this.tt("productsCount", this.num(this.matched(c).length));
    },
    get matches(): CommerceProduct[] {
      return this.matched({ kind: this.kind, productIds: this.ids, conditions: this.ruleDoc.conditions }, this.kind === "manual");
    },
    get matchText(): string {
      return this.matches.length ? this.tt("matchPreview", this.num(this.matches.length)) : this.t.matchNone;
    },
    get matchShown(): CommerceProduct[] {
      return this.matches.slice(0, 8);
    },
    get matchMore(): number {
      return Math.max(0, this.matches.length - 8);
    },
    get available(): CommerceProduct[] {
      return this.products.filter((p: CommerceProduct) => !this.ids.includes(p.id));
    },
    get picked(): { id: string; name: string; src: string | undefined }[] {
      const byId = new Map(this.products.map((p: CommerceProduct) => [p.id, p]));
      return this.ids.map((id: string) => {
        const p = byId.get(id) as CommerceProduct | undefined;
        return { id, name: p?.name ?? id, src: p?.images[0]?.src };
      });
    },
    get titleBad(): boolean {
      return this.touched && !this.ctitle.trim();
    },
    get dialogTitle(): string {
      return this.isNewC ? this.t.newCollection : this.ctitle || this.t.editCollection;
    },
    get dialogHint(): string {
      return this.kind === "manual" ? this.t.manualHint : this.t.rulesHint;
    },
    priceOf(this: any, p: CommerceProduct): string {
      return p.variants[0] ? this.money(p.variants[0].price) : "";
    },
    openEditor(this: any, c: CollectionDef, isNew = false) {
      this.notice = "";
      this.touched = false;
      this.isNewC = isNew;
      this.cid = c.id;
      this.ctitle = c.title;
      this.kind = c.kind;
      this.ids = [...(c.productIds ?? [])];
      this.ruleDoc = { event: "product", conditions: c.conditions ? clone(c.conditions) : newGroup("and"), actions: [{ id: "a-collection", type: "add", config: {} }] };
      this.editOpen = true;
    },
    edit(this: any, c: CollectionDef) {
      this.openEditor(c, false);
    },
    create(this: any) {
      this.openEditor({ id: ruleUid("col"), title: "", kind: "manual", productIds: [] }, true);
    },
    addProduct(this: any, id: string) {
      if (!this.ids.includes(id)) this.ids = [...this.ids, id];
    },
    moveBy(this: any, index: number, by: number) {
      this.ids = moveItem(this.ids, index, index + by);
    },
    removeId(this: any, id: string) {
      this.ids = this.ids.filter((x: string) => x !== id);
    },
    async saveCollection(this: any) {
      this.touched = true;
      if (!this.ctitle.trim() || this.busy) return;
      const collection: CollectionDef = { id: this.cid, title: this.ctitle.trim(), kind: this.kind, ...(this.kind === "manual" ? { productIds: [...this.ids] } : { conditions: clone(this.ruleDoc.conditions) }) };
      this.busy = true;
      this.notice = "";
      const r = await this.ask("nq-collection-save", { collection, isNew: this.isNewC });
      this.busy = false;
      if (typeof r === "string") {
        this.notice = r || this.t.saveFailed;
        return;
      }
      this.collections = this.isNewC ? [...this.collections, collection] : this.collections.map((c: CollectionDef) => (c.id === collection.id ? collection : c));
      this.editOpen = false;
    },
    askDelete(this: any, c: CollectionDef) {
      this.notice = "";
      this.deleting = c;
      this.delOpen = true;
    },
    async confirmDelete(this: any) {
      const collection = this.deleting as CollectionDef | null;
      if (!collection) return;
      this.busy = true;
      this.notice = "";
      const r = await this.ask("nq-collection-delete", { collection });
      this.busy = false;
      if (typeof r === "string") {
        this.notice = r || this.t.saveFailed;
        return;
      }
      this.collections = this.collections.filter((c: CollectionDef) => c.id !== collection.id);
      this.delOpen = false;
    },
  }));
};
