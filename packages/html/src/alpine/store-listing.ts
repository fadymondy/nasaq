/* eslint-disable @typescript-eslint/no-explicit-any */
// nqStoreListing, nqStoreCard, nqStoreQuickView: the storefront results page. The markup is the React StoreListing's (the Blade
// <x-nq::store-listing> renders every product card once, with the first state server-rendered); the state lives here:
// filters, sort, view, paging, compare and wishlist. Filtering shows or hides the cards and re-orders them with CSS `order`.
//
//   <div data-slot="store-listing" x-data='nqStoreListing({ products, tree, currency, exponent, filters, pageSize, ... })'>
//     <article x-data='nqStoreCard({ product })'>…</article>   one per product, reads the listing it sits in
//     <div x-data="nqStoreQuickView">…<x-nq::dialog x-model="quickOpen">…</div>
//   </div>
//
// React's callbacks are events, bubbling from the element that caused them:
//   nq-add-to-cart            detail { productId, variantId, quantity, product, variant, wait(promise) }. Pass a promise to wait(): the
//                              button shows progress until it settles; a rejection (or { error }) leaves the button as it was.
//   nq-wishlist-change        detail { productId, wishlisted }
//   nq-compare-change         detail { ids }
//   nq-compare-add-to-cart    detail { productId, product }
//   nq-filters-change         detail { filters }          nq-sort-change   detail { sort }
//   nq-search                 detail { query }            (popular-search buttons; empty results)
//   nq-retry                  (the error state's button)
//   nq-navigate               detail { productId, href }. Cancelable: preventDefault() stops a card without a link from navigating.
// Money is minor units (cents). Currency defaults to USD, SAR in Arabic. Every string is en/ar from LISTING_STRINGS.

import { formatMoney } from "../core/money";
import {
  commerceClampQuantity,
  commerceFindVariant,
  commerceInStock,
  commerceValueAvailability,
  EMPTY_LISTING_FILTERS,
  fillTemplate,
  LISTING_STRINGS,
  LISTING_SORTS,
  listingActiveChips,
  listingBestDiscount,
  listingCheapestVariant,
  listingClear,
  listingCompareDifferences,
  listingCompareRows,
  listingFacets,
  listingFilter,
  listingFilterCount,
  listingHasPriceRange,
  listingLabelIndex,
  listingPage,
  listingProductInStock,
  listingRelaxations,
  listingRemoveChip,
  listingSort,
  listingToMajor,
  listingToMinor,
  listingToggleCompare,
  listingToggleOption,
  listingToggleValue,
  listingVisibleCount,
  type CommerceProduct as Product,
  type CommerceSelection as Selection,
  type CommerceVariant as Variant,
  type ListingCategoryNode,
  type ListingChip,
  type ListingFacets,
  type ListingFilters,
  type ListingSort,
} from "./store-listing-model";
import type { Register } from "./types";

type View = "grid" | "list";
type Density = "comfortable" | "compact";
type Target = "filters" | "draft";

interface Store {
  locale: string;
  currency: string | null;
}
interface ListingConfig {
  products: Product[];
  tree?: ListingCategoryNode[];
  currency?: string | null;
  exponent?: number;
  filters?: Partial<ListingFilters>;
  sort?: ListingSort;
  sorts?: ListingSort[];
  view?: View;
  density?: Density;
  pageSize?: number;
  paging?: "pages" | "load-more";
  compare?: boolean;
  compareMax?: number;
  compareIds?: string[];
  wishlistIds?: string[];
  showQueryChip?: boolean;
  /** "/p/{slug}": where a card links; {id} and {slug} are replaced. Default "#{slug}". */
  hrefPattern?: string | null;
}
interface CardConfig {
  product: Product;
  layout?: View;
  currency?: string | null;
  exponent?: number;
  href?: string | null;
  wishlisted?: boolean;
  compare?: boolean;
  quickView?: boolean;
  add?: boolean;
}

const copy = (f: Partial<ListingFilters> = {}): ListingFilters => ({
  ...EMPTY_LISTING_FILTERS,
  ...f,
  brands: [...(f.brands ?? [])],
  options: Object.fromEntries(Object.entries(f.options ?? {}).map(([k, v]) => [k, [...v]])),
  price: f.price ? ([f.price[0], f.price[1]] as [number, number]) : null,
});

/** Dispatches a bubbling event whose handlers may hand back promises through `wait`; resolves when they settle (rejects if one does or yields { error }). */
async function dispatchWait(el: Element, name: string, detail: Record<string, unknown>): Promise<void> {
  const waits: Promise<unknown>[] = [];
  el.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true, detail: { ...detail, wait: (p: unknown) => void waits.push(Promise.resolve(p)) } }));
  const results = await Promise.all(waits);
  const failed = results.find((r) => r && typeof r === "object" && "error" in (r as object) && (r as any).error);
  if (failed) throw new Error(String((failed as any).error));
}

