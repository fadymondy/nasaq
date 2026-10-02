/* eslint-disable @typescript-eslint/no-explicit-any */
// nqStoreCart, nqStoreQuantity, nqStoreCrossSell: the storefront cart. The markup is the React StoreCartPage / StoreMiniCart one
// (the Blade <x-nq::store-cart> and <x-nq::store-cart.mini-cart> render it); the state lives here. The lines are drawn on the
// client from the module's state, so totals, the free-shipping bar, the undo bar and the live announcer all follow each change.
//
//   <div data-slot="store-cart-page" x-data='nqStoreCart({ lines, currency, exponent, freeShippingThreshold, zones, promo, key })'>
//     <template x-for="line in active" :key="line.id"> … <button x-on:click="remove(line.id)"> … </template>
//     <div data-slot="store-cart-summary"> <span x-text="price(totals.total)"></span> </div>
//   </div>
//   <div x-data="nqStoreQuantity(1, 5, 1, 'Everyday tee')" x-on:store-quantity-change="…">…</div>   the spinbutton on its own
//   <div x-data='nqStoreCrossSell(items)'> <button x-on:click="add(0)">Add</button> </div>             the cross-sell cards
//
// Several parts on one page (the mini cart and the cart page) share one cart: they use the same `key` (default "default") and so the
// same state. The first one rendered seeds it from its `lines`; a later one with the same key joins it.
//
// React's callbacks become events, bubbling from the root of the part that was used (listen on it, an ancestor, or on window):
//   store-cart-quantity       detail { lineId, quantity, line }      a quantity changed (already lowered to the stock limit)
//   store-cart-remove         detail { lineId, line }                a line was removed; an undo bar shows for 8 seconds
//   store-cart-undo           detail { line }                        the removed line was put back
//   store-cart-save           detail { lineId, line }                a line was saved for later
//   store-cart-move           detail { lineId, line }                a saved line was moved back to the cart
//   store-cart-checkout       detail { lines, totals }               Checkout (not fired while a line is out of stock)
//   store-cart-continue       detail {}                              Continue shopping / Start shopping
//   store-cart-view           detail {}                              View cart in the mini cart
//   store-cart-open-product   detail { line } or { productId, name } View product (a line, or a cross-sell card)
//   store-cart-shipping-change detail { selection }                  the estimator picked a city and method (selection null when none)
//   store-cart-change         detail { lines }                       after every change, to persist the cart
//   store-cart-retry          detail {}                              Try again on the error state
// And one event goes in: window "store-cart-add" { item, quantity } adds a product (the cross-sell cards fire it; so can any button:
// $dispatch('store-cart-add', { item: { productId, variantId, name, unitPrice, maxQuantity?, image?, variantLabel?, compareAt? } })).
// It is cancelable: preventDefault() keeps the cart from adding, so a server can decide. The quantity stepper emits store-quantity-change
// { quantity } on itself. The promo box (x-nq::loyalty-promo.promo-code-field) is wired through its own nq-promo-* events.
// Money is minor units (cents). Currency defaults to USD, SAR in Arabic. Every string is $nq.t(en, ar).

import { formatMoney } from "../core/money";
import {
  type CartRemoval,
  type CartNewLine,
  type CommerceCartLine,
  type CommerceShippingMethod,
  type StoreShippingZone,
  cartActiveLines,
  cartAdd,
  cartBlockers,
  cartCheapestShipping,
  cartCount,
  cartFixOverStock,
  cartMoveToCart,
  cartRemove,
  cartRestore,
  cartSaveForLater,
  cartSavedLines,
  cartSetQuantity,
  cartShippingOptions,
  cartStockIssue,
  commerceClampQuantity,
  commerceFreeShippingProgress,
  commerceTotals,
  matchShippingZone,
} from "./store-cart-logic";
import type { Register } from "./types";

