"use client";

import { ChevronDown, LayoutGrid, List, SlidersHorizontal, Star, X } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import type { CommerceProduct, CommerceVariant } from "../../lib/commerce";
import { Badge } from "../badge";
import { Button } from "../button";
import { Checkbox } from "../checkbox";
import { Icon } from "../icon";
import { useFormatNumber } from "../numeric";
import { LoadMore, Pagination } from "../pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "../sheet";
import { Slider } from "../slider";
import { EmptyState, ErrorState, Skeleton } from "../states";
import { Toggle, ToggleGroup } from "../toggle-group";
import {
  EMPTY_LISTING_FILTERS,
  LISTING_SORTS,
  type ListingCategoryFacet,
  type ListingCategoryNode,
  type ListingChip,
  type ListingFacets,
  type ListingFilters,
  type ListingLabelIndex,
  type ListingSort,
  listingActiveChips,
  listingClear,
  listingFacets,
  listingFilter,
  listingFilterCount,
  listingLabelIndex,
  listingPage,
  listingRelaxations,
  listingRemoveChip,
  listingSort,
  listingToMajor,
  listingToMinor,
  listingToggleCompare,
  listingToggleOption,
  listingToggleValue,
  listingVisibleCount,
} from "./listing-model";
import { fillTemplate, type ListingLabels, useListingStrings } from "./listing-strings";
import { StoreCompareDialog, StoreCompareTray } from "./store-compare";
import { StoreProductCard, storeCurrencyDigits } from "./store-product-card";
import { StoreQuickView } from "./store-quick-view";

/* ------------------------------------------------------------------ small helpers */

function useMoney(currency: string) {
  const { locale } = useListingStrings();
  return useMemo(() => {
    const digits = storeCurrencyDigits(currency);
    const nf = new Intl.NumberFormat(`${locale}-u-nu-latn`, { style: "currency", currency, maximumFractionDigits: 0 });
    return (minor: number) => nf.format(listingToMajor(minor, digits));
  }, [locale, currency]);
}

function useControlled<T>(value: T | undefined, initial: T, onChange?: (v: T) => void): [T, (v: T) => void] {
  const [inner, setInner] = useState(initial);
  const current = value !== undefined ? value : inner;
  return [
    current,
    (v: T) => {
      if (value === undefined) setInner(v);
      onChange?.(v);
    },
  ];
}

/** Human label of one applied filter, for chips. */
export function storeChipLabel(chip: ListingChip, index: ListingLabelIndex, t: ReturnType<typeof useListingStrings>["t"], money: (minor: number) => string, fmt: (n: number) => string): string {
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
      return `${money(chip.value[0])} – ${money(chip.value[1])}`;
    case "rating":
      return fillTemplate(t.andUp, { n: fmt(chip.value) });
    case "stock":
      return t.inStock;
    case "sale":
      return t.onSale;
  }
}

/* ------------------------------------------------------------------ facet sidebar */

function FacetGroup({ title, children, defaultOpen = true }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-b border-border py-3 last:border-b-0" data-slot="store-facet-group">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="flex w-full items-center justify-between gap-2 rounded-sm py-1 text-start text-label text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus"
        >
          {title}
          <ChevronDown aria-hidden className={cn("size-4 text-muted-foreground transition-transform motion-reduce:transition-none", open && "rotate-180")} />
        </button>
      </h3>
      {open ? <div className="pt-2">{children}</div> : null}
    </section>
  );
}

function CategoryTree({ nodes, onSelect, all, depth = 0 }: { nodes: ListingCategoryFacet[]; onSelect: (id: string | null) => void; all: string; depth?: number }) {
  const fmt = useFormatNumber();
  return (
    <ul className={cn("flex flex-col gap-0.5", depth > 0 && "ms-3 border-s border-border ps-2")}>
      {nodes.map((n) => (
        <li key={n.id}>
          <button
            type="button"
            aria-current={n.selected ? "true" : undefined}
            onClick={() => onSelect(n.selected ? null : n.id)}
            className={cn(
              "flex w-full items-center justify-between gap-2 rounded-control px-2 py-1 text-start text-body-sm outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus",
              n.selected ? "bg-nq-selected font-medium text-foreground" : "text-muted-foreground",
            )}
          >
            <span className="min-w-0 truncate">{n.label}</span>
            <bdi className="tabular-nums text-caption">{fmt(n.count)}</bdi>
          </button>
          {n.children.length && n.open ? <CategoryTree nodes={n.children} onSelect={onSelect} all={all} depth={depth + 1} /> : null}
        </li>
      ))}
    </ul>
  );
}

