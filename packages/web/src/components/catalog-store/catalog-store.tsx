"use client";

import { type LucideIcon, Package, Search } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge } from "../badge";
import { Button } from "../button";
import { Chip, ChipGroup } from "../chip-group";
import { Input } from "../field";
import { InstallButton, type InstallState } from "../install-button";
import { DateTime, formatNumber } from "../numeric";
import { Price, type PricePeriod } from "../price";
import { Rating } from "../rating";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "../sheet";
import { EmptyState } from "../states";
import { Toggle, ToggleGroup } from "../toggle-group";
import { type CatalogSort, categoryCounts, filterCatalog, sortCatalog } from "./catalog-logic";

export type { CatalogSort };

export interface CatalogItem {
  id: string;
  name: string;
  summary: string;
  /** Longer text for the detail sheet. Falls back to `summary`. */
  description?: string;
  /** Matches a `CatalogCategory` id. */
  category: string;
  icon?: LucideIcon;
  publisher?: string;
  version?: string;
  /** Adds a badge ("Official", "Preset"). */
  badge?: string;
  installs?: number;
  rating?: number;
  ratingCount?: number;
  /** Omit or 0 for free. */
  price?: { amount: number; currency?: string; period?: PricePeriod };
  tags?: string[];
  installed?: boolean;
  updatedAt?: Date | number | string;
  /** Rows for the detail sheet: `{ label: "Inputs", value: "1 item" }`. */
  details?: { label: string; value: ReactNode }[];
}

export interface CatalogCategory {
  id: string;
  label: string;
  icon?: LucideIcon;
}

export type CatalogResult = void | { error?: string };

export interface CatalogLabels {
  search: string;
  all: string;
  installed: string;
  categories: string;
  sort: string;
  sortPopular: string;
  sortNewest: string;
  sortName: string;
  results: (n: string) => string;
  emptyTitle: string;
  emptyBody: string;
  clear: string;
  by: (publisher: string) => string;
  installs: string;
  about: string;
  tags: string;
  version: string;
  updated: string;
  uninstall: string;
  uninstalling: string;
  details: string;
  free: string;
  installedNote: string;
}

const STRINGS: { en: CatalogLabels; ar: CatalogLabels } = {
  en: {
    search: "Search the store",
    all: "All",
    installed: "Installed",
    categories: "Categories",
    sort: "Sort by",
    sortPopular: "Popular",
    sortNewest: "Newest",
    sortName: "A to Z",
    results: (n) => `${n} results`,
    emptyTitle: "Nothing found",
    emptyBody: "Try another word or pick a different category.",
    clear: "Clear filters",
    by: (p) => `by ${p}`,
    installs: "installs",
    about: "About",
    tags: "Tags",
    version: "Version",
    updated: "Updated",
    uninstall: "Uninstall",
    uninstalling: "Removing",
    details: "Details",
    free: "Free",
    installedNote: "Installed in this workspace.",
  },
  ar: {
    search: "ابحث في المتجر",
    all: "الكل",
    installed: "المثبّتة",
    categories: "الفئات",
    sort: "الترتيب",
    sortPopular: "الأشهر",
    sortNewest: "الأحدث",
    sortName: "أبجديًا",
    results: (n) => `${n} نتيجة`,
    emptyTitle: "لا شيء هنا",
    emptyBody: "جرّب كلمة أخرى أو اختر فئة مختلفة.",
    clear: "مسح التصفية",
    by: (p) => `من ${p}`,
    installs: "تثبيت",
    about: "نبذة",
    tags: "الوسوم",
    version: "الإصدار",
    updated: "آخر تحديث",
    uninstall: "إزالة",
    uninstalling: "جارٍ الإزالة",
    details: "التفاصيل",
    free: "مجاني",
    installedNote: "مثبّت في مساحة العمل هذه.",
  },
};