export interface StoreShippingSelection {
  city: string;
  zoneId: string;
  zoneLabel: string;
  method: CommerceShippingMethod;
}
interface Applied {
  code: string;
  discount: number;
}
interface Config {
  lines?: CommerceCartLine[];
  currency?: string | null;
  exponent?: number;
  /** Free shipping starts here, minor units. */
  freeShippingThreshold?: number | null;
  zones?: StoreShippingZone[] | null;
  selection?: StoreShippingSelection | null;
  taxBps?: number;
  taxInclusive?: boolean;
  promo?: { applied?: Applied | null } | null;
  /** Parts with the same key share one cart. Default "default". */
  key?: string;
  /** What adding a product does: "drawer" opens the mini cart (default), "none" only updates it. */
  feedback?: "drawer" | "none";
  /** Milliseconds the undo bar stays; 0 keeps it. Default 8000. */
  undoMs?: number;
  /** Start with the mini cart open. */
  open?: boolean;
  loading?: boolean;
  error?: boolean;
}
interface Shared {
  lines: CommerceCartLine[];
  removed: CartRemoval | null;
  msg: { id: number; text: string };
  drawerOpen: boolean;
  discount: number;
  promoCode: string | null;
  selection: StoreShippingSelection | null;
}
interface Store {
  locale: string;
  currency: string | null;
  t(en: string, ar: string): string;
}

const roots = new Map<string, Set<HTMLElement>>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const toLatin = (value: string) => value.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));

