/* eslint-disable @typescript-eslint/no-explicit-any */
// nqProductDetail, nqProductGallery, nqProductQuantity: the product page. The markup is the React ProductDetail's
// (the Blade <x-nq::product-detail> renders it, with the first state server-rendered); the state lives here.
//
//   <div x-data='nqProductDetail({ product, images, currency, exponent, selection, ... })'>
//     <div data-slot="product-gallery" x-data="nqProductGallery(images, name)" x-on:nq-gallery-show="show($event.detail.src)">…</div>
//     <button x-on:click="pick('size', 'm')" :data-checked="isChecked('size', 'm') ? '' : undefined">M</button>
//     <div x-data="nqProductQuantity(1)" x-model="quantity" x-effect="max = maxQty; disabled = soldOut">…</div>
//     <button x-on:click="run('add')">Add to cart</button>
//   </div>
//
// React's callbacks are events, bubbling from the root:
//   nq-add-to-cart, nq-buy-now   detail { variantId, quantity, variant, wait(promise) }. Pass a promise to wait(): the
//                                 button shows a spinner until it settles, a result with { error } or a rejection shows the failure.
//   nq-variant-change            detail { variantId, variant, selection }  (variantId is null until a full selection)
//   nq-wishlist-change           detail { wishlisted }
//   nq-share                     detail { url, title }. Cancelable: preventDefault() replaces Web Share / copy link.
// The gallery follows the selection by receiving nq-gallery-show { src } on its own element, and keeps its own index.
// Money is minor units (cents). Currency defaults to USD, SAR in Arabic. Every string is $nq.t(en, ar).

import { formatMoney } from "../core/money";
import type { Magics, Register } from "./types";

type Selection = Record<string, string | undefined>;
interface Option {
  id: string;
  name: string;
  display?: "button" | "swatch" | "image" | "select";
  values: { id: string; label: string; color?: string; image?: string }[];
}
interface Variant {
  id: string;
  sku?: string;
  options: Record<string, string>;
  price: number;
  compareAt?: number;
  stock?: number;
  allowBackorder?: boolean;
  image?: string;
}
interface Product {
  id: string;
  name: string;
  options: Option[];
  variants: Variant[];
}
type Availability = "available" | "out" | "none";
type Stock = { kind: "untracked" | "backorder" | "out" | "unavailable" } | { kind: "in-stock" | "low"; left: number };

interface City {
  id: string;
  label: string;
  etaDays: [number, number];
  fee?: number;
}
interface Config {
  product: Product;
  images?: { src: string }[];
  currency?: string | null;
  exponent?: number;
  selection?: Selection;
  wishlisted?: boolean;
  lowStock?: number;
  maxPerOrder?: number | null;
  impossible?: "hide" | "disable";
  delivery?: { cities: City[]; defaultCityId?: string; skipWeekdays?: number[]; cutoffHour?: number; now?: string | number | null } | null;
  shareUrl?: string | null;
}

// ---------------------------------------------------------------- the store, and the pure model (ported from lib/commerce.ts and pdp-logic.ts)

interface Store {
  locale: string;
  currency: string | null;
  t(en: string, ar: string): string;
}
const DAY_MS = 86_400_000;

const inStock = (v: Variant | undefined, q = 1): boolean => !!v && (v.stock === undefined || !!v.allowBackorder || v.stock >= q);

const findVariant = (p: Product, s: Selection): Variant | undefined => {
  if (p.options.some((o) => !s[o.id])) return p.variants.length === 1 && p.options.length === 0 ? p.variants[0] : undefined;
  return p.variants.find((v) => p.options.every((o) => v.options[o.id] === s[o.id]));
};

function availability(p: Product, s: Selection, optionId: string): Record<string, Availability> {
  const out: Record<string, Availability> = {};
  const option = p.options.find((o) => o.id === optionId);
  if (!option) return out;
  for (const value of option.values) {
    const matches = p.variants.filter((v) => v.options[optionId] === value.id && p.options.every((o) => o.id === optionId || !s[o.id] || v.options[o.id] === s[o.id]));
    out[value.id] = matches.length === 0 ? "none" : matches.some((v) => inStock(v)) ? "available" : "out";
  }
  return out;
}

