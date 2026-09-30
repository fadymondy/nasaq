"use client";

import { ChevronLeft, ChevronRight, Clock, Heart, Loader2, Menu, Search, ShoppingBag, TrendingUp, User, X } from "lucide-react";
import { type FormEvent, type KeyboardEvent, type ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import type { CommerceProduct } from "../../lib/commerce";
import { usePrefersReducedMotion } from "../ai-states/ai-states";
import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger } from "../accordion";
import { Badge } from "../badge";
import { Button } from "../button";
import { Icon } from "../icon";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../input-group";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuFeatured,
  NavigationMenuItem,
  NavigationMenuLabel,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "../navigation-menu";
import { useFormatNumber } from "../numeric";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../sheet";
import { listingMinPrice, type ListingCategoryNode } from "../store-listing/listing-model";
import { StorePrice, StoreProductImage } from "../store-listing/store-product-card";
import {
  type ChromeAnnouncement,
  type ChromeSuggestion,
  chromeFlattenCategories,
  chromeHighlight,
  chromeLiveAnnouncements,
  chromeMoveActive,
  chromeRecordRecent,
  chromeStep,
  chromeSuggest,
} from "./store-chrome-model";
import { type ChromeLabels, chromeFill, useChromeStrings } from "./chrome-strings";

/* ------------------------------------------------------------------ announcement bar */

export interface StoreAnnouncement extends ChromeAnnouncement {
  /** The message. Keep it to one line. */
  content: ReactNode;
  /** Makes the whole message a link. */
  href?: string;
}

export interface StoreAnnouncementBarProps {
  items: readonly StoreAnnouncement[];
  /** Milliseconds each message stays. 0 or reduced motion turns rotation off. Default 5000. */
  interval?: number;
  /** Show the close button. Default true. */
  dismissible?: boolean;
  /** Called with the id of the dismissed announcement. */
  onDismiss?: (id: string) => void;
  /** Ids to treat as dismissed (controlled). Without it the bar remembers dismissals itself. */
  dismissedIds?: readonly string[];
  /** Clock for the from/until windows; default now. Mostly for tests and stories. */
  now?: number;
  labels?: ChromeLabels;
  className?: string;
}

/**
 * A thin bar above the header. Several messages rotate on a timer that stops on hover, focus and reduced motion, and
 * can be stepped by hand. Each message can be dismissed. It announces changes politely only when stepped manually.
 */