export interface StoreFacetSidebarProps {
  /** The catalogue the facets count over (all products, before filtering). */
  products: readonly CommerceProduct[];
  filters: ListingFilters;
  onFiltersChange: (filters: ListingFilters) => void;
  categoryTree?: readonly ListingCategoryNode[];
  /** ISO 4217 code for the price slider. */
  currency: string;
  /** Options to offer, by option id. Default: every option in the catalogue. */
  optionIds?: readonly string[];
  labels?: ListingLabels;
  className?: string;
}

/**
 * The filter column: category tree, price slider, brand, options (colour swatches, sizes), rating, availability and
 * on sale. Counts are disjunctive: a group counts what each value would give if picked, ignoring that group's own picks.
 */
export function StoreFacetSidebar({ products, filters, onFiltersChange, categoryTree = [], currency, optionIds, labels, className }: StoreFacetSidebarProps) {
  const { t } = useListingStrings(labels);
  const fmt = useFormatNumber();
  const index = useMemo(() => listingLabelIndex(products, categoryTree), [products, categoryTree]);
  const facets = useMemo(() => listingFacets(products, filters, categoryTree, index), [products, filters, categoryTree, index]);
  const digits = useMemo(() => storeCurrencyDigits(currency), [currency]);
  const lo = Math.floor(listingToMajor(facets.price.min, digits));
  const hi = Math.ceil(listingToMajor(facets.price.max, digits));
  const applied: [number, number] = filters.price ? [listingToMajor(filters.price[0], digits), listingToMajor(filters.price[1], digits)] : [lo, hi];
  const [draft, setDraft] = useState<number[]>(applied);
  useEffect(() => setDraft(applied), [applied[0], applied[1]]);
  const set = (patch: Partial<ListingFilters>) => onFiltersChange({ ...filters, ...patch });
  const options = facets.options.filter((o) => !optionIds || optionIds.includes(o.id));
  const clearedPrice = (v: number[]) => (v[0]! <= lo && v[1]! >= hi ? null : ([listingToMinor(v[0]!, digits), listingToMinor(v[1]!, digits)] as [number, number]));

  return (
    <div data-slot="store-facet-sidebar" role="group" aria-label={t.facets} className={cn("flex flex-col", className)}>
      {facets.categories.length ? (
        <FacetGroup title={t.categories}>
          <button
            type="button"
            aria-current={filters.category === null ? "true" : undefined}
            onClick={() => set({ category: null })}
            className={cn("mb-0.5 w-full rounded-control px-2 py-1 text-start text-body-sm outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus", filters.category === null ? "bg-nq-selected font-medium" : "text-muted-foreground")}
          >
            {t.allCategories}
          </button>
          <CategoryTree nodes={facets.categories} onSelect={(id) => set({ category: id })} all={t.allCategories} />
        </FacetGroup>
      ) : null}

      {hi > lo ? (
        <FacetGroup title={t.price}>
          <div className="px-2">
          <Slider
            aria-label={t.price}
            min={lo}
            max={hi}
            step={Math.max(1, Math.round((hi - lo) / 50))}
            value={draft}
            onValueChange={(v) => setDraft(v as number[])}
            onValueCommitted={(v) => set({ price: clearedPrice(v as number[]) })}
            thumbLabels={[t.priceMin, t.priceMax]}
            format={{ style: "currency", currency, maximumFractionDigits: 0 }}
            showValue
          />
          </div>
        </FacetGroup>
      ) : null}

      {facets.brands.length > 1 ? (
        <FacetGroup title={t.brand}>
          <CheckList values={facets.brands} onToggle={(id) => set({ brands: listingToggleValue(filters.brands, id) })} />
        </FacetGroup>
      ) : null}

      {options.map((o) => (
        <FacetGroup key={o.id} title={o.name}>
          {o.display === "swatch" || o.display === "image" ? (
            <div role="group" aria-label={o.name} className="flex flex-wrap gap-2">
              {o.values.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  aria-pressed={v.selected}
                  aria-label={`${v.label} (${fmt(v.count)})`}
                  title={`${v.label} (${fmt(v.count)})`}
                  disabled={v.count === 0 && !v.selected}
                  onClick={() => onFiltersChange(listingToggleOption(filters, o.id, v.id))}
                  style={v.color ? { backgroundColor: v.color } : undefined}
                  className={cn(
                    "size-7 rounded-full border border-nq-line-strong outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:opacity-35",
                    v.selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                  )}
                />
              ))}
            </div>
          ) : (
            <div role="group" aria-label={o.name} className="flex flex-wrap gap-1.5">
              {o.values.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  aria-pressed={v.selected}
                  disabled={v.count === 0 && !v.selected}
                  onClick={() => onFiltersChange(listingToggleOption(filters, o.id, v.id))}
                  className={cn(
                    "h-8 min-w-10 rounded-control border px-2.5 text-label outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:opacity-40",
                    v.selected ? "border-primary bg-nq-selected text-foreground" : "border-border bg-card text-foreground hover:bg-nq-hover",
                  )}
                >
                  <bdi>{v.label}</bdi>
                </button>
              ))}
            </div>
          )}
        </FacetGroup>
      ))}

      <FacetGroup title={t.rating}>
        <div role="radiogroup" aria-label={t.rating} className="flex flex-col gap-0.5">
          {facets.ratings.map((r) => (
            <button
              key={r.min}
              type="button"
              role="radio"
              aria-checked={r.selected}
              onClick={() => set({ minRating: r.selected ? null : r.min })}
              className={cn("flex items-center justify-between gap-2 rounded-control px-2 py-1 text-start text-body-sm outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus", r.selected && "bg-nq-selected font-medium")}
            >
              <span className="inline-flex items-center gap-1.5">
                <Star aria-hidden className="size-3.5 fill-nq-accent text-nq-accent" />
                {fillTemplate(t.andUp, { n: fmt(r.min) })}
              </span>
              <bdi className="tabular-nums text-caption text-muted-foreground">{fmt(r.count)}</bdi>
            </button>
          ))}
        </div>
      </FacetGroup>

      <FacetGroup title={t.availability}>
        <ul className="flex flex-col gap-1.5">
          <li>
            <label className="flex cursor-pointer items-center gap-2 text-body-sm">
              <Checkbox checked={filters.inStock} onCheckedChange={(v) => set({ inStock: v === true })} />
              <span className="flex-1">{t.inStock}</span>
              <bdi className="tabular-nums text-caption text-muted-foreground">{fmt(facets.inStock)}</bdi>
            </label>
          </li>
          <li>
            <label className="flex cursor-pointer items-center gap-2 text-body-sm">
              <Checkbox checked={filters.onSale} onCheckedChange={(v) => set({ onSale: v === true })} />
              <span className="flex-1">{t.onSale}</span>
              <bdi className="tabular-nums text-caption text-muted-foreground">{fmt(facets.onSale)}</bdi>
            </label>
          </li>
        </ul>
      </FacetGroup>
    </div>
  );
}