export const storeCart: Register = (Alpine) => {
  const nq = () => Alpine.store("nq") as Store;
  const t = (en: string, ar: string) => nq().t(en, ar);
  const num = (n: number) => new Intl.NumberFormat(`${nq().locale}-u-nu-latn`).format(n);
  /** "1 item", "2 items"; Arabic uses the singular, dual and plural forms. */
  const items = (n: number) => t(`${num(n)} ${n === 1 ? "item" : "items"}`, n === 1 ? "عنصر واحد" : n === 2 ? "عنصران" : n >= 3 && n <= 10 ? `${num(n)} عناصر` : `${num(n)} عنصرًا`);
  const emit = (el: Element, name: string, detail: unknown = {}) => el.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true, detail }));

  // ---------------------------------------------------------------- the cart (page, mini cart and every part inside them)
  Alpine.data("nqStoreCart", (config: Config = {}) => {
    const key = `nqStoreCart:${config.key ?? "default"}`;
    const alive = [...(roots.get(key) ?? [])].filter((el) => el.isConnected);
    roots.set(key, new Set(alive));
    let s = Alpine.store(key) as Shared | undefined;
    if (!s || alive.length === 0) {
      const sel = config.selection ?? null;
      Alpine.store(key, {
        lines: (config.lines ?? []).map((l) => ({ ...l })),
        removed: null,
        msg: { id: 0, text: "" },
        drawerOpen: Boolean(config.open),
        discount: config.promo?.applied?.discount ?? 0,
        promoCode: config.promo?.applied?.code ?? null,
        selection: sel ? { ...sel } : null,
      } satisfies Shared);
      s = Alpine.store(key) as Shared;
    }
    const exponent = config.exponent ?? 2;
    const zones = config.zones ?? [];
    const first = s.selection;

    return {
      s,
      _root: null as HTMLElement | null,
      city: first?.city ?? "",
      searched: (first?.city ?? null) as string | null,
      loading: Boolean(config.loading),
      error: Boolean(config.error),
      threshold: config.freeShippingThreshold ?? 0,
      zones,

      init(this: any) {
        this._root = this.$el as HTMLElement;
        roots.get(key)!.add(this._root!);
      },
      destroy(this: any) {
        roots.get(key)?.delete(this._root);
      },

      /** Opens the mini cart (the sheet follows drawerOpen). */
      show() {
        this.s.drawerOpen = true;
      },
      outClass(line: CommerceCartLine): string {
        return cartStockIssue(line)?.kind === "out" ? "opacity-60" : "";
      },

      // -- text helpers
      n: num,
      /** Minor units as money: whole amounts without decimals. */
      money(minor: number): string {
        return formatMoney(minor / 10 ** exponent, { ...(config.currency ? { currency: config.currency } : {}), locale: nq().locale, compact: true });
      },
      /** Like money(), but 0 reads "Free" (prices; sums and negatives use money()). */
      price(minor: number): string {
        return minor === 0 ? t("Free", "مجاني") : this.money(minor);
      },

      // -- state
      get lines(): CommerceCartLine[] {
        return this.s.lines;
      },
      get active(): CommerceCartLine[] {
        return cartActiveLines(this.s.lines);
      },
      get saved(): CommerceCartLine[] {
        return cartSavedLines(this.s.lines);
      },
      get hasActive(): boolean {
        return this.active.length > 0;
      },
      get hasSaved(): boolean {
        return this.saved.length > 0;
      },
      get hasAny(): boolean {
        return this.s.lines.length > 0;
      },
      get blockers(): CommerceCartLine[] {
        return cartBlockers(this.s.lines);
      },
      get blocked(): boolean {
        return this.blockers.length > 0;
      },
      get canFix(): boolean {
        return this.blockers.some((l: CommerceCartLine) => l.maxQuantity !== undefined && l.maxQuantity > 0);
      },
      get count(): number {
        return cartCount(this.s.lines);
      },
      get hasCount(): boolean {
        return this.count > 0;
      },
      get countText(): string {
        return items(this.totals.itemCount);
      },
      get countBadge(): string {
        return num(this.count);
      },
      get cartLabel(): string {
        return t(`Cart, ${items(this.count)}`, `السلة، ${items(this.count)}`);
      },
      get savedTitle(): string {
        return t(`Saved for later (${num(this.saved.length)})`, `محفوظ لوقت لاحق (${num(this.saved.length)})`);
      },
      get discount(): number {
        return this.s.discount;
      },
      get selection(): StoreShippingSelection | null {
        return this.s.selection;
      },
      get drawerOpen(): boolean {
        return this.s.drawerOpen;
      },
      set drawerOpen(open: boolean) {
        this.s.drawerOpen = Boolean(open);
      },
      get removed(): CartRemoval | null {
        return this.s.removed;
      },
      get removedText(): string {
        const name = this.s.removed?.line.name ?? "";
        return t(`${name} was removed`, `تمت إزالة ${name}`);
      },
      /** The text of the aria-live region; the same words are read again because a trailing space alternates. */
      get announcement(): string {
        const m = this.s.msg as { id: number; text: string };
        return m.text ? `${m.text}${m.id % 2 ? " " : ""}` : "";
      },
      get totals() {
        const sel = this.s.selection as StoreShippingSelection | null;
        return commerceTotals({
          lines: this.s.lines,
          discount: this.s.discount,
          ...(sel ? { shipping: sel.method } : {}),
          ...(config.taxBps ? { taxBps: config.taxBps } : {}),
          ...(config.taxInclusive !== undefined ? { taxInclusive: config.taxInclusive } : {}),
        });
      },
      get hasDiscount(): boolean {
        return this.totals.discount > 0;
      },
      get hasTax(): boolean {
        return this.totals.tax > 0;
      },
      get hasSavings(): boolean {
        return this.totals.savings > 0;
      },
      get savingText(): string {
        const m = this.money(this.totals.savings);
        return t(`You are saving ${m}`, `وفّرت ${m}`);
      },
      get hasShipping(): boolean {
        return this.s.selection !== null;
      },
      get shippingFree(): boolean {
        return this.s.selection !== null && this.totals.shipping === 0;
      },
      get shippingPaid(): boolean {
        return this.s.selection !== null && this.totals.shipping !== 0;
      },
      get noShipping(): boolean {
        return this.s.selection === null;
      },
      get checkoutDisabled(): boolean {
        return this.blocked || this.totals.itemCount === 0;
      },
      get showError(): boolean {
        return this.error;
      },
      get showLoading(): boolean {
        return !this.error && this.loading;
      },
      get showEmpty(): boolean {
        return !this.error && !this.loading && !this.hasAny;
      },
      get showContent(): boolean {
        return !this.error && !this.loading && this.hasAny;
      },
      get showEmptyActive(): boolean {
        return !this.hasActive;
      },

      // -- free shipping
      get hasThreshold(): boolean {
        return this.threshold > 0;
      },
      get free() {
        return commerceFreeShippingProgress(this.totals.subtotal, this.threshold);
      },
      get freeUnlocked(): boolean {
        return this.free.remaining === 0;
      },
      get freePercent(): number {
        return Math.round(this.free.progress * 100);
      },
      get freeText(): string {
        if (this.freeUnlocked) return t("You have free shipping", "حصلت على الشحن المجاني");
        const m = this.money(this.free.remaining);
        return t(`You are ${m} away from free shipping`, `يفصلك ${m} عن الشحن المجاني`);
      },

      // -- one line
      lineTotalText(line: CommerceCartLine): string {
        return this.price(line.unitPrice * line.quantity);
      },
      compareTotalText(line: CommerceCartLine): string {
        return line.compareAt && line.compareAt > line.unitPrice ? this.money(line.compareAt * line.quantity) : "";
      },
      hasCompare(line: CommerceCartLine): boolean {
        return Boolean(line.compareAt && line.compareAt > line.unitPrice);
      },
      multi(line: CommerceCartLine): boolean {
        return line.quantity > 1;
      },
      eachText(line: CommerceCartLine): string {
        return `${this.money(line.unitPrice)} ${t("each", "للقطعة")}`;
      },
      removeLabel(line: CommerceCartLine): string {
        return t(`Remove ${line.name}`, `إزالة ${line.name}`);
      },
      isOut(line: CommerceCartLine): boolean {
        return cartStockIssue(line)?.kind === "out";
      },
      /** The stock problem to show: all of them in the cart, only "out" for a saved line. */
      stockKind(line: CommerceCartLine, saved = false): string | undefined {
        const issue = cartStockIssue(line);
        return saved && issue?.kind !== "out" ? undefined : issue?.kind;
      },
      stockText(line: CommerceCartLine, saved = false): string {
        const issue = this.stockKind(line, saved) ? cartStockIssue(line) : undefined;
        if (!issue) return "";
        if (issue.kind === "out") return t("Out of stock", "غير متوفر");
        const a = num(issue.available);
        return issue.kind === "over" ? t(`Only ${a} left, lower the quantity`, `المتبقي ${a} فقط، قلّل الكمية`) : t(`Only ${a} left`, `المتبقي ${a} فقط`);
      },
      stockClass(line: CommerceCartLine, saved = false): string {
        const kind = this.stockKind(line, saved);
        return kind === "out" ? "text-nq-danger-text" : kind === "over" ? "text-nq-warning-text" : "text-muted-foreground";
      },

      // -- announcements and events
      say(this: any, text: string) {
        const m = this.s.msg as { id: number; text: string };
        this.s.msg = { id: m.id + 1, text };
      },
      emit(this: any, name: string, detail: unknown = {}) {
        emit((this._root ?? this.$el) as Element, name, detail);
      },
      nameOf(this: any, id: string): string {
        return (this.s.lines as CommerceCartLine[]).find((l) => l.id === id)?.name ?? "";
      },
      lineOf(this: any, id: string): CommerceCartLine | undefined {
        return (this.s.lines as CommerceCartLine[]).find((l) => l.id === id);
      },
      commit(this: any, next: CommerceCartLine[]) {
        this.s.lines = next;
        this.emit("store-cart-change", { lines: next.map((l) => ({ ...l })) });
      },
      stopTimer() {
        clearTimeout(timers.get(key));
        timers.delete(key);
      },

      // -- actions (the same set as useStoreCart)
      setQuantity(this: any, lineId: string, quantity: number) {
        const name = this.nameOf(lineId);
        const result = cartSetQuantity(this.s.lines, lineId, quantity);
        if (result.changed) this.commit(result.lines);
        if (result.changed || result.clamped) {
          const q = num(result.quantity);
          this.say(result.clamped ? t(`${name}, only ${q} available, quantity set to ${q}`, `${name}، المتاح ${q} فقط، وتم ضبط الكمية على ${q}`) : t(`${name}, quantity ${q}`, `${name}، الكمية ${q}`));
          this.emit("store-cart-quantity", { lineId, quantity: result.quantity, line: { ...this.lineOf(lineId) } });
        }
        return result;
      },
      add(this: any, item: CartNewLine, quantity = 1) {
        const result = cartAdd(this.s.lines, item, quantity);
        this.commit(result.lines);
        this.stopTimer();
        this.s.removed = null;
        const q = num(result.quantity);
        this.say(result.clamped ? t(`${item.name}, only ${q} available, quantity set to ${q}`, `${item.name}، المتاح ${q} فقط، وتم ضبط الكمية على ${q}`) : t(`${item.name} added to your cart, quantity ${q}`, `تمت إضافة ${item.name} إلى سلتك، الكمية ${q}`));
        if ((config.feedback ?? "drawer") === "drawer") this.s.drawerOpen = true;
        return result;
      },
      /** window "store-cart-add": every cart part hears it, only the first one adds (the cart is shared). */
      onAdd(this: any, event: CustomEvent<{ item?: CartNewLine; quantity?: number }>) {
        const done = ((event as any)._nqCart ??= new Set<string>()) as Set<string>;
        if (event.defaultPrevented || done.has(key) || !event.detail?.item) return;
        done.add(key);
        this.add(event.detail.item, event.detail.quantity ?? 1);
      },
      remove(this: any, lineId: string) {
        const name = this.nameOf(lineId);
        const line = this.lineOf(lineId);
        const result = cartRemove(this.s.lines, lineId);
        if (!result.removed) return;
        this.commit(result.lines);
        this.s.removed = result.removed;
        this.say(t(`${name} removed from your cart`, `تمت إزالة ${name} من سلتك`));
        this.emit("store-cart-remove", { lineId, line: { ...line } });
        this.stopTimer();
        const ms = config.undoMs ?? 8000;
        if (ms > 0) timers.set(key, setTimeout(() => this.dismissRemoved(), ms));
      },
      undo(this: any) {
        const last = this.s.removed as CartRemoval | null;
        if (!last) return;
        this.stopTimer();
        this.commit(cartRestore(this.s.lines, last));
        this.say(t(`${last.line.name} is back in your cart`, `عاد ${last.line.name} إلى سلتك`));
        this.s.removed = null;
        this.emit("store-cart-undo", { line: { ...last.line } });
      },
      dismissRemoved(this: any) {
        this.stopTimer();
        this.s.removed = null;
      },
      saveForLater(this: any, lineId: string) {
        const name = this.nameOf(lineId);
        const line = this.lineOf(lineId);
        this.commit(cartSaveForLater(this.s.lines, lineId));
        this.say(t(`${name} saved for later`, `تم حفظ ${name} لوقت لاحق`));
        this.emit("store-cart-save", { lineId, line: { ...line } });
      },
      moveToCart(this: any, lineId: string) {
        const name = this.nameOf(lineId);
        const line = this.lineOf(lineId);
        this.commit(cartMoveToCart(this.s.lines, lineId));
        this.say(t(`${name} moved back to your cart`, `تمت إعادة ${name} إلى سلتك`));
        this.emit("store-cart-move", { lineId, line: { ...line } });
      },
      fixStock(this: any) {
        this.commit(cartFixOverStock(this.s.lines));
      },
      openProduct(this: any, line: CommerceCartLine) {
        this.emit("store-cart-open-product", { line: { ...line } });
      },
      checkout(this: any) {
        if (this.checkoutDisabled) return;
        this.emit("store-cart-checkout", { lines: cartActiveLines(this.s.lines).map((l) => ({ ...l })), totals: { ...this.totals } });
      },
      viewCart(this: any) {
        this.emit("store-cart-view", {});
      },
      continueShopping(this: any) {
        this.s.drawerOpen = false;
        this.emit("store-cart-continue", {});
      },
      retry(this: any) {
        this.emit("store-cart-retry", {});
      },

      // -- the promo box (x-nq::loyalty-promo.promo-code-field emits these)
      promoApplied(this: any, event: CustomEvent<{ applied?: Applied }>) {
        const applied = event.detail?.applied;
        if (applied) this.setPromo(applied);
      },
      promoRemoved(this: any) {
        const code = this.s.promoCode as string | null;
        this.s.discount = 0;
        this.s.promoCode = null;
        this.say(t(`Promo code ${code ?? ""} removed`, `تمت إزالة رمز الخصم ${code ?? ""}`));
      },
      /** A server-checked code reports through detail.setApplied; wrap it so the cart follows. */
      wrapPromo(this: any, event: CustomEvent<{ setApplied?: (a: Applied) => void }>) {
        const original = event.detail?.setApplied;
        if (typeof original !== "function") return;
        event.detail.setApplied = (applied: Applied) => {
          original(applied);
          this.setPromo(applied);
        };
      },
      setPromo(this: any, applied: Applied) {
        this.s.discount = applied.discount;
        this.s.promoCode = applied.code;
        this.say(t(`Promo code ${applied.code} applied`, `تم تطبيق رمز الخصم ${applied.code}`));
      },

      // -- the shipping estimator: city, then zone, then options with the cheapest preselected
      get zone(): StoreShippingZone | undefined {
        return this.searched ? matchShippingZone(this.zones, this.searched) : undefined;
      },
      get shippingSubtotal(): number {
        return this.totals.subtotal - this.s.discount;
      },
      get noZone(): boolean {
        return Boolean(this.searched) && !this.zone;
      },
      get noZoneText(): string {
        return t(`We do not deliver to ${this.searched} yet.`, `لا نوصّل إلى ${this.searched} حاليًا.`);
      },
      get zoneFound(): boolean {
        return Boolean(this.zone);
      },
      get zoneText(): string {
        return t(`Delivering to ${this.zone?.label ?? ""}`, `التوصيل إلى ${this.zone?.label ?? ""}`);
      },
      isZone(zi: number): boolean {
        return Boolean(this.zone) && this.zones[zi]?.id === this.zone?.id;
      },
      optionOf(zi: number, mi: number) {
        const z = this.zones[zi] as StoreShippingZone | undefined;
        const id = z?.methods[mi]?.id;
        return cartShippingOptions(z, this.shippingSubtotal).find((o) => o.method.id === id);
      },
      optionEta(zi: number, mi: number): string {
        const eta = this.optionOf(zi, mi)?.method.etaDays;
        if (!eta) return "";
        const [a, b] = eta;
        if (b <= 1 && a <= 1 && a !== b) return t("Ready today or tomorrow", "جاهز اليوم أو غدًا");
        const x = num(a);
        const y = num(b);
        if (a === b) return t(`Arrives in ${x} ${x === "1" ? "day" : "days"}`, `يصل خلال ${x === "1" ? "يوم واحد" : `${x} أيام`}`);
        return t(`Arrives in ${x} to ${y} days`, `يصل خلال ${x} إلى ${y} أيام`);
      },
      optionNote(zi: number, mi: number): string {
        const o = this.optionOf(zi, mi);
        if (!o || o.free || o.method.freeOver === undefined) return "";
        if (o.remaining !== undefined && o.remaining > 0) {
          const m = this.money(o.remaining);
          return t(`Add ${m} for free shipping`, `أضف ${m} للحصول على شحن مجاني`);
        }
        const m = this.money(o.method.freeOver);
        return t(`Free over ${m}`, `مجاني عند ${m} فأكثر`);
      },
      optionFree(zi: number, mi: number): boolean {
        return Boolean(this.optionOf(zi, mi)?.free);
      },
      optionCost(zi: number, mi: number): string {
        const o = this.optionOf(zi, mi);
        return o && !o.free ? this.money(o.cost) : "";
      },
      setSelection(this: any, next: StoreShippingSelection | null) {
        this.s.selection = next;
        this.emit("store-cart-shipping-change", { selection: next ? { ...next } : null });
      },
      estimate(this: any) {
        const text = String(this.city).trim();
        if (!text) return;
        this.searched = text;
        const found = matchShippingZone(this.zones, text);
        const cheapest = cartCheapestShipping(cartShippingOptions(found, this.shippingSubtotal));
        this.setSelection(found && cheapest ? { city: text, zoneId: found.id, zoneLabel: found.label, method: cheapest.method } : null);
      },
      /** x-model target of the radio cards: "zoneIndex:methodIndex" of the picked option ("" when none). */
      get pickedKey(): string {
        const sel = this.s.selection as StoreShippingSelection | null;
        if (!sel) return "";
        const zi = this.zones.findIndex((z: StoreShippingZone) => z.id === sel.zoneId);
        const mi = zi < 0 ? -1 : this.zones[zi].methods.findIndex((m: CommerceShippingMethod) => m.id === sel.method.id);
        return zi < 0 || mi < 0 ? "" : `${zi}:${mi}`;
      },
      set pickedKey(value: string) {
        const [zi, mi] = String(value ?? "").split(":").map(Number);
        const z = this.zones[zi as number] as StoreShippingZone | undefined;
        const method = z?.methods[mi as number];
        const sel = this.s.selection as StoreShippingSelection | null;
        if (!z || !method || !this.searched || (sel && sel.zoneId === z.id && sel.method.id === method.id)) return;
        this.setSelection({ city: this.searched, zoneId: z.id, zoneLabel: z.label, method });
      },
    };
  });

  // ---------------------------------------------------------------- the quantity stepper (a spin button)
  Alpine.data("nqStoreQuantity", (initial = 1, max: number | null = null, min = 1, name = "", disabled = false) => ({
    value: initial,
    max: max as number | null | undefined,
    min,
    name,
    disabled,
    draft: null as string | null,
    /** Follow a cart line: x-effect="sync(line)". */
    sync(line: { quantity: number; maxQuantity?: number; name?: string }) {
      this.value = line.quantity;
      this.max = line.maxQuantity ?? null;
      if (line.name !== undefined) this.name = line.name;
    },
    get top(): number | null {
      return this.max === null || this.max === undefined ? null : Math.max(this.max, this.min);
    },
    get atMax(): boolean {
      return this.top !== null && this.value >= this.top;
    },
    get atMin(): boolean {
      return this.value <= this.min;
    },
    get display(): string {
      return this.draft ?? String(this.value);
    },
    get hintText(): string {
      return this.top === null ? "" : t(`Only ${num(this.top)} available`, `المتاح ${num(this.top)} فقط`);
    },
    get groupLabel(): string {
      return t(`Quantity of ${this.name}`, `كمية ${this.name}`);
    },
    get decreaseLabel(): string {
      return t(`Decrease quantity of ${this.name}`, `تقليل كمية ${this.name}`);
    },
    get increaseLabel(): string {
      return t(`Increase quantity of ${this.name}`, `زيادة كمية ${this.name}`);
    },
    clamp(q: number): number {
      return Math.max(this.min, commerceClampQuantity(q, this.top ?? undefined));
    },
    set(this: any, q: number) {
      const next = this.clamp(q);
      this.draft = null;
      if (next !== this.value || q !== next) {
        this.value = next;
        (this.$dispatch as (n: string, d: unknown) => void)("store-quantity-change", { quantity: next });
      }
    },
    commit(this: any) {
      if (this.draft === null) return;
      const parsed = Number.parseInt(toLatin(this.draft).replace(/[^\d]/g, ""), 10);
      this.draft = null;
      if (Number.isFinite(parsed)) this.set(parsed);
    },
    onInput(this: any, event: Event) {
      this.draft = (event.target as HTMLInputElement).value;
    },
    onKey(this: any, event: KeyboardEvent) {
      if (event.key === "Enter") return void this.commit();
      const step = event.key === "ArrowUp" ? 1 : event.key === "ArrowDown" ? -1 : 0;
      if (step) {
        event.preventDefault();
        this.draft = null;
        this.set(this.value + step);
      } else if (event.key === "Home") {
        event.preventDefault();
        this.set(this.min);
      } else if (event.key === "End" && this.top !== null) {
        event.preventDefault();
        this.set(this.top);
      }
    },
  }));

  // ---------------------------------------------------------------- cross-sell cards: Add and View product are events
  Alpine.data("nqStoreCrossSell", (cards: { id: string; name: string; item?: CartNewLine | null }[] = []) => ({
    cards,
    _root: null as HTMLElement | null,
    init(this: any) {
      this._root = this.$el as HTMLElement;
      // The carousel arrows carry the cart wording ("Next products") instead of the generic one.
      const label = (slot: string, text: string) => this.$el.querySelector(`[data-slot="${slot}"]`)?.setAttribute("aria-label", text);
      label("carousel-previous", t("Previous products", "المنتجات السابقة"));
      label("carousel-next", t("Next products", "المنتجات التالية"));
    },
    /** Fires window "store-cart-add" { item, quantity: 1 } for the card's first in-stock variant. */
    add(this: any, index: number) {
      const card = this.cards[index];
      if (!card?.item) return;
      (this._root ?? this.$el).dispatchEvent(new CustomEvent("store-cart-add", { bubbles: true, composed: true, cancelable: true, detail: { item: card.item, quantity: 1, productId: card.id } }));
    },
    openProduct(this: any, index: number) {
      const card = this.cards[index];
      if (card) emit(this._root ?? this.$el, "store-cart-open-product", { productId: card.id, name: card.name });
    },
  }));
};