export function StoreAnnouncementBar({ items, interval = 5000, dismissible = true, onDismiss, dismissedIds, now, labels, className }: StoreAnnouncementBarProps) {
  const { t } = useChromeStrings(labels);
  const fmt = useFormatNumber();
  const reduced = usePrefersReducedMotion();
  const [innerDismissed, setInnerDismissed] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [hold, setHold] = useState(false);
  const [manual, setManual] = useState(false);
  const dismissed = dismissedIds ?? innerDismissed;
  const clock = now ?? Date.now();
  const live = useMemo(() => chromeLiveAnnouncements(items, dismissed, clock), [items, dismissed, clock]);
  const current = live[Math.min(index, Math.max(live.length - 1, 0))];
  const rotating = live.length > 1 && interval > 0 && !reduced && !hold;

  useEffect(() => {
    if (!rotating) return;
    const id = window.setTimeout(() => setIndex((i) => chromeStep(i, live.length, 1)), interval);
    return () => window.clearTimeout(id);
  }, [rotating, index, interval, live.length]);

  if (!current) return null;
  const step = (s: 1 | -1) => {
    setManual(true);
    setIndex((i) => chromeStep(i, live.length, s));
  };
  const dismiss = () => {
    setInnerDismissed((d) => [...d, current.id]);
    onDismiss?.(current.id);
  };
  const message = current.href ? (
    <a href={current.href} className="rounded-sm underline-offset-4 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current">
      {current.content}
    </a>
  ) : (
    current.content
  );

  return (
    <div
      data-slot="store-announcement-bar"
      role="region"
      aria-roledescription="carousel"
      aria-label={t.announcements}
      onMouseEnter={() => setHold(true)}
      onMouseLeave={() => setHold(false)}
      onFocus={() => setHold(true)}
      onBlur={() => setHold(false)}
      className={cn("flex min-h-9 items-center gap-2 bg-primary px-3 text-body-sm text-primary-foreground", className)}
    >
      {live.length > 1 ? (
        <Button size="icon-sm" variant="ghost" aria-label={t.previousAnnouncement} onClick={() => step(-1)} className="text-current hover:bg-white/15">
          <Icon icon={ChevronLeft} />
        </Button>
      ) : (
        <span className="size-control-sm shrink-0" aria-hidden />
      )}
      <p key={current.id} aria-live={manual ? "polite" : "off"} aria-atomic className="min-w-0 flex-1 truncate text-center motion-safe:animate-in motion-safe:fade-in">
        {message}
        {live.length > 1 ? <span className="sr-only"> ({chromeFill(t.announcementOf, { n: fmt(Math.min(index, live.length - 1) + 1), total: fmt(live.length) })})</span> : null}
      </p>
      {live.length > 1 ? (
        <Button size="icon-sm" variant="ghost" aria-label={t.nextAnnouncement} onClick={() => step(1)} className="text-current hover:bg-white/15">
          <Icon icon={ChevronRight} />
        </Button>
      ) : null}
      {dismissible ? (
        <Button size="icon-sm" variant="ghost" aria-label={t.dismiss} onClick={dismiss} className="text-current hover:bg-white/15">
          <Icon icon={X} />
        </Button>
      ) : (
        <span className="size-control-sm shrink-0" aria-hidden />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ search */

export interface StoreSearchProps {
  /** Catalogue for suggestions. */
  products: readonly CommerceProduct[];
  /** Category tree for category suggestions. */
  categoryTree?: readonly ListingCategoryNode[];
  /** ISO 4217 code; adds a price to product suggestions. */
  currency?: string;
  /** Recent searches (controlled). Without it the box keeps its own. */
  recent?: readonly string[];
  onRecentChange?: (recent: string[]) => void;
  /** Searches to offer on an empty box. */
  popular?: readonly string[];
  /** Text in the box (controlled). */
  value?: string;
  onValueChange?: (value: string) => void;
  /** Enter, or choosing a query suggestion. */
  onSearch: (query: string) => void;
  onSelectProduct?: (product: CommerceProduct) => void;
  onSelectCategory?: (categoryId: string, label: string) => void;
  /** Product page URL for a suggestion; makes the row a real link for middle-click. */
  getProductHref?: (product: CommerceProduct) => string;
  /** Show a spinner while suggestions load from a server. */
  loading?: boolean;
  placeholder?: string;
  labels?: ChromeLabels;
  className?: string;
}

interface Row {
  key: string;
  suggestion: ChromeSuggestion | null;
  /** The trailing "Search for ..." row. */
  submit?: boolean;
}

/**
 * Search box with autocomplete: matching categories and products (image, name with the match emphasised, price), recent
 * and popular searches on focus. Arrow keys move, Enter picks, Escape closes. A real ARIA combobox.
 */
export function StoreSearch({
  products,
  categoryTree = [],
  currency,
  recent: recentProp,
  onRecentChange,
  popular = [],
  value: valueProp,
  onValueChange,
  onSearch,
  onSelectProduct,
  onSelectCategory,
  getProductHref,
  loading = false,
  placeholder,
  labels,
  className,
}: StoreSearchProps) {
  const { t } = useChromeStrings(labels);
  const fmt = useFormatNumber();
  const uid = useId();
  const listId = `${uid}-list`;
  const [innerValue, setInnerValue] = useState("");
  const [innerRecent, setInnerRecent] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const value = valueProp ?? innerValue;
  const recent = recentProp ?? innerRecent;
  const categories = useMemo(() => chromeFlattenCategories(categoryTree), [categoryTree]);
  const suggestions = useMemo(() => chromeSuggest(products, value, { categories, recent, popular }), [products, value, categories, recent, popular]);
  const query = value.trim();
  const rows: Row[] = useMemo(() => [...suggestions.map((s) => ({ key: s.id, suggestion: s })), ...(query ? [{ key: "submit", suggestion: null, submit: true }] : [])], [suggestions, query]);
  const showList = open && rows.length > 0;

  useEffect(() => setActive(-1), [value, open]);

  const setValue = (v: string) => {
    setInnerValue(v);
    onValueChange?.(v);
  };
  const remember = (q: string) => {
    const next = chromeRecordRecent(recent, q);
    setInnerRecent(next);
    onRecentChange?.(next);
  };
  const run = (q: string) => {
    const text = q.trim();
    if (!text) return;
    remember(text);
    setValue(text);
    setOpen(false);
    onSearch(text);
  };
  const choose = (row: Row) => {
    const s = row.suggestion;
    if (!s || row.submit) return run(value);
    if (s.kind === "product") {
      const p = products.find((x) => x.id === s.productId);
      if (p && onSelectProduct) {
        remember(query || s.label);
        setOpen(false);
        setValue("");
        onSelectProduct(p);
        return;
      }
    }
    if (s.kind === "category" && s.categoryId && onSelectCategory) {
      setOpen(false);
      setValue("");
      onSelectCategory(s.categoryId, s.label);
      return;
    }
    run(s.query);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Home" || event.key === "End") {
      if (!rows.length) return;
      if ((event.key === "Home" || event.key === "End") && !showList) return;
      event.preventDefault();
      setOpen(true);
      setActive((a) => chromeMoveActive(a, rows.length, event.key));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const row = showList ? rows[active] : undefined;
      if (row) choose(row);
      else run(value);
    } else if (event.key === "Escape") {
      if (showList) {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
      } else if (value) setValue("");
    }
  };
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    run(value);
  };

  const groups: { kind: ChromeSuggestion["kind"]; title: string }[] = [
    { kind: "category", title: t.categoriesGroup },
    { kind: "product", title: t.productsGroup },
    { kind: "recent", title: t.recentGroup },
    { kind: "popular", title: t.popularGroup },
  ];

  return (
    <div
      ref={root}
      data-slot="store-search"
      className={cn("relative w-full", className)}
      onBlur={(e) => {
        if (!root.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <form role="search" aria-label={t.searchLabel} onSubmit={onSubmit}>
        <InputGroup>
          <InputGroupAddon>{loading ? <Loader2 aria-hidden className="size-4 animate-spin motion-reduce:animate-none" /> : <Search aria-hidden className="size-4" />}</InputGroupAddon>
          <InputGroupInput
            ref={input}
            type="search"
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-haspopup="listbox"
            aria-label={t.searchLabel}
            aria-activedescendant={showList && active >= 0 ? `${uid}-opt-${active}` : undefined}
            autoComplete="off"
            enterKeyHint="search"
            placeholder={placeholder ?? t.searchPlaceholder}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            onKeyDown={onKeyDown}
            className="[&::-webkit-search-cancel-button]:hidden"
          />
          {value ? (
            <InputGroupAddon align="end">
              <button
                type="button"
                aria-label={t.clearSearch}
                onClick={() => {
                  setValue("");
                  input.current?.focus();
                }}
                className="inline-flex size-6 items-center justify-center rounded-full outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus"
              >
                <X aria-hidden className="size-4" />
              </button>
            </InputGroupAddon>
          ) : null}
        </InputGroup>
      </form>
      <p role="status" aria-live="polite" className="sr-only">
        {showList ? chromeFill(t.suggestionsCount, { n: fmt(suggestions.length) }) : ""}
      </p>

      {showList ? (
        <div
          data-slot="store-search-popup"
          onMouseDown={(e) => e.preventDefault()}
          className="absolute inset-x-0 top-full z-40 mt-1.5 max-h-[min(28rem,70dvh)] overflow-y-auto rounded-floating border border-border bg-popover p-1.5 text-popover-foreground shadow-floating"
        >
          <ul id={listId} role="listbox" aria-label={t.suggestions} className="m-0 flex list-none flex-col p-0">
            {groups.map((g) => {
              const items = rows.map((r, i) => ({ r, i })).filter(({ r }) => r.suggestion?.kind === g.kind);
              if (!items.length) return null;
              return [
                <li key={`h-${g.kind}`} role="presentation" className="flex items-center justify-between px-2.5 pt-2 pb-1 text-caption font-medium text-muted-foreground">
                  {g.title}
                  {g.kind === "recent" && !query ? (
                    <button
                      type="button"
                      onClick={() => {
                        setInnerRecent([]);
                        onRecentChange?.([]);
                      }}
                      className="rounded-sm text-caption outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus"
                    >
                      {t.clearRecent}
                    </button>
                  ) : null}
                </li>,
                ...items.map(({ r, i }) => (
                  <SuggestionRow key={r.key} id={`${uid}-opt-${i}`} row={r} active={i === active} query={query} products={products} currency={currency} labels={labels ?? {}} getProductHref={getProductHref} onPick={() => choose(r)} onHover={() => setActive(i)} />
                )),
              ];
            })}
            {rows.some((r) => r.submit) ? (
              <li
                id={`${uid}-opt-${rows.length - 1}`}
                role="option"
                aria-selected={active === rows.length - 1}
                onMouseMove={() => setActive(rows.length - 1)}
                onClick={() => run(value)}
                className={cn("mt-1 flex cursor-pointer items-center gap-2 rounded-control border-t border-border px-2.5 py-2 text-body-sm", active === rows.length - 1 && "bg-nq-selected")}
              >
                <Search aria-hidden className="size-4 text-muted-foreground" />
                <bdi>{chromeFill(t.searchFor, { query })}</bdi>
              </li>
            ) : null}
            {query && !suggestions.length ? (
              <li role="presentation" className="px-2.5 py-2 text-body-sm text-muted-foreground">
                {chromeFill(t.noSuggestions, { query })}
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  return (
    <>
      {chromeHighlight(text, query).map((s, i) =>
        s.match ? (
          <mark key={i} className="bg-transparent font-semibold text-foreground">
            {s.text}
          </mark>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </>
  );
}

function SuggestionRow({
  id,
  row,
  active,
  query,
  products,
  currency,
  labels,
  getProductHref,
  onPick,
  onHover,
}: {
  id: string;
  row: Row;
  active: boolean;
  query: string;
  products: readonly CommerceProduct[];
  currency: string | undefined;
  labels: ChromeLabels;
  getProductHref: ((p: CommerceProduct) => string) | undefined;
  onPick: () => void;
  onHover: () => void;
}) {
  const { t } = useChromeStrings(labels);
  const s = row.suggestion!;
  const product = s.kind === "product" ? products.find((p) => p.id === s.productId) : undefined;
  return (
    <li
      id={id}
      role="option"
      aria-selected={active}
      data-active={active || undefined}
      onMouseMove={onHover}
      onClick={(e) => {
        e.preventDefault();
        onPick();
      }}
      className={cn("flex cursor-pointer items-center gap-3 rounded-control px-2.5 py-1.5 text-body-sm", active && "bg-nq-selected")}
    >
      {product ? (
        <>
          <span className="size-10 shrink-0 overflow-hidden rounded-control bg-secondary">
            <StoreProductImage src={product.images[0]?.src} alt="" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-foreground">
              {getProductHref ? (
                <a href={getProductHref(product)} tabIndex={-1} onClick={(e) => e.preventDefault()} className="text-inherit no-underline">
                  <Highlight text={product.name} query={query} />
                </a>
              ) : (
                <Highlight text={product.name} query={query} />
              )}
            </span>
            {product.brand ? <span className="truncate text-caption text-muted-foreground">{product.brand}</span> : null}
          </span>
          {currency ? <StorePrice amount={listingMinPrice(product)} currency={currency} size="sm" /> : null}
        </>
      ) : (
        <>
          <span aria-hidden className="inline-flex size-6 shrink-0 items-center justify-center text-muted-foreground">
            {s.kind === "recent" ? <Clock className="size-4" /> : s.kind === "popular" ? <TrendingUp className="size-4" /> : <Search className="size-4" />}
          </span>
          <span className="min-w-0 flex-1 truncate">
            <Highlight text={s.label} query={query} />
          </span>
          {s.kind === "category" && s.path && s.path !== s.label ? <span className="truncate text-caption text-muted-foreground">{chromeFill(t.inCategory, { category: s.path.split(" / ").slice(0, -1).join(" / ") })}</span> : null}
        </>
      )}
    </li>
  );
}

/* ------------------------------------------------------------------ mega menu */

export interface StoreNavLink {
  label: string;
  href: string;
  /** Small tag such as "New" or "Sale". */
  badge?: string;
}

export interface StoreNavColumn {
  title: string;
  links: readonly StoreNavLink[];
  /** A "View all" link under the column. */
  viewAll?: StoreNavLink;
}

export interface StoreNavFeatured {
  title: string;
  description?: string;
  href: string;
  image?: string;
}

export interface StoreNavItem {
  id: string;
  label: string;
  /** The item's own page. Items with `columns` open a panel and the label also links here when set. */
  href?: string;
  /** Link columns of the mega menu panel. */
  columns?: readonly StoreNavColumn[];
  featured?: StoreNavFeatured;
  /** Draw the label in the sale colour. */
  highlight?: boolean;
}

export interface StoreMegaMenuProps {
  items: readonly StoreNavItem[];
  /** Id of the current section, for aria-current. */
  currentId?: string;
  labels?: ChromeLabels;
  className?: string;
}

/**
 * The desktop category navigation. Items with columns open one shared panel of link columns and a featured tile;
 * it opens on hover, focus or Enter, and arrow keys move between items.
 */
export function StoreMegaMenu({ items, currentId, labels, className }: StoreMegaMenuProps) {
  const { t } = useChromeStrings(labels);
  const linkClass = "inline-flex h-control items-center rounded-control px-3 text-label text-foreground no-underline outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus data-popup-open:bg-nq-hover";
  return (
    <nav aria-label={t.mainNavigation} data-slot="store-mega-menu" className={className}>
      <NavigationMenu align="start" sideOffset={6}>
        <NavigationMenuList>
          {items.map((item) => {
            const cols = item.columns ?? [];
            const tone = item.highlight ? "text-nq-danger-text" : "";
            if (!cols.length && !item.featured)
              return (
                <NavigationMenuItem key={item.id}>
                  <NavigationMenuLink href={item.href ?? "#"} aria-current={item.id === currentId ? "page" : undefined} className={cn(linkClass, tone)}>
                    {item.label}
                  </NavigationMenuLink>
                </NavigationMenuItem>
              );
            return (
              <NavigationMenuItem key={item.id}>
                <NavigationMenuTrigger className={cn(linkClass, tone)}>{item.label}</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="flex min-w-[34rem] max-w-[56rem] gap-6 p-5">
                    <div className="grid flex-1 gap-x-8 gap-y-4" style={{ gridTemplateColumns: `repeat(${Math.min(Math.max(cols.length, 1), 4)}, minmax(9rem, 1fr))` }}>
                      {cols.map((col) => (
                        <div key={col.title} className="flex min-w-0 flex-col gap-1">
                          <NavigationMenuLabel className="px-0">{col.title}</NavigationMenuLabel>
                          <ul className="m-0 flex list-none flex-col p-0">
                            {col.links.map((l) => (
                              <li key={l.href + l.label}>
                                <NavigationMenuLink href={l.href} className="flex items-center gap-2 rounded-control px-2 py-1.5 text-body-sm text-foreground no-underline outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus">
                                  {l.label}
                                  {l.badge ? <Badge variant="accent">{l.badge}</Badge> : null}
                                </NavigationMenuLink>
                              </li>
                            ))}
                            {col.viewAll ? (
                              <li>
                                <NavigationMenuLink href={col.viewAll.href} className="mt-1 inline-flex rounded-control px-2 py-1.5 text-body-sm font-medium text-foreground underline underline-offset-4 outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus">
                                  {col.viewAll.label}
                                </NavigationMenuLink>
                              </li>
                            ) : null}
                          </ul>
                        </div>
                      ))}
                    </div>
                    {item.featured ? (
                      <NavigationMenuFeatured href={item.featured.href} className="w-56 shrink-0 justify-start p-0">
                        <span className="aspect-[4/3] w-full overflow-hidden rounded-t-card bg-secondary">
                          <StoreProductImage src={item.featured.image} alt="" />
                        </span>
                        <span className="flex flex-col gap-0.5 p-3">
                          <span className="text-label text-foreground">{item.featured.title}</span>
                          {item.featured.description ? <span className="text-body-sm text-muted-foreground">{item.featured.description}</span> : null}
                        </span>
                      </NavigationMenuFeatured>
                    ) : null}
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            );
          })}
        </NavigationMenuList>
      </NavigationMenu>
    </nav>
  );
}

/* ------------------------------------------------------------------ header */

export interface StoreHeaderProps {
  /** The logo. A string renders as the store name. */
  brand: ReactNode;
  brandHref?: string;
  nav?: readonly StoreNavItem[];
  currentNavId?: string;
  /** Search props. Without it the search box is hidden. */
  search?: StoreSearchProps;
  cartCount?: number;
  onCartClick?: () => void;
  /** Link for the cart when there is no handler. */
  cartHref?: string;
  wishlistCount?: number;
  onWishlistClick?: () => void;
  onAccountClick?: () => void;
  /** Replaces the account button (a user menu, a "Sign in" link). */
  account?: ReactNode;
  /** Extra controls at the inline end, before the cart: a language or currency switch. */
  utility?: ReactNode;
  /** Rendered above the bar: a `StoreAnnouncementBar`. */
  announcement?: ReactNode;
  /** Stick to the top of the page. Default true. */
  sticky?: boolean;
  labels?: ChromeLabels;
  className?: string;
}

function CountBadge({ n }: { n: number | undefined }) {
  const fmt = useFormatNumber();
  if (!n) return null;
  return (
    <span aria-hidden className="absolute -end-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-4 font-semibold text-primary-foreground tabular-nums">
      {n > 99 ? `${fmt(99)}+` : fmt(n)}
    </span>
  );
}

/**
 * The storefront header: announcement slot, brand, mega menu, search, wishlist, account and cart with a count. On
 * phones the menu moves into a sheet with an accordion and the search drops to its own row. The cart is a prop-driven
 * hook: pass `cartCount` and `onCartClick` to open a drawer, or `cartHref` for a page.
 */
export function StoreHeader({ brand, brandHref = "/", nav = [], currentNavId, search, cartCount, onCartClick, cartHref, wishlistCount, onWishlistClick, onAccountClick, account, utility, announcement, sticky = true, labels, className }: StoreHeaderProps) {
  const { t } = useChromeStrings(labels);
  const fmt = useFormatNumber();
  const [menu, setMenu] = useState(false);
  const iconBtn = "relative";
  const cartLabel = cartCount ? chromeFill(t.cartWithCount, { n: fmt(cartCount) }) : t.cart;
  return (
    <header data-slot="store-header" className={cn(sticky && "sticky top-0 z-40", "border-b border-border bg-background", className)}>
      {announcement}
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-2 px-3 sm:gap-4 sm:px-6">
        {nav.length ? (
          <Button size="icon" variant="ghost" aria-label={t.menu} className="lg:hidden" onClick={() => setMenu(true)}>
            <Icon icon={Menu} />
          </Button>
        ) : null}
        <a href={brandHref} className="shrink-0 rounded-sm text-h3 font-semibold text-foreground no-underline outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">
          {brand}
        </a>
        <div className="hidden min-w-0 lg:block">
          <StoreMegaMenu items={nav} {...(currentNavId ? { currentId: currentNavId } : {})} labels={labels ?? {}} />
        </div>
        {search ? <StoreSearch {...search} labels={search.labels ?? labels ?? {}} className={cn("mx-auto hidden max-w-xl flex-1 md:block", search.className)} /> : <span className="flex-1" />}
        <div className="ms-auto flex shrink-0 items-center gap-0.5 md:ms-0">
          {utility}
          {onWishlistClick || wishlistCount !== undefined ? (
            <Button size="icon" variant="ghost" aria-label={wishlistCount ? chromeFill(t.wishlistWithCount, { n: fmt(wishlistCount) }) : t.wishlist} className={cn(iconBtn, "hidden sm:inline-flex")} onClick={onWishlistClick}>
              <Icon icon={Heart} />
              <CountBadge n={wishlistCount} />
            </Button>
          ) : null}
          {account ?? (onAccountClick ? (
            <Button size="icon" variant="ghost" aria-label={t.account} onClick={onAccountClick}>
              <Icon icon={User} />
            </Button>
          ) : null)}
          {onCartClick || cartHref ? (
            <Button size="icon" variant="ghost" aria-label={cartLabel} className={iconBtn} {...(onCartClick ? { onClick: onCartClick } : { render: <a href={cartHref} />, nativeButton: false })}>
              <Icon icon={ShoppingBag} />
              <CountBadge n={cartCount} />
            </Button>
          ) : null}
        </div>
      </div>
      {search ? (
        <div className="px-3 pb-3 md:hidden">
          <StoreSearch {...search} labels={search.labels ?? labels ?? {}} />
        </div>
      ) : null}

      <Sheet open={menu} onOpenChange={setMenu}>
        <SheetContent side="start" closeLabel={t.closeMenu} className="w-[min(22rem,100vw)]">
          <SheetHeader>
            <SheetTitle>{t.menu}</SheetTitle>
            <SheetDescription className="sr-only">{t.mobileNavigation}</SheetDescription>
          </SheetHeader>
          <SheetBody>
            <nav aria-label={t.mobileNavigation}>
              <Accordion className="rounded-none border-0 bg-transparent">
                {nav.map((item) =>
                  item.columns?.length ? (
                    <AccordionItem key={item.id} value={item.id}>
                      <AccordionTrigger>{item.label}</AccordionTrigger>
                      <AccordionPanel>
                        <div className="flex flex-col gap-3 pb-2">
                          {item.href ? (
                            <a href={item.href} className="text-body-sm font-medium text-foreground underline underline-offset-4">
                              {t.shopAll}
                            </a>
                          ) : null}
                          {item.columns.map((col) => (
                            <div key={col.title} className="flex flex-col gap-1">
                              <p className="text-caption font-medium text-muted-foreground">{col.title}</p>
                              <ul className="m-0 flex list-none flex-col p-0">
                                {col.links.map((l) => (
                                  <li key={l.href + l.label}>
                                    <a href={l.href} className="flex items-center gap-2 rounded-control py-1.5 text-body-sm text-foreground no-underline hover:underline">
                                      {l.label}
                                      {l.badge ? <Badge variant="accent">{l.badge}</Badge> : null}
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </AccordionPanel>
                    </AccordionItem>
                  ) : (
                    <a key={item.id} href={item.href ?? "#"} className={cn("flex h-nav-row items-center border-b border-border px-4 text-label no-underline", item.highlight ? "text-nq-danger-text" : "text-foreground")}>
                      {item.label}
                    </a>
                  ),
                )}
              </Accordion>
            </nav>
          </SheetBody>
        </SheetContent>
      </Sheet>
    </header>
  );
}

/* ------------------------------------------------------------------ footer */

export interface StoreFooterColumn {
  title: string;
  links: readonly StoreNavLink[];
}

export interface StoreFooterSocial {
  /** Text name of the network. Text only, so there is no logo to get wrong. */
  label: string;
  href: string;
}

export interface StoreFooterOption {
  value: string;
  label: string;
}

export interface StoreFooterProps {
  brand?: ReactNode;
  /** One short line about the store, under the brand. */
  tagline?: ReactNode;
  columns?: readonly StoreFooterColumn[];
  /** Adds the newsletter form. Resolves when subscribed; reject to show the failure message. */
  onSubscribe?: (email: string) => void | Promise<void>;
  /** Payment marks: pass your own logos or text badges. */
  payments?: ReactNode;
  social?: readonly StoreFooterSocial[];
  languages?: readonly StoreFooterOption[];
  language?: string;
  onLanguageChange?: (value: string) => void;
  currencies?: readonly StoreFooterOption[];
  currency?: string;
  onCurrencyChange?: (value: string) => void;
  /** Bottom line. Default: nothing. */
  legal?: ReactNode;
  labels?: ChromeLabels;
  className?: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function Newsletter({ onSubscribe, labels }: { onSubscribe: (email: string) => void | Promise<void>; labels: ChromeLabels }) {
  const { t } = useChromeStrings(labels);
  const uid = useId();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "failed" | "invalid">("idle");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!EMAIL.test(email.trim())) return setState("invalid");
    setState("busy");
    try {
      await onSubscribe(email.trim());
      setState("done");
      setEmail("");
    } catch {
      setState("failed");
    }
  };
  return (
    <form onSubmit={submit} noValidate data-slot="store-newsletter" className="flex max-w-md flex-col gap-2">
      <div>
        <p className="text-label text-foreground">{t.newsletterTitle}</p>
        <p className="text-body-sm text-muted-foreground">{t.newsletterHint}</p>
      </div>
      <div className="flex gap-2">
        <InputGroup className="flex-1" aria-invalid={state === "invalid" || undefined}>
          <InputGroupInput
            id={`${uid}-email`}
            type="email"
            ltr
            autoComplete="email"
            aria-label={t.email}
            aria-invalid={state === "invalid" || undefined}
            aria-describedby={`${uid}-msg`}
            placeholder={t.emailPlaceholder}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (state !== "busy") setState("idle");
            }}
          />
        </InputGroup>
        <Button type="submit" variant="primary" loading={state === "busy"}>
          {t.subscribe}
        </Button>
      </div>
      <p id={`${uid}-msg`} role="status" aria-live="polite" className={cn("min-h-5 text-body-sm", state === "done" ? "text-nq-success-text" : "text-nq-danger-text")}>
        {state === "done" ? t.subscribed : state === "invalid" ? t.invalidEmail : state === "failed" ? t.subscribeFailed : ""}
      </p>
    </form>
  );
}

function FooterSelect({ label, options, value, onChange }: { label: string; options: readonly StoreFooterOption[]; value: string | undefined; onChange: ((v: string) => void) | undefined }) {
  const items = options.map((o) => ({ value: o.value, label: o.label }));
  return (
    <label className="flex flex-col gap-1 text-caption text-muted-foreground">
      {label}
      <Select items={items} value={value} onValueChange={(v) => v && onChange?.(String(v))}>
        <SelectTrigger aria-label={label} className="h-9 min-w-36">
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
  );
}

/**
 * The storefront footer: link columns, newsletter sign-up with validation and a live result, payment marks slot, text
 * social links, and language and currency switches.
 */
export function StoreFooter({ brand, tagline, columns = [], onSubscribe, payments, social = [], languages, language, onLanguageChange, currencies, currency, onCurrencyChange, legal, labels, className }: StoreFooterProps) {
  const { t } = useChromeStrings(labels);
  return (
    <footer data-slot="store-footer" aria-label={t.footer} className={cn("border-t border-border bg-nq-surface-soft", className)}>
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-5">
          {brand ? <div className="text-h3 font-semibold text-foreground">{brand}</div> : null}
          {tagline ? <p className="max-w-sm text-body-sm text-muted-foreground">{tagline}</p> : null}
          {onSubscribe ? <Newsletter onSubscribe={onSubscribe} labels={labels ?? {}} /> : null}
        </div>
        <nav aria-label={t.footer} className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {columns.map((col) => (
            <div key={col.title} className="flex min-w-0 flex-col gap-2.5">
              <h3 className="text-label text-foreground">{col.title}</h3>
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    <a href={l.href} className="rounded-sm text-body-sm text-muted-foreground no-underline outline-none hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-end justify-between gap-x-8 gap-y-5 px-4 py-6 sm:px-6">
          <div className="flex flex-wrap items-end gap-4">
            {languages?.length ? <FooterSelect label={t.language} options={languages} value={language} onChange={onLanguageChange} /> : null}
            {currencies?.length ? <FooterSelect label={t.currency} options={currencies} value={currency} onChange={onCurrencyChange} /> : null}
          </div>
          {payments ? (
            <div className="flex flex-col gap-1.5">
              <p className="text-caption text-muted-foreground">{t.paymentMethods}</p>
              <div data-slot="store-footer-payments" className="flex flex-wrap items-center gap-2">
                {payments}
              </div>
            </div>
          ) : null}
          {social.length ? (
            <nav aria-label={t.followUs} className="flex flex-col gap-1.5">
              <p className="text-caption text-muted-foreground">{t.followUs}</p>
              <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0">
                {social.map((s) => (
                  <li key={s.href}>
                    <a href={s.href} rel="noopener noreferrer" target="_blank" className="rounded-sm text-body-sm text-foreground underline-offset-4 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </div>
        {legal ? <div className="mx-auto w-full max-w-7xl px-4 pb-6 text-caption text-muted-foreground sm:px-6">{legal}</div> : null}
      </div>
    </footer>
  );
}