function CheckList({ values, onToggle, limit = 6 }: { values: ListingFacets["brands"]; onToggle: (id: string) => void; limit?: number }) {
  const { t } = useListingStrings();
  const fmt = useFormatNumber();
  const [all, setAll] = useState(false);
  const shown = all ? values : values.filter((v, i) => i < limit || v.selected);
  return (
    <>
      <ul className="flex flex-col gap-1.5">
        {shown.map((v) => (
          <li key={v.id}>
            <label className={cn("flex cursor-pointer items-center gap-2 text-body-sm", v.count === 0 && !v.selected && "opacity-45")}>
              <Checkbox checked={v.selected} onCheckedChange={() => onToggle(v.id)} />
              <span className="min-w-0 flex-1 truncate">{v.label}</span>
              <bdi className="tabular-nums text-caption text-muted-foreground">{fmt(v.count)}</bdi>
            </label>
          </li>
        ))}
      </ul>
      {values.length > limit ? (
        <Button variant="link" size="sm" className="mt-1" onClick={() => setAll(!all)}>
          {all ? t.showLess : t.showMore}
        </Button>
      ) : null}
    </>
  );
}

/* ------------------------------------------------------------------ chips */

export interface StoreActiveChipsProps {
  filters: ListingFilters;
  onFiltersChange: (filters: ListingFilters) => void;
  index: ListingLabelIndex;
  currency: string;
  /** Show the query chip. Default false (the search page shows the query in its heading). */
  includeQuery?: boolean;
  labels?: ListingLabels;
  className?: string;
}