export const storeListing: Register = (Alpine) => {
  const nq = () => Alpine.store("nq") as Store;
  const lang = () => (nq().locale.startsWith("ar") ? "ar" : "en");
  const S = (key: string, vars: Record<string, string | number> = {}): string => {
    const set = LISTING_STRINGS[lang()] as any;
    const [a, b] = key.split(".");
    const text = b ? set[a!]?.[b] : set[a!];
    return fillTemplate(typeof text === "string" ? text : key, vars);
  };
  const num = (n: number) => new Intl.NumberFormat(`${nq().locale}-u-nu-latn`).format(n);
  const code = (c?: string | null) => c ?? nq().currency ?? (nq().locale.startsWith("ar") ? "SAR" : "USD");
  const moneyOf = (minor: number, exp: number, c?: string | null) => formatMoney(minor / 10 ** exp, { locale: nq().locale, currency: code(c), compact: true });
  const hostOf = (el: Element): any => {
    const root = el.closest('[data-slot="store-listing"]');
    return root ? (Alpine as any).$data(root) : null;
  };

  // ---------------------------------------------------------------- the listing
  Alpine.data("nqStoreListing", (cfg: ListingConfig) => {
    // Derived data is cached by the JSON of what it depends on, so a hundred bindings cost one computation per change.
    const memo = new Map<string, { key: string; value: any }>();
    const cached = <T>(slot: string, key: string, make: () => T): T => {
      const hit = memo.get(slot);
      if (hit && hit.key === key) return hit.value;
      const value = make();
      memo.set(slot, { key, value });
      return value;
    };
    const products = cfg.products;
    const tree = cfg.tree ?? [];
    const exp = cfg.exponent ?? 2;
    const index = listingLabelIndex(products, tree);
    const bounds = (() => {
      const f = listingFacets(products, EMPTY_LISTING_FILTERS, tree, index).price;
      return { lo: Math.floor(listingToMajor(f.min, exp)), hi: Math.ceil(listingToMajor(f.max, exp)) };
    })();
    const byId = new Map(products.map((p) => [p.id, p]));

    return {
      products,
      filters: copy(cfg.filters),
      draft: copy(cfg.filters),
      sort: (cfg.sort ?? "relevance") as ListingSort,
      sorts: cfg.sorts ?? [...LISTING_SORTS],
      view: (cfg.view ?? "grid") as View,
      density: (cfg.density ?? "comfortable") as Density,
      pageSize: cfg.pageSize ?? 12,
      paging: cfg.paging ?? "pages",
      page: 1,
      presses: 0,
      notice: "",
      compareOn: cfg.compare !== false,
      compareMax: cfg.compareMax ?? 4,
      compareIds: [...(cfg.compareIds ?? [])] as string[],
      wishIds: [...(cfg.wishlistIds ?? [])] as string[],
      quickId: null as string | null,
      quickOpen: false,
      compareOpen: false,
      onlyDiff: false,
      sheetOpen: false,
      brandsAll: { filters: false, draft: false } as Record<Target, boolean>,
      lo: bounds.lo,
      hi: bounds.hi,
      /** The price slider's live value (major units); it commits to the filters shortly after the last move. */
      priceDraft: { filters: [bounds.lo, bounds.hi], draft: [bounds.lo, bounds.hi] } as Record<Target, number[]>,
      _priceTimer: undefined as ReturnType<typeof setTimeout> | undefined,

      init(this: any) {
        // The server-rendered first state is replaced by the live bindings.
        this.$root.querySelectorAll("[data-ssr]").forEach((el: Element) => el.remove());
        for (const t of ["filters", "draft"] as Target[]) this.syncPrice(t);
        this.$watch("filters", () => {
          this.page = 1;
          this.presses = 0;
          this.syncPrice("filters");
          this.$dispatch("nq-filters-change", { filters: copy(this.filters) });
        });
        this.$watch("sort", (sort: ListingSort) => {
          this.page = 1;
          this.presses = 0;
          this.$dispatch("nq-sort-change", { sort });
        });
        this.$watch("pageSize", () => {
          this.page = 1;
          this.presses = 0;
        });
        this.$watch("draft", () => this.syncPrice("draft"));
        this.$watch("priceDraft.filters", (v: number[]) => this.schedulePrice("filters", v));
        this.$watch("priceDraft.draft", (v: number[]) => this.schedulePrice("draft", v));
      },

      // -- results
      get sorted(): Product[] {
        const f = this.filters as ListingFilters;
        return cached("sorted", JSON.stringify([f, this.sort, nq().locale]), () => listingSort(listingFilter(products, f, { tree }), this.sort, f.query, nq().locale));
      },
      get total(): number {
        return this.sorted.length;
      },
      get pg() {
        return listingPage(this.total, this.page, this.pageSize);
      },
      get totalPages(): number {
        return this.pg.pageCount;
      },
      get visible(): Product[] {
        return this.paging === "pages" ? this.sorted.slice(this.pg.start, this.pg.end) : this.sorted.slice(0, listingVisibleCount(this.total, this.pageSize, this.presses));
      },
      get position(): Map<string, number> {
        return cached("position", JSON.stringify(this.sorted.map((p: Product) => p.id)), () => new Map<string, number>(this.sorted.map((p: Product, i: number) => [p.id, i] as [string, number])));
      },
      get visibleIds(): Set<string> {
        return cached("visible", JSON.stringify([this.visible.map((p: Product) => p.id)]), () => new Set<string>(this.visible.map((p: Product) => p.id)));
      },
      isShown(id: string): boolean {
        return this.visibleIds.has(id);
      },
      orderOf(id: string): number {
        return this.position.get(id) ?? 0;
      },
      isLast(id: string): boolean {
        return this.view === "list" && this.visible.length > 0 && this.visible[this.visible.length - 1]!.id === id;
      },
      get filterCount(): number {
        return listingFilterCount(this.filters);
      },
      get hasMore(): boolean {
        return this.visible.length < this.total;
      },
      get empty(): boolean {
        return this.total === 0;
      },

      // -- text
      get resultsText(): string {
        return this.total === 1 ? S("resultsOne") : S("results", { n: num(this.total) });
      },
      get showingText(): string {
        return S("showing", { from: num(this.pg.from), to: num(this.pg.to), total: num(this.pg.total) });
      },
      get loadedText(): string {
        return S("loadedOf", { n: num(this.visible.length), total: num(this.total) });
      },
      get filtersText(): string {
        return this.filterCount ? S("filtersCount", { n: num(this.filterCount) }) : S("filters");
      },
      get emptyTitle(): string {
        return this.filters.query ? S("noResultsFor", { query: this.filters.query }) : S("noResults");
      },
      get applyText(): string {
        const n = this.draftCount as number;
        return n === 0 ? S("applyNone") : S("apply", { n: num(n) });
      },
      sortLabel(s: string): string {
        return S(`sort.${s}`);
      },
      n(v: number): string {
        return num(v);
      },
      money(minor: number): string {
        return moneyOf(minor, exp, cfg.currency);
      },
      s(key: string, vars?: Record<string, string | number>): string {
        return S(key, vars);
      },

      // -- filter edits (target: the page's filters, or the sheet's draft)
      edit(t: Target, next: ListingFilters) {
        (this as any)[t] = next;
      },
      toggleBrand(t: Target, brand: string) {
        this.edit(t, { ...this[t], brands: listingToggleValue(this[t].brands, brand) });
      },
      toggleOpt(t: Target, optionId: string, valueId: string) {
        this.edit(t, listingToggleOption(this[t], optionId, valueId));
      },
      setCategory(t: Target, id: string | null) {
        this.edit(t, { ...this[t], category: this[t].category === id ? null : id });
      },
      setRating(t: Target, min: number) {
        this.edit(t, { ...this[t], minRating: this[t].minRating === min ? null : min });
      },
      setFlag(t: Target, flag: "inStock" | "onSale", on: boolean) {
        this.edit(t, { ...this[t], [flag]: on });
      },
      get viewModel(): string[] {
        return [this.view];
      },
      set viewModel(v: string[]) {
        if (v[0]) this.view = v[0] as View;
      },
      get densityModel(): string[] {
        return [this.density];
      },
      set densityModel(v: string[]) {
        if (v[0]) this.density = v[0] as Density;
      },
      catSel(t: Target, id: string): boolean {
        return (this[t] as ListingFilters).category === id;
      },
      /** A checkbox's two-way model for a brand: x-data="box('filters', 'b1')" with x-model="on". */
      box(this: any, t: Target, id: string) {
        const self = this;
        return {
          get on(): boolean {
            return self.isSel(t, "brand", id);
          },
          set on(v: boolean) {
            if (v !== self.isSel(t, "brand", id)) self.toggleBrand(t, id);
          },
        };
      },
      removeChip(chip: ListingChip) {
        this.filters = listingRemoveChip(this.filters, chip);
      },
      clearAll() {
        this.filters = listingClear(this.filters, !this.showQuery);
      },
      resetFilters() {
        this.filters = listingClear(this.filters, false);
      },
      showQuery: Boolean(cfg.showQueryChip),
      get chips() {
        return listingActiveChips(this.filters).filter((c) => this.showQuery || c.kind !== "query");
      },
      chipLabel(chip: ListingChip): string {
        switch (chip.kind) {
          case "query":
            return `“${chip.value}”`;
          case "category":
            return index.categories.get(chip.value) ?? chip.value;
          case "brand":
            return chip.value;
          case "option":
            return index.options.get(chip.optionId)?.values.get(chip.value)?.label ?? chip.value;
          case "price":
            return `${this.money(chip.value[0])} – ${this.money(chip.value[1])}`;
          case "rating":
            return S("andUp", { n: num(chip.value) });
          case "stock":
            return S("inStock");
          case "sale":
            return S("onSale");
        }
      },
      get relaxations() {
        return this.empty ? listingRelaxations(products, this.filters, tree).slice(0, 4) : [];
      },
      search(query: string) {
        this.$dispatch("nq-search", { query });
      },

      // -- price slider: major units in, minor units out
      syncPrice(t: Target) {
        const p = this[t].price as [number, number] | null;
        const next = p ? [listingToMajor(p[0], exp), listingToMajor(p[1], exp)] : [this.lo, this.hi];
        const cur = this.priceDraft[t];
        if (cur[0] !== next[0] || cur[1] !== next[1]) this.priceDraft[t] = next;
      },
      schedulePrice(t: Target, v: number[]) {
        const p = this[t].price as [number, number] | null;
        const applied = p ? [listingToMajor(p[0], exp), listingToMajor(p[1], exp)] : [this.lo, this.hi];
        if (!v || (v[0] === applied[0] && v[1] === applied[1])) return;
        clearTimeout(this._priceTimer);
        this._priceTimer = setTimeout(() => {
          const full = v[0]! <= this.lo && v[1]! >= this.hi;
          this.edit(t, { ...this[t], price: full ? null : [listingToMinor(v[0]!, exp), listingToMinor(v[1]!, exp)] });
        }, 250);
      },

      // -- facets: counts and selection for the page (filters) or the sheet (draft)
      facetsOf(t: Target): ListingFacets {
        const f = this[t] as ListingFilters;
        return cached(`facets:${t}`, JSON.stringify(f), () => listingFacets(products, f, tree, index));
      },
      count(t: Target, kind: "cat" | "brand" | "opt" | "rating" | "inStock" | "onSale", id?: string | number, valueId?: string): number {
        const f = this.facetsOf(t);
        if (kind === "inStock") return f.inStock;
        if (kind === "onSale") return f.onSale;
        if (kind === "rating") return f.ratings.find((r: { min: number }) => r.min === id)?.count ?? 0;
        if (kind === "brand") return f.brands.find((b: { id: string }) => b.id === id)?.count ?? 0;
        if (kind === "opt") return f.options.find((o: { id: string }) => o.id === id)?.values.find((v: { id: string }) => v.id === valueId)?.count ?? 0;
        const find = (nodes: any[]): number => {
          for (const n of nodes) {
            if (n.id === id) return n.count;
            const inner = find(n.children);
            if (inner >= 0) return inner;
          }
          return -1;
        };
        return Math.max(0, find(f.categories));
      },
      isSel(t: Target, kind: "brand" | "opt" | "rating", id: string | number, valueId?: string): boolean {
        const f = this[t] as ListingFilters;
        if (kind === "brand") return f.brands.includes(id as string);
        if (kind === "rating") return f.minRating === id;
        return (f.options[id as string] ?? []).includes(valueId!);
      },
      /** A value with no matches stays visible but disabled, unless it is picked. */
      dead(t: Target, optionId: string, valueId: string): boolean {
        return this.count(t, "opt", optionId, valueId) === 0 && !this.isSel(t, "opt", optionId, valueId);
      },
      catOpen(t: Target, id: string): boolean {
        const f = this[t] as ListingFilters;
        return f.category ? listingCategoryPathOf(tree, f.category).includes(id) : false;
      },
      brandShown(t: Target, id: string, i: number): boolean {
        return this.brandsAll[t] || i < 6 || this.isSel(t, "brand", id);
      },
      /** Position of a brand in the count order, for CSS order. */
      brandOrder(t: Target, id: string): number {
        return this.facetsOf(t).brands.findIndex((b: { id: string }) => b.id === id);
      },
      get draftCount(): number {
        return cached("draftCount", JSON.stringify(this.draft), () => listingFilter(products, this.draft, { tree }).length);
      },
      get draftFilterCount(): number {
        return listingFilterCount(this.draft);
      },
      openSheet() {
        this.draft = copy(this.filters);
        this.syncPrice("draft");
        this.sheetOpen = true;
      },
      applyDraft() {
        this.filters = copy(this.draft);
        this.sheetOpen = false;
      },
      clearDraft() {
        this.draft = listingClear(this.draft, true);
      },

      // -- paging
      goPage(n: number) {
        this.page = n;
        const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
        (this.$refs.top as HTMLElement | undefined)?.scrollIntoView?.({ block: "start", behavior: reduce ? "auto" : "smooth" });
      },
      loadMore() {
        this.presses += 1;
      },

      // -- wishlist, compare, quick view
      isWish(id: string): boolean {
        return this.wishIds.includes(id);
      },
      onWish(e: CustomEvent) {
        const { productId, wishlisted } = e.detail;
        this.wishIds = wishlisted ? [...this.wishIds.filter((x: string) => x !== productId), productId] : this.wishIds.filter((x: string) => x !== productId);
      },
      isCompared(id: string): boolean {
        return this.compareIds.includes(id);
      },
      get compareProducts(): Product[] {
        return this.compareIds.map((id: string) => byId.get(id)).filter(Boolean) as Product[];
      },
      /** Tray slots: one per place up to the maximum, a product or null. */
      get slots(): (Product | null)[] {
        return Array.from({ length: this.compareMax }, (_, i) => this.compareProducts[i] ?? null);
      },
      get compareCountText(): string {
        return S("compareCount", { n: num(this.compareIds.length), max: num(this.compareMax) });
      },
      get compareNowText(): string {
        return S("compareNow", { n: num(this.compareIds.length) });
      },
      setCompare(ids: string[]) {
        this.compareIds = ids;
        this.$dispatch("nq-compare-change", { ids: [...ids] });
        if (ids.length < 2) this.compareOpen = false;
      },
      toggleCompare(id: string) {
        const r = listingToggleCompare(this.compareIds, id, this.compareMax);
        if (r.rejected) {
          this.notice = S("compareFull", { max: num(this.compareMax) });
          return;
        }
        this.notice = "";
        this.setCompare(r.ids);
      },
      removeCompare(id: string) {
        this.setCompare(this.compareIds.filter((x: string) => x !== id));
      },
      clearCompare() {
        this.setCompare([]);
      },
      compareAdd(id: string) {
        this.$dispatch("nq-compare-add-to-cart", { productId: id, product: byId.get(id) });
      },
      get compareRows() {
        const rows = listingCompareRows(this.compareProducts);
        return this.onlyDiff ? listingCompareDifferences(rows, this.compareProducts.length) : rows;
      },
      rowLabel(row: { kind: string; label?: string }): string {
        return row.label ?? S(({ price: "priceRow", brand: "brandRow", category: "categoryRow", rating: "ratingRow", availability: "availabilityRow", description: "descriptionRow" } as Record<string, string>)[row.kind] ?? "none");
      },
      /** The text of a compare cell that is not a price, rating or availability. */
      cellText(cell: unknown): string {
        return cell === null || cell === "" || cell === undefined ? S("none") : typeof cell === "number" ? num(cell) : String(cell);
      },
      get quickProduct(): Product | null {
        return this.quickId ? (byId.get(this.quickId) ?? null) : null;
      },
      openQuick(id: string) {
        this.quickId = id;
        this.quickOpen = true;
      },
      get hrefPattern() {
        return cfg.hrefPattern ?? null;
      },
    };
  });

  // The category path, for the open state of the tree (listing-model's helper, local so the cached facets stay untouched).
  const listingCategoryPathOf = (tree: ListingCategoryNode[], id: string): string[] => {
    for (const node of tree) {
      if (node.id === id) return [node.id];
      const inner = listingCategoryPathOf(node.children ?? [], id);
      if (inner.length) return [node.id, ...inner];
    }
    return [];
  };

  // ---------------------------------------------------------------- a product card
  Alpine.data("nqStoreCard", (cfg: CardConfig) => {
    const product = cfg.product;
    const exp = cfg.exponent ?? 2;
    const initial: Selection = {};
    for (const o of product.options) if (o.values.length === 1) initial[o.id] = o.values[0]!.id;
    let timer: ReturnType<typeof setTimeout> | undefined;
    return {
      product,
      selection: initial,
      preview: null as string | null,
      picking: false,
      status: "idle" as "idle" | "adding" | "added",
      localWish: Boolean(cfg.wishlisted),
      failed: false,
      host: null as any,

      init(this: any) {
        this.$el.querySelectorAll("[data-ssr]").forEach((el: Element) => el.remove());
        this.host = hostOf(this.$el);
        this.$watch("primarySrc", () => (this.failed = false));
        return () => clearTimeout(timer);
      },

      // -- what is on the card
      get list(): boolean {
        return this.host ? this.host.view === "list" : cfg.layout === "list";
      },
      get hasCompare(): boolean {
        return this.host ? this.host.compareOn && cfg.compare !== false : Boolean(cfg.compare);
      },
      get hasQuick(): boolean {
        return cfg.quickView !== false && Boolean(this.host) ? true : Boolean(cfg.quickView);
      },
      get hasAdd(): boolean {
        return cfg.add !== false;
      },
      get isWish(): boolean {
        return this.host ? this.host.isWish(product.id) : this.localWish;
      },
      get compared(): boolean {
        return this.host ? this.host.isCompared(product.id) : false;
      },
      get link(): string {
        const pattern = this.host?.hrefPattern as string | null | undefined;
        return cfg.href ?? (pattern ? pattern.replace("{id}", encodeURIComponent(product.id)).replace("{slug}", encodeURIComponent(product.slug ?? product.id)) : `#${product.slug ?? product.id}`);
      },
      get variant(): Variant | undefined {
        return commerceFindVariant(product, this.selection);
      },
      get colour() {
        return product.options.find((o) => o.display === "swatch" || o.display === "image");
      },
      get soldOut(): boolean {
        return !listingProductInStock(product);
      },
      get shown(): Variant | undefined {
        return this.variant ?? listingCheapestVariant(product);
      },
      get percent(): number {
        const v = this.variant as Variant | undefined;
        if (!v) return listingBestDiscount(product);
        return v.compareAt && v.compareAt > v.price ? Math.floor(((v.compareAt - v.price) * 100) / v.compareAt) : 0;
      },
      get percentText(): string {
        return S("percentOff", { n: this.percent });
      },
      get otherOptions() {
        return product.options.filter((o) => o !== this.colour && o.values.length > 1);
      },
      get compareModel(): boolean {
        return this.compared;
      },
      set compareModel(on: boolean) {
        if (on !== this.compared) this.toggleCompare();
      },
      swatch(o: { display?: string }): boolean {
        return o.display === "swatch" || o.display === "image";
      },
      /** Values shown for an axis: the first `max`, plus a picked one beyond them. */
      vals(o: { id: string; values: { id: string }[] }, max: number) {
        return o.values.filter((v, i) => i < max || this.selection[o.id] === v.id);
      },
      more(o: { id: string; values: { id: string }[] }, max: number): number {
        return o.values.length - this.vals(o, max).length;
      },
      selectedLabel(o: { id: string; values: { id: string; label: string }[] }): string {
        return o.values.find((v) => v.id === this.selection[o.id])?.label ?? "";
      },
      variantImage(valueId: string | null | undefined): string | undefined {
        const c = this.colour;
        if (!c || !valueId) return undefined;
        return product.variants.find((v) => v.options[c.id] === valueId && v.image)?.image;
      },
      get primarySrc(): string {
        const chosen = this.colour ? this.selection[this.colour.id] : undefined;
        return this.variantImage(this.preview) ?? this.variantImage(chosen) ?? this.variant?.image ?? product.images[0]?.src ?? "";
      },
      get secondarySrc(): string {
        const own = this.variantImage(this.preview) ?? this.variant?.image;
        return !own && !this.preview ? (product.images[1]?.src ?? "") : "";
      },
      get imgOk(): boolean {
        return Boolean(this.primarySrc) && !this.failed;
      },
      get missing() {
        return product.options.find((o) => !this.selection[o.id]);
      },
      get canAdd(): boolean {
        return this.hasAdd && !this.soldOut;
      },
      get priceText(): string {
        return this.shown ? moneyOf(this.shown.price, exp, cfg.currency) : "";
      },
      get compareText(): string {
        const s = this.shown as Variant | undefined;
        return s?.compareAt && s.compareAt > s.price ? moneyOf(s.compareAt, exp, cfg.currency) : "";
      },
      get fromText(): string {
        return !this.variant && listingHasPriceRange(product) ? S("from") : "";
      },
      get wishLabel(): string {
        return S(this.isWish ? "wishlistRemove" : "wishlistAdd", { name: product.name });
      },
      get addLabel(): string {
        if (this.status === "added") return S("added");
        if (this.missing && !this.list) return S("quickAdd");
        if (this.variant && !commerceInStock(this.variant)) return S("soldOut");
        return S("addToCart");
      },
      get liveText(): string {
        return this.status === "added" ? S("addedLive", { name: product.name }) : "";
      },
      get missingText(): string {
        return this.missing ? S("chooseOption", { option: (this.missing as any).name }) : "";
      },
      get addDisabled(): boolean {
        return this.variant ? !commerceInStock(this.variant) : false;
      },
      s(key: string, vars?: Record<string, string | number>) {
        return S(key, vars);
      },

      // -- option axes (the shared picker partial binds these names)
      avail(optionId: string, valueId: string): "available" | "out" | "none" {
        return (commerceValueAvailability(product, this.selection, optionId) as Record<string, "available" | "out" | "none">)[valueId] ?? "none";
      },
      checked(optionId: string, valueId: string): boolean {
        return this.selection[optionId] === valueId;
      },
      tabindexFor(optionId: string, valueId: string): number {
        if (this.selection[optionId]) return this.selection[optionId] === valueId ? 0 : -1;
        const o = product.options.find((x) => x.id === optionId);
        return o?.values.find((v) => this.avail(optionId, v.id) !== "none")?.id === valueId ? 0 : -1;
      },
      spoken(label: string, optionId: string, valueId: string): string {
        const a = this.avail(optionId, valueId);
        return a === "out" ? `${label}, ${S("optionSoldOut")}` : a === "none" ? `${label}, ${S("optionUnavailable")}` : label;
      },
      pick(optionId: string, valueId: string) {
        this.selection = { ...this.selection, [optionId]: valueId };
        if (!this.picking) return;
        if (product.options.every((o) => this.selection[o.id])) {
          const v = commerceFindVariant(product, this.selection);
          this.picking = false;
          if (v) void this.add(v);
        }
      },
      previewValue(valueId: string | null) {
        this.preview = valueId;
      },

      // -- actions
      toggleWish() {
        const next = !this.isWish;
        this.localWish = next;
        this.$dispatch("nq-wishlist-change", { productId: product.id, wishlisted: next });
      },
      toggleCompare() {
        if (this.host) this.host.toggleCompare(product.id);
      },
      quickView() {
        if (this.host) this.host.openQuick(product.id);
        this.$dispatch("nq-quick-view", { productId: product.id });
      },
      quickAdd() {
        if (!this.canAdd) return;
        if (this.missing) {
          this.picking = true;
          return;
        }
        if (this.variant) void this.add(this.variant);
      },
      async add(this: any, v: Variant) {
        if (!this.hasAdd || !commerceInStock(v)) return;
        this.status = "adding";
        try {
          await dispatchWait(this.$el, "nq-add-to-cart", { productId: product.id, variantId: v.id, quantity: 1, product, variant: v });
          this.status = "added";
          clearTimeout(timer);
          timer = setTimeout(() => (this.status = "idle"), 1800);
        } catch {
          this.status = "idle";
        }
      },
      navigate(this: any) {
        const ok = this.$el.dispatchEvent(new CustomEvent("nq-navigate", { bubbles: true, cancelable: true, detail: { productId: product.id, href: this.link } }));
        if (ok && !this.link.startsWith("#")) window.location.assign(this.link);
      },
      /** Roving arrows inside a radiogroup, following the reading direction. */
      keys(this: any, e: KeyboardEvent) {
        const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
        if (!keys.includes(e.key)) return;
        const group = e.currentTarget as HTMLElement;
        const radios = [...group.querySelectorAll<HTMLButtonElement>('[role="radio"]:not([disabled])')];
        if (!radios.length) return;
        e.preventDefault();
        const rtl = getComputedStyle(group).direction === "rtl";
        const at = radios.findIndex((r) => r === document.activeElement);
        const forward = e.key === "ArrowDown" || e.key === (rtl ? "ArrowLeft" : "ArrowRight");
        const next = e.key === "Home" ? 0 : e.key === "End" ? radios.length - 1 : (at + (forward ? 1 : -1) + radios.length) % radios.length;
        radios[next]?.focus();
        radios[next]?.click();
      },
    };
  });

  // ---------------------------------------------------------------- the quick view dialog (inside a listing)
  Alpine.data("nqStoreQuickView", (cfg: { currency?: string | null; exponent?: number; lowStockAt?: number; closeOnAdd?: boolean; href?: string | null } = {}) => {
    const exp = cfg.exponent ?? 2;
    const firstAvailable = (p: Product): Selection => {
      const start = p.variants.find((v) => commerceInStock(v)) ?? p.variants[0];
      return start ? { ...start.options } : {};
    };
    return {
      host: null as any,
      selection: {} as Selection,
      quantity: 1,
      image: 0,
      busy: false,
      live: "",
      preview: null as string | null,

      init(this: any) {
        this.host = hostOf(this.$el);
        const reset = () => {
          const p = this.product as Product | null;
          this.selection = p ? firstAvailable(p) : {};
          this.quantity = 1;
          this.image = 0;
          this.live = "";
        };
        this.$watch("host.quickId", reset);
        reset();
      },

      get product(): Product | null {
        return this.host?.quickProduct ?? null;
      },
      get variant(): Variant | undefined {
        return this.product ? commerceFindVariant(this.product, this.selection) : undefined;
      },
      get shown(): Variant | undefined {
        return this.variant ?? (this.product ? listingCheapestVariant(this.product) : undefined);
      },
      get inStock(): boolean {
        return commerceInStock(this.variant);
      },
      get max(): number {
        const v = this.variant as Variant | undefined;
        return v && v.stock !== undefined && !v.allowBackorder ? Math.max(v.stock, 1) : 99;
      },
      get qty(): number {
        return commerceClampQuantity(this.quantity, this.max);
      },
      get missing() {
        return this.product?.options.find((o: any) => !this.selection[o.id]);
      },
      get gallery() {
        return (this.product?.images ?? []) as { src: string; alt?: string }[];
      },
      get currentSrc(): string {
        const vi = (this.variant as Variant | undefined)?.image;
        return (vi && this.image === 0 ? vi : (this.gallery[this.image] ?? this.gallery[0])?.src) ?? "";
      },
      get priceText(): string {
        return this.shown ? moneyOf(this.shown.price, exp, cfg.currency) : "";
      },
      get compareText(): string {
        const s = this.shown as Variant | undefined;
        return s?.compareAt && s.compareAt > s.price ? moneyOf(s.compareAt, exp, cfg.currency) : "";
      },
      get fromText(): string {
        return this.product && !this.variant && listingHasPriceRange(this.product) ? S("from") : "";
      },
      get stockText(): string {
        const v = this.variant as Variant | undefined;
        if (!v) return this.missing ? S("selectOption", { option: (this.missing as any).name }) : S("unavailableCombo");
        if (!this.inStock) return S("outOfStock");
        if (v.stock !== undefined && !v.allowBackorder && v.stock <= (cfg.lowStockAt ?? 5)) return S("lowStock", { n: num(v.stock) });
        return S("inStock");
      },
      get stockTone(): string {
        return !this.variant ? "neutral" : this.inStock ? "success" : "danger";
      },
      get ratingText(): string {
        const r = this.product?.rating;
        return r ? `${new Intl.NumberFormat(`${nq().locale}-u-nu-latn`, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(r.average)} · ${num(r.count)} ${S("reviews")}` : "";
      },
      get detailsHref(): string {
        const p = this.product as Product | null;
        const pattern = this.host?.hrefPattern as string | null | undefined;
        return cfg.href ?? (p && pattern ? pattern.replace("{id}", encodeURIComponent(p.id)).replace("{slug}", encodeURIComponent(p.slug ?? p.id)) : "");
      },
      qtyText(): string {
        return num(this.qty);
      },
      s(key: string, vars?: Record<string, string | number>) {
        return S(key, vars);
      },

      // -- the option picker's names
      avail(optionId: string, valueId: string): "available" | "out" | "none" {
        return this.product ? ((commerceValueAvailability(this.product, this.selection, optionId) as Record<string, "available" | "out" | "none">)[valueId] ?? "none") : "none";
      },
      checked(optionId: string, valueId: string): boolean {
        return this.selection[optionId] === valueId;
      },
      tabindexFor(optionId: string, valueId: string): number {
        if (this.selection[optionId]) return this.selection[optionId] === valueId ? 0 : -1;
        const o = this.product?.options.find((x: any) => x.id === optionId);
        return o?.values.find((v: any) => this.avail(optionId, v.id) !== "none")?.id === valueId ? 0 : -1;
      },
      spoken(label: string, optionId: string, valueId: string): string {
        const a = this.avail(optionId, valueId);
        return a === "out" ? `${label}, ${S("optionSoldOut")}` : a === "none" ? `${label}, ${S("optionUnavailable")}` : label;
      },
      selectedLabel(o: { id: string; values: { id: string; label: string }[] }): string {
        return o.values.find((v) => v.id === this.selection[o.id])?.label ?? "";
      },
      swatch(o: { display?: string }): boolean {
        return o.display === "swatch" || o.display === "image";
      },
      vals(o: { id: string; values: { id: string }[] }, max: number) {
        return o.values.filter((v, i) => i < max || this.selection[o.id] === v.id);
      },
      more(o: { id: string; values: { id: string }[] }, max: number): number {
        return o.values.length - this.vals(o, max).length;
      },
      pick(optionId: string, valueId: string) {
        this.selection = { ...this.selection, [optionId]: valueId };
        this.image = 0;
        this.quantity = 1;
      },
      previewValue() {},
      keys(this: any, e: KeyboardEvent) {
        const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
        if (!keys.includes(e.key)) return;
        const group = e.currentTarget as HTMLElement;
        const radios = [...group.querySelectorAll<HTMLButtonElement>('[role="radio"]:not([disabled])')];
        if (!radios.length) return;
        e.preventDefault();
        const rtl = getComputedStyle(group).direction === "rtl";
        const at = radios.findIndex((r) => r === document.activeElement);
        const forward = e.key === "ArrowDown" || e.key === (rtl ? "ArrowLeft" : "ArrowRight");
        const next = e.key === "Home" ? 0 : e.key === "End" ? radios.length - 1 : (at + (forward ? 1 : -1) + radios.length) % radios.length;
        radios[next]?.focus();
        radios[next]?.click();
      },
      step(d: number) {
        this.quantity = commerceClampQuantity(this.qty + d, this.max);
      },
      async add(this: any) {
        const p = this.product as Product | null;
        const v = this.variant as Variant | undefined;
        if (!p || !v || !this.inStock) return;
        this.busy = true;
        try {
          await dispatchWait(this.$el, "nq-add-to-cart", { productId: p.id, variantId: v.id, quantity: this.qty, product: p, variant: v });
          this.live = S("addedLive", { name: p.name });
          if (cfg.closeOnAdd !== false) this.host.quickOpen = false;
        } catch {
          /* the handler rejected: stay open */
        } finally {
          this.busy = false;
        }
      },
    };
  });
};