export interface CatalogStoreProps {
  items: CatalogItem[];
  categories: CatalogCategory[];
  /** Install. Resolve to finish; return `{ error }` to show why it failed. */
  onInstall?: (item: CatalogItem) => Promise<CatalogResult>;
  /** Uninstall. Omit to hide the button. */
  onUninstall?: (item: CatalogItem) => Promise<CatalogResult>;
  /** The "Open" action once installed. */
  onOpen?: (item: CatalogItem) => void;
  /** Opens an item somewhere else (a detail page). When set, a card no longer opens the detail sheet. */
  onSelect?: (item: CatalogItem) => void;
  /** More content in an item's detail sheet, after the description. */
  renderDetail?: (item: CatalogItem) => ReactNode;
  /** Controls placed after the search box, such as a kind switch. */
  toolbarStart?: ReactNode;
  className?: string;
  defaultSort?: CatalogSort;
  labels?: Partial<CatalogLabels>;
}

function useCatalogLabels(labels?: Partial<CatalogLabels>) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const ar = locale.startsWith("ar");
  return { t: { ...STRINGS[ar ? "ar" : "en"], ...labels } as CatalogLabels, ar, locale };
}

/** The tile an item shows in the card and the sheet. */
export function CatalogIcon({ item, className }: { item: Pick<CatalogItem, "icon" | "name">; className?: string }) {
  const Icon = item.icon ?? Package;
  return (
    <span aria-hidden className={cn("flex size-10 shrink-0 items-center justify-center rounded-card border border-border bg-secondary text-foreground [&_svg]:size-5", className)}>
      <Icon />
    </span>
  );
}

interface CardProps {
  item: CatalogItem;
  state: InstallState;
  onOpenDetail: (item: CatalogItem) => void;
  onInstall?: (item: CatalogItem) => void;
  onOpen?: (item: CatalogItem) => void;
  labels?: Partial<CatalogLabels>;
}

/** One store card. The whole card opens the detail; the install button works on its own. */
export function CatalogCard({ item, state, onOpenDetail, onInstall, onOpen, labels }: CardProps) {
  const { t, locale } = useCatalogLabels(labels);
  const free = !item.price || item.price.amount === 0;
  return (
    <article data-slot="catalog-card" data-item={item.id} data-state={state} className="relative flex h-full flex-col gap-3 rounded-card border border-border bg-card p-4 shadow-xs transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-nq-focus hover:bg-nq-hover">
      <div className="flex items-start gap-3">
        <CatalogIcon item={item} />
        <div className="min-w-0 flex-1">
          <h3 className="text-label text-foreground">
            <button type="button" onClick={() => onOpenDetail(item)} className="text-start outline-none after:absolute after:inset-0 after:content-['']">
              {item.name}
            </button>
          </h3>
          {item.publisher ? <p className="truncate text-caption text-muted-foreground">{t.by(item.publisher)}</p> : null}
        </div>
        {item.badge ? <Badge variant="outline">{item.badge}</Badge> : null}
      </div>
      <p className="line-clamp-2 text-body-sm text-muted-foreground">{item.summary}</p>
      <div className="mt-auto flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
          {item.rating !== undefined ? <Rating value={item.rating} {...(item.ratingCount !== undefined ? { count: item.ratingCount } : {})} /> : null}
          {item.installs !== undefined ? (
            <span>
              <bdi>{formatNumber(item.installs, locale, { notation: "compact" })}</bdi> {t.installs}
            </span>
          ) : null}
          {free ? null : item.price ? <Price amount={item.price.amount} {...(item.price.currency ? { currency: item.price.currency } : {})} {...(item.price.period ? { period: item.price.period } : {})} size="sm" /> : null}
        </div>
        <InstallButton
          className="relative z-10 shrink-0"
          state={state}
          appName={item.name}
          free={free}
          {...(onInstall ? { onInstall: () => onInstall(item) } : {})}
          {...(onOpen ? { onOpen: () => onOpen(item) } : {})}
        />
      </div>
    </article>
  );
}

/**
 * A store for installable things: search, category chips, sort, a grid of cards and a detail sheet with the
 * install action. It is the shared layout behind the workflow-steps marketplace and any plugin or app store:
 * describe the things as `CatalogItem`s and pass your own detail content with `renderDetail`.
 */