/** One removable chip per applied filter, and "Clear all". */
export function StoreActiveChips({ filters, onFiltersChange, index, currency, includeQuery = false, labels, className }: StoreActiveChipsProps) {
  const { t } = useListingStrings(labels);
  const fmt = useFormatNumber();
  const money = useMoney(currency);
  const chips = listingActiveChips(filters).filter((c) => includeQuery || c.kind !== "query");
  if (!chips.length) return null;
  return (
    <div data-slot="store-active-chips" role="group" aria-label={t.activeFilters} className={cn("flex flex-wrap items-center gap-2", className)}>
      {chips.map((chip) => {
        const label = storeChipLabel(chip, index, t, money, fmt);
        return (
          <button
            key={chip.id}
            type="button"
            aria-label={fillTemplate(t.removeFilter, { label })}
            onClick={() => onFiltersChange(listingRemoveChip(filters, chip))}
            className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-card ps-3 pe-2 text-body-sm outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus"
          >
            <bdi>{label}</bdi>
            <X aria-hidden className="size-3.5 text-muted-foreground" />
          </button>
        );
      })}
      <Button variant="link" size="sm" onClick={() => onFiltersChange(listingClear(filters, !includeQuery))}>
        {t.clearAll}
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ mobile filter sheet */

export interface StoreFilterSheetProps extends Omit<StoreFacetSidebarProps, "className" | "onFiltersChange"> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the chosen filters when the shopper applies. */
  onApply: (filters: ListingFilters) => void;
}

/** The facets in a bottom sheet. Changes are held in a draft and only apply with the button, which shows the live result count. */
export function StoreFilterSheet({ open, onOpenChange, onApply, products, filters, categoryTree = [], currency, optionIds, labels }: StoreFilterSheetProps) {
  const { t } = useListingStrings(labels);
  const fmt = useFormatNumber();
  const [draft, setDraft] = useState(filters);
  useEffect(() => {
    if (open) setDraft(filters);
  }, [open]);
  const count = useMemo(() => listingFilter(products, draft, { tree: categoryTree }).length, [products, draft, categoryTree]);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" closeLabel={t.close} className="max-h-[90dvh]">
        <SheetHeader>
          <SheetTitle>{t.filters}</SheetTitle>
          <SheetDescription className="sr-only">{t.facets}</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <StoreFacetSidebar products={products} filters={draft} onFiltersChange={setDraft} categoryTree={categoryTree} currency={currency} {...(optionIds ? { optionIds } : {})} labels={labels ?? {}} />
        </SheetBody>
        <SheetFooter className="flex-row gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setDraft(listingClear(draft, true))}>
            {t.clearAll}
          </Button>
          <Button
            variant="primary"
            className="flex-[2]"
            disabled={count === 0}
            onClick={() => {
              onApply(draft);
              onOpenChange(false);
            }}
          >
            {count === 0 ? t.applyNone : fillTemplate(t.apply, { n: fmt(count) })}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ toolbar */

export type StoreListingView = "grid" | "list";
export type StoreListingDensity = "comfortable" | "compact";

export interface StoreListingToolbarProps {
  total: number;
  sort: ListingSort;
  onSortChange: (sort: ListingSort) => void;
  /** Sorts on offer. Default all of them. */
  sorts?: readonly ListingSort[];
  view: StoreListingView;
  onViewChange: (view: StoreListingView) => void;
  density: StoreListingDensity;
  onDensityChange: (density: StoreListingDensity) => void;
  /** Filter count for the mobile button; the button only shows when `onOpenFilters` is given. */
  filterCount?: number;
  onOpenFilters?: () => void;
  labels?: ListingLabels;
  className?: string;
}

/** Result count, sort, grid/list toggle, density and the mobile Filters button. */
export function StoreListingToolbar({ total, sort, onSortChange, sorts = LISTING_SORTS, view, onViewChange, density, onDensityChange, filterCount = 0, onOpenFilters, labels, className }: StoreListingToolbarProps) {
  const { t } = useListingStrings(labels);
  const fmt = useFormatNumber();
  const items = sorts.map((s) => ({ value: s, label: t.sort[s] }));
  return (
    <div data-slot="store-listing-toolbar" className={cn("flex flex-wrap items-center gap-x-3 gap-y-2", className)}>
      {onOpenFilters ? (
        <Button variant="secondary" size="sm" className="lg:hidden" onClick={onOpenFilters}>
          <Icon icon={SlidersHorizontal} />
          {filterCount ? fillTemplate(t.filtersCount, { n: fmt(filterCount) }) : t.filters}
        </Button>
      ) : null}
      <p role="status" aria-live="polite" className="me-auto text-body-sm text-muted-foreground">
        {total === 1 ? t.resultsOne : fillTemplate(t.results, { n: fmt(total) })}
      </p>
      <label className="flex items-center gap-2 text-body-sm text-muted-foreground">
        <span className="hidden sm:inline">{t.sortBy}</span>
        <Select items={items} value={sort} onValueChange={(v) => v && onSortChange(v as ListingSort)}>
          <SelectTrigger aria-label={t.sortBy} className="h-8 w-auto min-w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {items.map((i) => (
              <SelectItem key={i.value} value={i.value}>
                {i.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <ToggleGroup aria-label={t.view} value={[view]} onValueChange={(v) => v[0] && onViewChange(v[0] as StoreListingView)}>
        <Toggle value="grid" aria-label={t.grid}>
          <Icon icon={LayoutGrid} />
        </Toggle>
        <Toggle value="list" aria-label={t.list}>
          <Icon icon={List} />
        </Toggle>
      </ToggleGroup>
      {view === "grid" ? (
        <ToggleGroup aria-label={t.density} className="hidden sm:flex" value={[density]} onValueChange={(v) => v[0] && onDensityChange(v[0] as StoreListingDensity)}>
          <Toggle value="comfortable">{t.comfortable}</Toggle>
          <Toggle value="compact">{t.compact}</Toggle>
        </ToggleGroup>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ listing */

export interface StoreListingProps {
  /** The whole catalogue for this page; filtering, sorting, facets and paging happen here. */
  products: readonly CommerceProduct[];
  /** ISO 4217 code; prices are integer minor units. */
  currency: string;
  categoryTree?: readonly ListingCategoryNode[];
  /** Controlled filters. Uncontrolled starts from `defaultFilters`. */
  filters?: ListingFilters;
  defaultFilters?: Partial<ListingFilters>;
  onFiltersChange?: (filters: ListingFilters) => void;
  sort?: ListingSort;
  defaultSort?: ListingSort;
  onSortChange?: (sort: ListingSort) => void;
  sorts?: readonly ListingSort[];
  view?: StoreListingView;
  defaultView?: StoreListingView;
  density?: StoreListingDensity;
  /** Products per page, or per "load more" press. Default 12. */
  pageSize?: number;
  /** "pages" (default) shows numbered pagination; "load-more" appends. */
  paging?: "pages" | "load-more";
  /** Heading above the toolbar. */
  title?: ReactNode;
  /** Shown above the results (breadcrumb, banner, search summary). */
  header?: ReactNode;
  /** Show the query chip in the chip row. Default false. */
  showQueryChip?: boolean;
  loading?: boolean;
  /** Shows the error state with a retry button. */
  error?: boolean;
  onRetry?: () => void;
  /** Searches suggested when nothing matches. */
  popularSearches?: readonly string[];
  onSearch?: (query: string) => void;
  getHref?: (product: CommerceProduct) => string;
  onNavigate?: (product: CommerceProduct) => void;
  /** Ids on the wishlist. Without it, hearts keep their own state. */
  wishlistIds?: readonly string[];
  onToggleWishlist?: (product: CommerceProduct, next: boolean) => void;
  onAddToCart?: (product: CommerceProduct, variant: CommerceVariant, quantity: number) => void | Promise<void>;
  /** Turns the compare boxes, tray and table on. Default true. */
  compare?: boolean;
  /** Most products to compare. Default 4. */
  compareMax?: number;
  compareIds?: readonly string[];
  onCompareChange?: (ids: string[]) => void;
  /** Adds the compare table's "Add to cart" (the first in-stock variant). */
  onCompareAddToCart?: (product: CommerceProduct) => void;
  labels?: ListingLabels;
  className?: string;
}

const GRID = {
  comfortable: "grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 md:gap-x-4",
  compact: "grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-3 xl:grid-cols-4",
} as const;

/**
 * A product listing: facet sidebar with counts, active chips, sort, grid/list and density, result count, pages or
 * load more, empty results with ways to relax the filters, a filter sheet on phones, quick view and compare. All from
 * `CommerceProduct[]`; the page owns nothing else. Works uncontrolled, or controlled through `filters`/`sort`.
 */
export function StoreListing({
  products,
  currency,
  categoryTree = [],
  filters: filtersProp,
  defaultFilters,
  onFiltersChange,
  sort: sortProp,
  defaultSort = "relevance",
  onSortChange,
  sorts,
  view: viewProp,
  defaultView = "grid",
  density: densityProp,
  pageSize = 12,
  paging = "pages",
  title,
  header,
  showQueryChip = false,
  loading = false,
  error = false,
  onRetry,
  popularSearches = [],
  onSearch,
  getHref,
  onNavigate,
  wishlistIds,
  onToggleWishlist,
  onAddToCart,
  compare = true,
  compareMax = 4,
  compareIds: compareProp,
  onCompareChange,
  onCompareAddToCart,
  labels,
  className,
}: StoreListingProps) {
  const { t, locale } = useListingStrings(labels);
  const fmt = useFormatNumber();
  const money = useMoney(currency);
  const [filters, setFilters] = useControlled<ListingFilters>(filtersProp, { ...EMPTY_LISTING_FILTERS, ...defaultFilters }, onFiltersChange);
  const [sort, setSort] = useControlled<ListingSort>(sortProp, defaultSort, onSortChange);
  const [view, setView] = useControlled<StoreListingView>(viewProp, defaultView);
  const [density, setDensity] = useControlled<StoreListingDensity>(densityProp, "comfortable");
  const [page, setPage] = useState(1);
  const [presses, setPresses] = useState(0);
  const [sheet, setSheet] = useState(false);
  const [quick, setQuick] = useState<CommerceProduct | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [localCompare, setLocalCompare] = useState<string[]>([]);
  const [localWish, setLocalWish] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const top = useRef<HTMLDivElement>(null);

  const compareIds = compareProp ?? localCompare;
  const ctx = useMemo(() => ({ tree: categoryTree }), [categoryTree]);
  const index = useMemo(() => listingLabelIndex(products, categoryTree), [products, categoryTree]);
  const matches = useMemo(() => listingSort(listingFilter(products, filters, ctx), sort, filters.query, locale), [products, filters, ctx, sort, locale]);
  const total = matches.length;
  const pg = listingPage(total, page, pageSize);
  const visible = paging === "pages" ? matches.slice(pg.start, pg.end) : matches.slice(0, listingVisibleCount(total, pageSize, presses));
  const count = listingFilterCount(filters);
  const relax = useMemo(() => (total === 0 ? listingRelaxations(products, filters, categoryTree).slice(0, 4) : []), [total, products, filters, categoryTree]);
  const comparedProducts = compareIds.map((id) => products.find((p) => p.id === id)).filter((p): p is CommerceProduct => Boolean(p));

  useEffect(() => {
    setPage(1);
    setPresses(0);
  }, [filters, sort, pageSize]);

  const changeFilters = (f: ListingFilters) => setFilters(f);
  const toggleCompare = (p: CommerceProduct) => {
    const r = listingToggleCompare(compareIds, p.id, compareMax);
    if (r.rejected) {
      setNotice(fillTemplate(t.compareFull, { max: fmt(compareMax) }));
      return;
    }
    setNotice("");
    setLocalCompare(r.ids);
    onCompareChange?.(r.ids);
  };
  const setCompare = (ids: string[]) => {
    setLocalCompare(ids);
    onCompareChange?.(ids);
  };
  const wish = wishlistIds ?? localWish;

  const sidebar = (
    <StoreFacetSidebar products={products} filters={filters} onFiltersChange={changeFilters} categoryTree={categoryTree} currency={currency} labels={labels ?? {}} />
  );

  const cards = (
    <ul
      data-slot="store-listing-grid"
      data-view={view}
      className={cn(view === "grid" ? cn("grid", GRID[density]) : "flex flex-col gap-4 sm:gap-6")}
    >
      {visible.map((p, i) => (
        <li key={p.id} className={cn("min-w-0", view === "list" && "border-b border-border pb-4 last:border-b-0 sm:pb-6")}>
          <StoreProductCard
            product={p}
            currency={currency}
            layout={view}
            priority={i < 4}
            {...(getHref ? { href: getHref(p) } : {})}
            {...(onNavigate ? { onNavigate } : {})}
            wishlisted={wish.includes(p.id)}
            onToggleWishlist={(prod, next) => {
              setLocalWish((w) => (next ? [...w, prod.id] : w.filter((x) => x !== prod.id)));
              onToggleWishlist?.(prod, next);
            }}
            {...(compare ? { compared: compareIds.includes(p.id), onToggleCompare: () => toggleCompare(p) } : {})}
            onQuickView={(prod) => {
              setQuick(prod);
              setQuickOpen(true);
            }}
            {...(onAddToCart ? { onAddToCart } : {})}
            labels={labels ?? {}}
          />
        </li>
      ))}
    </ul>
  );

  let body: ReactNode;
  if (error) {
    body = <ErrorState title={t.errorTitle} description={t.errorHint} actions={onRetry ? <Button variant="primary" onClick={onRetry}>{t.retry}</Button> : undefined} />;
  } else if (loading) {
    body = (
      <div role="status" aria-label={t.loading} className={cn("grid", GRID[density])}>
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="aspect-[4/5] w-full rounded-card" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ))}
      </div>
    );
  } else if (total === 0) {
    body = (
      <EmptyState
        title={filters.query ? fillTemplate(t.noResultsFor, { query: filters.query }) : t.noResults}
        description={t.noResultsHint}
        actions={
          <Button variant="primary" onClick={() => changeFilters(listingClear(filters, false))}>
            {t.resetFilters}
          </Button>
        }
      >
        {relax.length ? (
          <div className="flex flex-col items-center gap-2">
            <p className="text-caption text-muted-foreground">{t.tryRemoving}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {relax.map((r) => (
                <button
                  key={r.chip.id}
                  type="button"
                  onClick={() => changeFilters(listingRemoveChip(filters, r.chip))}
                  className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-body-sm outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus"
                >
                  <bdi>{storeChipLabel(r.chip, index, t, money, fmt)}</bdi>
                  <Badge variant="neutral">{fmt(r.count)}</Badge>
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {popularSearches.length && onSearch ? (
          <div className="flex flex-col items-center gap-2">
            <p className="text-caption text-muted-foreground">{t.didYouMean}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {popularSearches.map((q) => (
                <Button key={q} size="sm" variant="secondary" onClick={() => onSearch(q)}>
                  {q}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
      </EmptyState>
    );
  } else {
    body = (
      <>
        {cards}
        {paging === "pages" ? (
          pg.pageCount > 1 ? (
            <div className="mt-8 flex flex-col items-center gap-2">
              <p className="text-caption text-muted-foreground">{fillTemplate(t.showing, { from: fmt(pg.from), to: fmt(pg.to), total: fmt(pg.total) })}</p>
              <Pagination
                page={pg.page}
                pageCount={pg.pageCount}
                label={t.pagination}
                onPageChange={(n) => {
                  setPage(n);
                  top.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
                }}
              />
            </div>
          ) : null
        ) : visible.length < total ? (
          <div className="mt-8 flex flex-col items-center gap-2">
            <p className="text-caption text-muted-foreground">{fillTemplate(t.loadedOf, { n: fmt(visible.length), total: fmt(total) })}</p>
            <LoadMore onClick={() => setPresses(presses + 1)}>{t.loadMore}</LoadMore>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div data-slot="store-listing" className={cn("flex min-w-0 flex-col gap-4", className)}>
      <div ref={top} className="scroll-mt-20" />
      {header}
      {title ? <h1 className="text-h1 text-foreground">{title}</h1> : null}
      <div className="grid gap-x-8 gap-y-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="hidden lg:block" aria-label={t.filters}>
          {sidebar}
        </aside>
        <div className="flex min-w-0 flex-col gap-4">
          <StoreListingToolbar
            total={total}
            sort={sort}
            onSortChange={setSort}
            {...(sorts ? { sorts } : {})}
            view={view}
            onViewChange={setView}
            density={density}
            onDensityChange={setDensity}
            filterCount={count}
            onOpenFilters={() => setSheet(true)}
            labels={labels ?? {}}
          />
          <StoreActiveChips filters={filters} onFiltersChange={changeFilters} index={index} currency={currency} includeQuery={showQueryChip} labels={labels ?? {}} />
          {notice ? (
            <p role="status" className="text-body-sm text-nq-warning-text">
              {notice}
            </p>
          ) : null}
          {body}
        </div>
      </div>

      <StoreFilterSheet
        open={sheet}
        onOpenChange={setSheet}
        onApply={changeFilters}
        products={products}
        filters={filters}
        categoryTree={categoryTree}
        currency={currency}
        labels={labels ?? {}}
      />
      <StoreQuickView
        product={quick}
        open={quickOpen}
        onOpenChange={setQuickOpen}
        currency={currency}
        {...(quick && getHref ? { href: getHref(quick) } : {})}
        {...(onAddToCart ? { onAddToCart } : {})}
        labels={labels ?? {}}
      />
      {compare ? (
        <>
          <StoreCompareTray
            products={comparedProducts}
            max={compareMax}
            onRemove={(p) => setCompare(compareIds.filter((x) => x !== p.id))}
            onClear={() => setCompare([])}
            onCompare={() => setCompareOpen(true)}
            labels={labels ?? {}}
          />
          <StoreCompareDialog
            open={compareOpen}
            onOpenChange={setCompareOpen}
            products={comparedProducts}
            currency={currency}
            onRemove={(p) => setCompare(compareIds.filter((x) => x !== p.id))}
            {...(onCompareAddToCart ? { onAddToCart: onCompareAddToCart } : {})}
            labels={labels ?? {}}
          />
        </>
      ) : null}
    </div>
  );
}

export { StoreCompareDialog, StoreCompareTable, StoreCompareTray } from "./store-compare";
export { StoreProductImage, StoreOptionPicker, StorePrice, StoreProductCard, storeCurrencyDigits } from "./store-product-card";
export { StoreQuickView } from "./store-quick-view";
export type { StoreCompareDialogProps, StoreCompareTableProps, StoreCompareTrayProps } from "./store-compare";
export type { StoreProductImageProps, StoreOptionPickerProps, StorePriceProps, StoreProductCardProps } from "./store-product-card";
export type { StoreQuickViewProps } from "./store-quick-view";