function autoSelect(p: Product, selection: Selection): Selection {
  let next: Selection = { ...selection };
  for (let guard = 0; guard <= p.options.length; guard++) {
    let changed = false;
    for (const option of p.options) {
      if (next[option.id]) continue;
      const reachable = Object.entries(availability(p, next, option.id)).filter(([, a]) => a !== "none");
      if (reachable.length === 1) {
        next = { ...next, [option.id]: reachable[0]![0] };
        changed = true;
      }
    }
    if (!changed) break;
  }
  return next;
}

function selectValue(p: Product, selection: Selection, optionId: string, valueId: string): Selection {
  const option = p.options.find((o) => o.id === optionId);
  if (!option || !option.values.some((v) => v.id === valueId)) return selection;
  if (!p.variants.some((v) => v.options[optionId] === valueId)) return selection;
  const kept: Selection = { [optionId]: valueId };
  for (const other of p.options) {
    if (other.id === optionId) continue;
    const pick = selection[other.id];
    if (!pick) continue;
    const candidate = { ...kept, [other.id]: pick };
    if (p.variants.some((v) => Object.entries(candidate).every(([k, val]) => v.options[k] === val))) kept[other.id] = pick;
  }
  return autoSelect(p, kept);
}

function stockState(v: Variant | undefined, low: number): Stock {
  if (!v) return { kind: "unavailable" };
  if (v.stock === undefined) return { kind: "untracked" };
  if (v.stock <= 0) return v.allowBackorder ? { kind: "backorder" } : { kind: "out" };
  return v.stock <= low ? { kind: "low", left: v.stock } : { kind: "in-stock", left: v.stock };
}

const discount = (price: number, compareAt?: number) => (!compareAt || compareAt <= price ? 0 : Math.floor(((compareAt - price) * 100) / compareAt));

function displayPrice(p: Product, v: Variant | undefined) {
  if (v) {
    const percentOff = discount(v.price, v.compareAt);
    return { price: v.price, compareAt: percentOff && v.compareAt ? v.compareAt : undefined, percentOff, from: false };
  }
  const prices = p.variants.map((x) => x.price);
  const min = prices.length ? Math.min(...prices) : 0;
  const max = prices.length ? Math.max(...prices) : 0;
  const cheapest = p.variants.find((x) => x.price === min);
  const percentOff = cheapest ? discount(cheapest.price, cheapest.compareAt) : 0;
  return { price: min, compareAt: percentOff && cheapest?.compareAt ? cheapest.compareAt : undefined, percentOff, from: max > min };
}

const maxPurchasable = (v: Variant | undefined, cap?: number | null): number | undefined => {
  const stock = v && v.stock !== undefined && !v.allowBackorder ? Math.max(v.stock, 0) : undefined;
  const c = cap ?? undefined;
  if (stock === undefined) return c;
  return c === undefined ? stock : Math.min(stock, c);
};
const clampQty = (q: number, max?: number | null): number => {
  const n = Math.max(1, Math.floor(q) || 1);
  return max !== undefined && max !== null ? Math.min(n, Math.max(max, 1)) : n;
};

function deliveryWindow(now: Date | string | number, days: readonly [number, number], opts: { skipWeekdays?: readonly number[]; cutoffHour?: number } = {}) {
  const skip = new Set(opts.skipWeekdays ?? []);
  const start = new Date(now);
  let day = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  if (opts.cutoffHour !== undefined && start.getUTCHours() >= opts.cutoffHour) day += DAY_MS;
  const add = (n: number) => {
    let cursor = day;
    let left = Math.max(0, Math.floor(n));
    let guard = 0;
    while (left > 0 && guard++ < 400) {
      cursor += DAY_MS;
      if (!skip.has(new Date(cursor).getUTCDay())) left--;
    }
    while (skip.has(new Date(cursor).getUTCDay()) && skip.size < 7 && guard++ < 800) cursor += DAY_MS;
    return cursor;
  };
  return { from: add(Math.min(days[0], days[1])), to: add(Math.max(days[0], days[1])) };
}

/** Pixels to a gallery swipe, as in pdp-logic: vertical and short drags are ignored; toward the start edge is forward. */
function resolveSwipe(dx: number, dy: number, rtl: boolean): "next" | "prev" | null {
  if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.2) return null;
  return (rtl ? dx > 0 : dx < 0) ? "next" : "prev";
}
const stepIndex = (i: number, d: number, n: number) => (n <= 0 ? 0 : (((i + d) % n) + n) % n);
const zoomOrigin = (x: number, y: number, r: { left: number; top: number; width: number; height: number }) => {
  const clamp = (n: number) => Math.min(100, Math.max(0, n));
  return { x: r.width ? clamp(((x - r.left) / r.width) * 100) : 50, y: r.height ? clamp(((y - r.top) / r.height) * 100) : 50 };
};
const isRtl = (el: Element) => {
  const dir = el.closest("[dir]")?.getAttribute("dir");
  return dir ? dir === "rtl" : getComputedStyle(el).direction === "rtl";
};
const toLatin = (text: string) => text.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));