export function CatalogStore({ items, categories, onInstall, onUninstall, onOpen, onSelect, renderDetail, toolbarStart, className, defaultSort = "popular", labels }: CatalogStoreProps) {
  const { t, locale } = useCatalogLabels(labels);
  const num = (n: number) => formatNumber(n, locale);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<CatalogSort>(defaultSort);
  const [detailId, setDetailId] = useState<string | null>(null);
  // Optimistic overlay over the `installed` flags the parent passes.
  const [override, setOverride] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<Record<string, "install" | "uninstall">>({});
  const [error, setError] = useState<{ id: string; message: string } | null>(null);

  const isInstalled = (item: CatalogItem) => override[item.id] ?? item.installed ?? false;
  const stateOf = (item: CatalogItem): InstallState => (busy[item.id] === "install" ? "installing" : isInstalled(item) ? "installed" : "available");
  const installedOnly = category === "installed";
  const listed = useMemo(() => {
    const filtered = filterCatalog(items, { query, category: installedOnly ? "all" : category, installedOnly }, isInstalled);
    return sortCatalog(filtered, sort, locale);
    // biome-ignore lint/correctness/useExhaustiveDependencies: isInstalled reads `override`
  }, [items, query, category, installedOnly, sort, locale, override]);
  const counts = useMemo(() => categoryCounts(items, query), [items, query]);
  const installedCount = items.filter(isInstalled).length;
  const detail = detailId ? items.find((i) => i.id === detailId) : undefined;

  async function run(item: CatalogItem, kind: "install" | "uninstall") {
    const fn = kind === "install" ? onInstall : onUninstall;
    if (!fn) return;
    setBusy((b) => ({ ...b, [item.id]: kind }));
    setError(null);
    const res = await fn(item);
    setBusy((b) => {
      const { [item.id]: _gone, ...rest } = b;
      return rest;
    });
    if (res && res.error) setError({ id: item.id, message: res.error });
    else setOverride((o) => ({ ...o, [item.id]: kind === "install" }));
  }

  return (
    <div data-slot="catalog-store" className={cn("flex min-w-0 flex-col gap-4", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1 sm:max-w-sm">
          <Search aria-hidden className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.search} aria-label={t.search} className="ps-8" />
        </div>
        {toolbarStart}
        <ToggleGroup value={[sort]} onValueChange={(v) => v[0] && setSort(v[0] as CatalogSort)} aria-label={t.sort} className="ms-auto">
          <Toggle value="popular">{t.sortPopular}</Toggle>
          <Toggle value="newest">{t.sortNewest}</Toggle>
          <Toggle value="name">{t.sortName}</Toggle>
        </ToggleGroup>
      </div>
      <ChipGroup value={category} onValueChange={setCategory} aria-label={t.categories}>
        <Chip value="all">
          {t.all} <bdi className="text-caption tabular-nums opacity-70">{num(counts.get("all") ?? 0)}</bdi>
        </Chip>
        {categories.map((c) => {
          const Icon = c.icon;
          return (
            <Chip key={c.id} value={c.id} {...(Icon ? { icon: <Icon aria-hidden /> } : {})}>
              {c.label} <bdi className="text-caption tabular-nums opacity-70">{num(counts.get(c.id) ?? 0)}</bdi>
            </Chip>
          );
        })}
        <Chip value="installed">
          {t.installed} <bdi className="text-caption tabular-nums opacity-70">{num(installedCount)}</bdi>
        </Chip>
      </ChipGroup>
      <p className="sr-only" role="status">
        {t.results(num(listed.length))}
      </p>
      {listed.length === 0 ? (
        <EmptyState
          title={t.emptyTitle}
          description={t.emptyBody}
          actions={
            query || category !== "all" ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setQuery("");
                  setCategory("all");
                }}
              >
                {t.clear}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-3">
          {listed.map((item) => (
            <li key={item.id} className="min-w-0">
              <CatalogCard item={item} state={stateOf(item)} onOpenDetail={(i) => (onSelect ? onSelect(i) : setDetailId(i.id))} onInstall={onInstall ? (i) => void run(i, "install") : undefined} onOpen={onOpen} labels={labels} />
            </li>
          ))}
        </ul>
      )}

      <Sheet open={detail !== undefined} onOpenChange={(o) => !o && setDetailId(null)}>
        <SheetContent className="w-full sm:max-w-md">
          {detail ? (
            <>
              <SheetHeader>
                <div className="flex items-start gap-3">
                  <CatalogIcon item={detail} className="size-12" />
                  <div className="min-w-0">
                    <SheetTitle className="text-h3">{detail.name}</SheetTitle>
                    <SheetDescription>
                      {detail.publisher ? t.by(detail.publisher) : detail.summary}
                      {detail.version ? (
                        <>
                          {" · "}
                          <bdi>v{detail.version}</bdi>
                        </>
                      ) : null}
                    </SheetDescription>
                  </div>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  {detail.badge ? <Badge variant="outline">{detail.badge}</Badge> : null}
                  {detail.rating !== undefined ? <Rating value={detail.rating} {...(detail.ratingCount !== undefined ? { count: detail.ratingCount } : {})} /> : null}
                  {detail.installs !== undefined ? (
                    <span className="text-caption text-muted-foreground">
                      <bdi>{formatNumber(detail.installs, locale, { notation: "compact" })}</bdi> {t.installs}
                    </span>
                  ) : null}
                  {detail.price && detail.price.amount > 0 ? <Price amount={detail.price.amount} {...(detail.price.currency ? { currency: detail.price.currency } : {})} {...(detail.price.period ? { period: detail.price.period } : {})} size="sm" /> : <span className="text-caption text-muted-foreground">{t.free}</span>}
                </div>
              </SheetHeader>
              <SheetBody className="flex flex-col gap-5 p-4">
                <section className="flex flex-col gap-1.5">
                  <h4 className="eyebrow">{t.about}</h4>
                  <p className="text-body-sm text-foreground">{detail.description ?? detail.summary}</p>
                </section>
                {renderDetail?.(detail)}
                {detail.details?.length || detail.updatedAt !== undefined ? (
                  <section className="flex flex-col gap-1.5">
                    <h4 className="eyebrow">{t.details}</h4>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-body-sm">
                      {detail.details?.map((d) => (
                        <div key={d.label} className="col-span-2 grid grid-cols-subgrid">
                          <dt className="text-muted-foreground">{d.label}</dt>
                          <dd className="text-foreground">{d.value}</dd>
                        </div>
                      ))}
                      {detail.updatedAt !== undefined ? (
                        <div className="col-span-2 grid grid-cols-subgrid">
                          <dt className="text-muted-foreground">{t.updated}</dt>
                          <dd className="text-foreground">
                            <DateTime value={detail.updatedAt} />
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  </section>
                ) : null}
                {detail.tags?.length ? (
                  <section className="flex flex-col gap-1.5">
                    <h4 className="eyebrow">{t.tags}</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {detail.tags.map((tag) => (
                        <Badge key={tag} variant="neutral">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </section>
                ) : null}
              </SheetBody>
              <SheetFooter className="flex-wrap">
                {error?.id === detail.id ? (
                  <p role="alert" className="w-full text-body-sm text-nq-danger-text">
                    {error.message}
                  </p>
                ) : null}
                <InstallButton state={stateOf(detail)} appName={detail.name} free={!detail.price || detail.price.amount === 0} size="md" variant="primary" {...(onInstall ? { onInstall: () => void run(detail, "install") } : {})} {...(onOpen ? { onOpen: () => onOpen(detail) } : {})} />
                {isInstalled(detail) && onUninstall ? (
                  <Button variant="ghost" loading={busy[detail.id] === "uninstall"} onClick={() => void run(detail, "uninstall")}>
                    {busy[detail.id] === "uninstall" ? t.uninstalling : t.uninstall}
                  </Button>
                ) : null}
                {isInstalled(detail) && !onUninstall ? <span className="text-caption text-muted-foreground">{t.installedNote}</span> : null}
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