export const productDetail: Register = (Alpine) => {
  const nq = () => Alpine.store("nq") as Store;
  const t = (en: string, ar: string) => nq().t(en, ar);
  const num = (n: number, options?: Intl.NumberFormatOptions) => new Intl.NumberFormat(`${nq().locale}-u-nu-latn`, options).format(n);

  // ---------------------------------------------------------------- the page
  Alpine.data("nqProductDetail", (config: Config) => ({
    product: config.product,
    images: config.images ?? [],
    selection: { ...(config.selection ?? {}) } as Selection,
    quantity: 1,
    pending: null as null | "add" | "buy",
    status: null as null | { kind: "ok" | "error" | "info"; text: string },
    invalid: [] as string[],
    cityId: config.delivery?.defaultCityId ?? config.delivery?.cities[0]?.id ?? null,
    wish: Boolean(config.wishlisted),
    barVisible: false,
    /** One getter/setter per option axis, for x-model on select-style axes: x-model="axis.size". */
    axis: {} as Record<string, string | null>,
    _timer: undefined as ReturnType<typeof setTimeout> | undefined,

    init(this: any) {
      const self = this;
      for (const option of this.product.options as Option[]) {
        Object.defineProperty(this.axis, option.id, {
          enumerable: true,
          configurable: true,
          get: () => self.selection[option.id] ?? null,
          set: (value: string | null) => {
            if (value && value !== self.selection[option.id]) self.pick(option.id, value);
          },
        });
      }
      const cta = (this as Magics).$el.querySelector('[data-slot="product-cta"]');
      if (cta && typeof IntersectionObserver !== "undefined") {
        const io = new IntersectionObserver(([entry]) => (self.barVisible = entry ? !entry.isIntersecting && entry.boundingClientRect.top < 0 : false), { threshold: 0 });
        io.observe(cta);
      }
    },

    // -- derived state
    get variant(): Variant | undefined {
      return findVariant(this.product as Product, this.selection);
    },
    get stock(): Stock {
      return stockState(this.variant, config.lowStock ?? 5);
    },
    get soldOut(): boolean {
      return this.stock.kind === "out";
    },
    get maxQty(): number | undefined {
      return maxPurchasable(this.variant, config.maxPerOrder);
    },
    get qty(): number {
      return clampQty(this.quantity, this.maxQty);
    },
    get price() {
      return displayPrice(this.product as Product, this.variant);
    },
    get minor(): number {
      return 10 ** (config.exponent ?? 2);
    },
    get currency(): string {
      return config.currency ?? nq().currency ?? (nq().locale.startsWith("ar") ? "SAR" : "USD");
    },
    money(amount: number): string {
      return formatMoney(amount / this.minor, { locale: nq().locale, currency: this.currency, compact: true });
    },
    get priceText(): string {
      return this.money(this.price.price);
    },
    get compareText(): string {
      return this.price.compareAt ? this.money(this.price.compareAt) : "";
    },
    get percentText(): string {
      return t(`${num(this.price.percentOff / 100, { style: "percent" })} off`, `خصم ${num(this.price.percentOff / 100, { style: "percent" })}`);
    },
    get stockText(): string {
      const s = this.stock as Stock;
      if (s.kind === "low") return t(`Only ${num(s.left)} left in stock`, `باقي ${num(s.left)} فقط في المخزون`);
      if (s.kind === "in-stock" || s.kind === "untracked") return t("In stock", "متوفر");
      if (s.kind === "backorder") return t("Available on backorder", "متاح بالطلب المسبق");
      if (s.kind === "out") return t("Out of stock", "غير متوفر حاليًا");
      return "";
    },
    get stockTone(): "warning" | "success" | "info" | "danger" | "" {
      const k = (this.stock as Stock).kind;
      return k === "low" ? "warning" : k === "in-stock" || k === "untracked" ? "success" : k === "backorder" ? "info" : k === "out" ? "danger" : "";
    },
    get addLabel(): string {
      return this.pending === "add" ? t("Adding to cart", "جارٍ الإضافة إلى السلة") : this.soldOut ? t("Sold out", "نفد المخزون") : t("Add to cart", "أضف إلى السلة");
    },
    get pickedLabels(): string {
      return (this.product as Product).options
        .map((o) => o.values.find((v) => v.id === this.selection[o.id])?.label)
        .filter(Boolean)
        .join(" · ");
    },
    get showSticky(): boolean {
      return this.barVisible;
    },

    // -- delivery
    get city(): City | undefined {
      return config.delivery?.cities.find((c) => c.id === this.cityId);
    },
    get deliveryLine(): string {
      const d = config.delivery;
      const city = this.city as City | undefined;
      if (!d || !city) return "";
      const { from, to } = deliveryWindow(d.now ?? Date.now(), city.etaDays, { skipWeekdays: d.skipWeekdays, cutoffHour: d.cutoffHour });
      const range = new Intl.DateTimeFormat(`${nq().locale}-u-nu-latn`, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).formatRange(from, to);
      const fee = city.fee ? t(`Delivery ${this.money(city.fee)}`, `رسوم التوصيل ${this.money(city.fee)}`) : t("Free delivery", "توصيل مجاني");
      return `${t(`Arrives ${range}`, `يصلك ${range}`)} · ${fee}`;
    },

    // -- option axes
    avail(optionId: string, valueId: string): Availability {
      return availability(this.product as Product, this.selection, optionId)[valueId] ?? "available";
    },
    shown(optionId: string, valueId: string): boolean {
      return config.impossible === "disable" || this.avail(optionId, valueId) !== "none";
    },
    isChecked(optionId: string, valueId: string): boolean {
      return this.selection[optionId] === valueId;
    },
    /** Roving tabindex: the checked radio, or the first reachable one while the axis is unpicked. */
    tabindexFor(optionId: string, valueId: string): number {
      if (this.selection[optionId]) return this.selection[optionId] === valueId ? 0 : -1;
      const first = (this.product as Product).options.find((o) => o.id === optionId)?.values.find((v) => this.avail(optionId, v.id) !== "none");
      return first?.id === valueId ? 0 : -1;
    },
    spoken(label: string, optionId: string, valueId: string): string {
      const a = this.avail(optionId, valueId);
      return a === "out" ? `${label}, ${t("Sold out", "نفد المخزون")}` : a === "none" ? `${label}, ${t("Unavailable", "غير متاح")}` : label;
    },
    pickedValue(optionId: string): string {
      return (this.product as Product).options.find((o) => o.id === optionId)?.values.find((v) => v.id === this.selection[optionId])?.label ?? "";
    },
    /** Arrow keys on a radio group: reading order (flipped in RTL), the radio takes the pick on focus. */
    radioKey(this: any, event: KeyboardEvent, optionId: string) {
      const group = event.currentTarget as HTMLElement;
      const rtl = isRtl(group);
      const next = ["ArrowDown", rtl ? "ArrowLeft" : "ArrowRight"];
      const prev = ["ArrowUp", rtl ? "ArrowRight" : "ArrowLeft"];
      if (![...next, ...prev].includes(event.key)) return;
      const items = [...group.querySelectorAll<HTMLElement>('[role="radio"]:not([disabled])')].filter((el) => !el.closest("[hidden]") && el.style.display !== "none");
      if (!items.length) return;
      event.preventDefault();
      const at = items.indexOf(document.activeElement as HTMLElement);
      const to = items[(at + (next.includes(event.key) ? 1 : -1) + items.length) % items.length]!;
      to.focus();
      to.click();
      void optionId;
    },

    // -- actions
    pick(this: any, optionId: string, valueId: string) {
      const product = this.product as Product;
      const next = selectValue(product, this.selection, optionId, valueId);
      this.selection = next;
      this.invalid = [];
      this.status = null;
      const variant = findVariant(product, next);
      const src = imageFor(product, next, variant);
      if (src) {
        const gallery = (this as Magics).$el.querySelector('[data-slot="product-gallery"]');
        gallery?.dispatchEvent(new CustomEvent("nq-gallery-show", { detail: { src } }));
      }
      this.quantity = clampQty(this.quantity, maxPurchasable(variant, config.maxPerOrder));
      (this as Magics).$dispatch("nq-variant-change", { variantId: variant?.id ?? null, variant, selection: { ...next } });
    },

    flash(this: any, next: { kind: "ok" | "error" | "info"; text: string } | null) {
      this.status = next;
      clearTimeout(this._timer);
      if (next && (next.kind === "ok" || next.kind === "info")) this._timer = setTimeout(() => (this.status = null), 4000);
    },

    async run(this: any, kind: "add" | "buy") {
      if (this.pending) return;
      const product = this.product as Product;
      const variant = this.variant as Variant | undefined;
      if (!variant) {
        const missing = product.options.filter((o) => !this.selection[o.id]);
        this.invalid = missing.map((o) => o.id);
        const names = missing.map((o) => o.name).join(" / ");
        this.flash({ kind: "error", text: t(`Select ${names} first`, `اختر ${names} أولًا`) });
        (this as Magics).$el.querySelector<HTMLElement>('[data-slot="product-variant-picker"]')?.scrollIntoView?.({ behavior: "smooth", block: "center" });
        return;
      }
      const quantity = this.qty as number;
      if (!inStock(variant, quantity)) return;
      this.pending = kind;
      this.flash(null);
      const waits: Promise<unknown>[] = [];
      const detail = { variantId: variant.id, quantity, variant, wait: (p: unknown) => void waits.push(Promise.resolve(p)) };
      try {
        (this as Magics).$dispatch(kind === "add" ? "nq-add-to-cart" : "nq-buy-now", detail);
        const results = await Promise.all(waits);
        const failure = results.find((r) => r && typeof r === "object" && (r as { error?: string }).error) as { error: string } | undefined;
        if (failure) this.flash({ kind: "error", text: failure.error });
        else if (kind === "add") this.flash({ kind: "ok", text: t("Added to cart", "تمت الإضافة إلى السلة") });
      } catch {
        this.flash({ kind: "error", text: t("Could not add this to your cart. Try again.", "تعذّرت الإضافة إلى السلة. حاول مرة أخرى.") });
      } finally {
        this.pending = null;
      }
    },

    toggleWish(this: any) {
      this.wish = !this.wish;
      (this as Magics).$dispatch("nq-wishlist-change", { wishlisted: this.wish });
    },

    async share(this: any) {
      const url = config.shareUrl ?? (typeof location === "undefined" ? "" : location.href);
      const title = (this.product as Product).name;
      const event = new CustomEvent("nq-share", { detail: { url, title }, bubbles: true, composed: true, cancelable: true });
      (this as Magics).$el.dispatchEvent(event);
      if (event.defaultPrevented) return;
      try {
        if (typeof navigator !== "undefined" && typeof navigator.share === "function") await navigator.share({ title, url });
        else {
          await navigator.clipboard.writeText(url);
          this.flash({ kind: "info", text: t("Link copied", "تم نسخ الرابط") });
        }
      } catch {
        /* dismissed */
      }
    },
  }));

  // ---------------------------------------------------------------- the quantity stepper (value is x-modelable)
  Alpine.data("nqProductQuantity", (initial = 1, max: number | null = null) => ({
    value: initial,
    max: max as number | null | undefined,
    disabled: false,
    draft: null as string | null,
    hint: false,
    init(this: any) {
      this.$watch("max", () => {
        if (this.clamped !== this.value) this.value = this.clamped;
      });
    },
    get limit(): number | null {
      return this.max === null || this.max === undefined ? null : Math.max(this.max, 1);
    },
    get clamped(): number {
      return clampQty(this.value, this.limit);
    },
    get atMax(): boolean {
      return this.limit !== null && this.clamped >= this.limit;
    },
    get display(): string {
      return this.draft ?? num(this.clamped, { useGrouping: false });
    },
    get hintText(): string {
      return this.hint && this.limit !== null ? t(`Only ${num(this.limit)} available`, `المتاح ${num(this.limit)} فقط`) : "";
    },
    commit(this: any, raw: number) {
      const next = clampQty(raw, this.limit);
      this.hint = this.limit !== null && Math.floor(raw) > this.limit;
      this.draft = null;
      this.value = next;
    },
    onInput(this: any, event: Event) {
      this.draft = (event.target as HTMLInputElement).value.replace(/[^\d٠-٩]/g, "");
    },
    onBlur(this: any) {
      if (this.draft !== null) this.commit(Number(toLatin(this.draft)));
    },
    onKey(this: any, event: KeyboardEvent) {
      if (event.key === "Enter") this.commit(this.draft === null ? this.clamped : Number(toLatin(this.draft)));
      else if (event.key === "ArrowUp") {
        event.preventDefault();
        this.commit(this.clamped + 1);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        this.commit(this.clamped - 1);
      }
    },
  }));

  // ---------------------------------------------------------------- the gallery
  Alpine.data("nqProductGallery", (images: { src: string }[] = [], _name = "") => {
    /** Pointer handling shared by the page viewport ("hover" zoom) and the lightbox ("click" zoom). */
    const viewport = (mode: "hover" | "click") => {
      const key = mode === "hover" ? "origin" : "lbOrigin";
      return {
        ":data-zoomed"(this: any) {
          return this[key] ? "" : undefined;
        },
        "x-on:pointerdown"(this: any, event: PointerEvent) {
          this._swiped = false;
          this._start = { x: event.clientX, y: event.clientY };
        },
        "x-on:pointerup"(this: any, event: PointerEvent) {
          const from = this._start as { x: number; y: number } | null;
          this._start = null;
          if (!from || this[key]) return;
          const result = resolveSwipe(event.clientX - from.x, event.clientY - from.y, isRtl(event.currentTarget as Element));
          if (result) {
            this._swiped = true;
            this.step(result === "next" ? 1 : -1);
          }
        },
        "x-on:pointercancel"(this: any) {
          this._start = null;
        },
        "x-on:pointermove"(this: any, event: PointerEvent) {
          if (mode === "hover" && this.zoom && event.pointerType === "mouse" && this[key]) this[key] = zoomOrigin(event.clientX, event.clientY, (event.currentTarget as Element).getBoundingClientRect());
        },
        "x-on:pointerenter"(this: any, event: PointerEvent) {
          if (mode === "hover" && this.zoom && event.pointerType === "mouse") this[key] = zoomOrigin(event.clientX, event.clientY, (event.currentTarget as Element).getBoundingClientRect());
        },
        "x-on:pointerleave"(this: any) {
          if (mode === "hover") this[key] = null;
        },
      };
    };
    const stage = (mode: "hover" | "click") => {
      const key = mode === "hover" ? "origin" : "lbOrigin";
      return {
        "x-on:keydown"(this: any, event: KeyboardEvent) {
          const rtl = isRtl(event.currentTarget as Element);
          const forward = rtl ? "ArrowLeft" : "ArrowRight";
          const back = rtl ? "ArrowRight" : "ArrowLeft";
          if (event.key === forward) this.step(1);
          else if (event.key === back) this.step(-1);
          else if (event.key === "Escape" && this[key]) {
            this[key] = null;
            event.stopPropagation();
          } else return;
          if (event.key !== "Escape") this[key] = null;
        },
        "x-on:click"(this: any, event: MouseEvent) {
          if (this._swiped) {
            this._swiped = false;
            return;
          }
          if (mode === "click") {
            if (this[key]) this[key] = null;
            else this[key] = zoomOrigin(event.clientX, event.clientY, (event.currentTarget as HTMLElement).parentElement!.getBoundingClientRect());
          } else if (this.zoom) this.lightbox = true;
        },
      };
    };
    return {
      images,
      index: 0,
      origin: null as null | { x: number; y: number },
      lbOrigin: null as null | { x: number; y: number },
      failed: {} as Record<string, boolean>,
      zoom: true,
      lightbox: false,
      _start: null as null | { x: number; y: number },
      _swiped: false,
      viewport: viewport("hover"),
      stage: stage("hover"),
      lbViewport: viewport("click"),
      lbStage: stage("click"),
      get count(): number {
        return this.images.length;
      },
      get position(): string {
        return t(`Image ${num(this.index + 1)} of ${num(this.count)}`, `الصورة ${num(this.index + 1)} من ${num(this.count)}`);
      },
      get currentFailed(): boolean {
        const image = this.images[this.index];
        return !image || Boolean(this.failed[image.src]);
      },
      go(this: any, next: number) {
        this.index = Math.min(Math.max(next, 0), Math.max(this.images.length - 1, 0));
        this.origin = null;
        this.lbOrigin = null;
      },
      step(this: any, delta: number) {
        this.go(stepIndex(this.index, delta, this.images.length));
      },
      /** The page's own selection moved: show the slide for this image, if the gallery has it. */
      show(this: any, src?: string) {
        const at = src ? (this.images as { src: string }[]).findIndex((i) => i.src === src) : -1;
        if (at >= 0) this.go(at);
      },
    };
  });
};

function imageFor(p: Product, s: Selection, v?: Variant): string | undefined {
  if (v?.image) return v.image;
  for (const option of p.options) {
    const picked = option.values.find((x) => x.id === s[option.id]);
    if (picked?.image) return picked.image;
  }
  return undefined;
}
