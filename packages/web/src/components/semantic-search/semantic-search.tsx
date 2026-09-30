"use client";

import { Check, Copy, Search, SlidersHorizontal, Sparkles, Star, X } from "lucide-react";
import { type ComponentProps, type ReactNode, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge } from "../badge";
import { Button } from "../button";
import { type ContextMenuAction, ContextMenuActions } from "../context-menu";
import { Input } from "../field";
import { formatNumber } from "../numeric";
import { EmptyState, ErrorState, Skeleton } from "../states";
import {
  clamp01,
  EMPTY_FACETS,
  facetValues,
  filterHits,
  hasFacetFilters,
  highlightParts,
  SEMANTIC_FACET_FIELDS,
  type ScoreLevel,
  type SemanticFacetField,
  type SemanticFacetSelection,
  scoreLevel,
  toggleInSet,
} from "./semantic-search-math";

/* ------------------------------------------------------------------ strings */

const STRINGS = {
  en: {
    label: "Semantic search",
    placeholder: "Ask or describe what you are looking for",
    search: "Search",
    searching: "Searching",
    mode: "Search mode",
    limit: "Results",
    tune: "Refine",
    fields: { group: "Group", kind: "Type", source: "Source" } as Record<SemanticFacetField, string>,
    highImportance: "High importance",
    clear: "Clear filters",
    countOne: "1 result",
    countMany: (n: string) => `${n} results`,
    countOf: (n: string, total: string) => `${n} of ${total} results`,
    open: "Open",
    copy: "Copy text",
    copied: "Copied",
    score: "Match",
    scoreTitle: (n: string) => `Similarity ${n}`,
    levels: { strong: "Strong", good: "Good", weak: "Weak" } as Record<ScoreLevel, string>,
    importance: (n: string) => `Importance ${n}`,
    via: (entity: string) => `via ${entity}`,
    idle: "Search the brain in plain words. Results are ranked by meaning, not only by matching words.",
    none: (q: string) => `Nothing found for “${q}”`,
    noneHint: "Try other words, or a shorter question. If it should be there, add it and it will show up as a knowledge gap.",
    allFiltered: (n: string) => `All ${n} results are hidden by the filters.`,
    loading: "Searching",
    retry: "Try again",
    modes: { semantic: "Semantic", keyword: "Keyword" },
  },
  ar: {
    label: "البحث الدلالي",
    placeholder: "اسأل أو صِف ما تبحث عنه",
    search: "بحث",
    searching: "جارٍ البحث",
    mode: "نمط البحث",
    limit: "النتائج",
    tune: "تضييق",
    fields: { group: "المجموعة", kind: "النوع", source: "المصدر" } as Record<SemanticFacetField, string>,
    highImportance: "أهمية عالية",
    clear: "مسح التصفية",
    countOne: "نتيجة واحدة",
    countMany: (n: string) => `${n} نتائج`,
    countOf: (n: string, total: string) => `${n} من ${total} نتيجة`,
    open: "فتح",
    copy: "نسخ النص",
    copied: "تم النسخ",
    score: "التطابق",
    scoreTitle: (n: string) => `التشابه ${n}`,
    levels: { strong: "قوي", good: "جيد", weak: "ضعيف" } as Record<ScoreLevel, string>,
    importance: (n: string) => `الأهمية ${n}`,
    via: (entity: string) => `عبر ${entity}`,
    idle: "ابحث في العقل بكلمات عادية. تُرتَّب النتائج بحسب المعنى، لا بمطابقة الكلمات فقط.",
    none: (q: string) => `لا نتائج لـ «${q}»`,
    noneHint: "جرّب كلمات أخرى أو سؤالًا أقصر. إن كان يجب أن يكون موجودًا، أضِفه وسيظهر كفجوة معرفة.",
    allFiltered: (n: string) => `كل النتائج (${n}) مخفية بسبب التصفية.`,
    loading: "جارٍ البحث",
    retry: "إعادة المحاولة",
    modes: { semantic: "دلالي", keyword: "بالكلمات" },
  },
};

export type SemanticSearchLabels = Omit<(typeof STRINGS)["en"], "modes"> & { modes: Record<string, string> };
type LabelOverrides = Partial<Omit<SemanticSearchLabels, "modes" | "fields" | "levels">> & {
  modes?: Record<string, string>;
  fields?: Partial<Record<SemanticFacetField, string>>;
  levels?: Partial<Record<ScoreLevel, string>>;
};

/* ------------------------------------------------------------------ types */

export interface SemanticHit {
  id: string;
  /** The retrieved text. */
  content: string;
  /** Similarity from 0 to 1. */
  score: number;
  /** A collection or network the hit lives in. Shown left-to-right. */
  group?: string;
  /** What kind of memory it is: fact, note, document. */
  kind?: string;
  /** Where it came from: `slack`, `notion`, `upload`. */
  source?: string;
  /** The exact place in that source: a page, a file name. */
  sourceRef?: string;
  /** 0 to 1. */
  importance?: number;
  /** The entity the search went through to find this hit. */
  viaEntity?: string;
}

export interface SemanticSearchOptions {
  mode: string;
  limit: number;
}

export interface SemanticSearchProps extends Omit<ComponentProps<"section">, "children" | "onSubmit" | "contextMenu" | "results"> {
  /** The hits of the last search. Facets are built from these. */
  results?: readonly SemanticHit[];
  /** A search is running. */
  searching?: boolean;
  error?: string;
  onRetry?: () => void;
  /** Run a search. Set `results` when it finishes. */
  onSearch: (query: string, options: SemanticSearchOptions) => void | Promise<void>;
  /** Open a hit (its full memory, its source). Adds the "Open" button and the context menu item. */
  onOpen?: (hit: SemanticHit) => void;
  /** Search modes as `id: label`. Default `semantic` and `keyword`. Pass an empty array to hide the switch. */
  modes?: readonly { id: string; label?: string }[];
  defaultMode?: string;
  /** Result limits offered. Default 10, 20, 50. */
  limits?: readonly number[];
  defaultLimit?: number;
  /** Start with this query in the box. */
  defaultQuery?: string;
  /** Show the score bar and number. Default true. */
  showScores?: boolean;
  /** Turn the result context menu off. Default on. */
  contextMenu?: boolean;
  labels?: LabelOverrides;
}

const DEFAULT_MODES = [{ id: "semantic" }, { id: "keyword" }] as const;

function useStrings(labels?: LabelOverrides) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const base = STRINGS[locale.startsWith("ar") ? "ar" : "en"];
  const t = {
    ...base,
    ...labels,
    modes: { ...base.modes, ...labels?.modes } as Record<string, string>,
    fields: { ...base.fields, ...labels?.fields },
    levels: { ...base.levels, ...labels?.levels },
  };
  return { locale, t };
}

function Facet({ label, active, onClick, icon }: { label: ReactNode; active: boolean; onClick: () => void; icon?: ReactNode }) {
  return (
    <Button type="button" size="sm" variant={active ? "primary" : "secondary"} aria-pressed={active} onClick={onClick} className="h-7 px-2.5 text-caption">
      {active ? <Check aria-hidden /> : icon}
      {label}
    </Button>
  );
}

function ScoreBar({ score, locale, t }: { score: number; locale: string; t: ReturnType<typeof useStrings>["t"] }) {
  const value = clamp01(score);
  const figure = formatNumber(value, locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const level = scoreLevel(value);
  return (
    <span className="inline-flex items-center gap-2" title={t.scoreTitle(figure)}>
      <span className="sr-only">{t.score}</span>
      <span aria-hidden className="block h-1 w-12 overflow-hidden rounded-full bg-nq-surface-soft">
        <span className={cn("block h-full rounded-full", level === "weak" ? "bg-nq-line-strong" : "bg-nq-accent")} style={{ width: `${value * 100}%` }} />
      </span>
      <bdi dir="ltr" className="tabular-nums">
        {figure}
      </bdi>
      <span>{t.levels[level]}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ component */

/**
 * A search box for a knowledge base with ranked results. Each hit shows its match text with the query words marked, where
 * it came from, and a similarity score. Facet chips (group, type, source, high importance) narrow the hits on the client.
 */
export function SemanticSearch({
  results,
  searching,
  error,
  onRetry,
  onSearch,
  onOpen,
  modes = DEFAULT_MODES,
  defaultMode,
  limits = [10, 20, 50],
  defaultLimit,
  defaultQuery = "",
  showScores = true,
  contextMenu = true,
  labels,
  className,
  ...props
}: SemanticSearchProps) {
  const { locale, t } = useStrings(labels);
  const [query, setQuery] = useState(defaultQuery);
  const [asked, setAsked] = useState<string | null>(null);
  const [mode, setMode] = useState(defaultMode ?? modes[0]?.id ?? "semantic");
  const [limit, setLimit] = useState(defaultLimit ?? limits[0] ?? 10);
  const [facets, setFacets] = useState<SemanticFacetSelection>(EMPTY_FACETS);
  const [high, setHigh] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const raw = useMemo(() => results ?? [], [results]);
  const facetLists = useMemo(() => SEMANTIC_FACET_FIELDS.map((f) => [f, facetValues(raw, f)] as const), [raw]);
  const shown = useMemo(() => filterHits(raw, facets, high), [raw, facets, high]);
  const filtered = hasFacetFilters(facets, high);
  const ran = asked !== null;

  const clear = () => {
    setFacets(EMPTY_FACETS);
    setHigh(false);
  };

  function submit() {
    const q = query.trim();
    if (!q || searching) return;
    clear();
    setAsked(q);
    void onSearch(q, { mode, limit });
  }

  async function copy(hit: SemanticHit) {
    try {
      await navigator.clipboard?.writeText(hit.content);
    } catch {
      /* clipboard can be blocked; the label still confirms the intent */
    }
    setCopied(hit.id);
    setTimeout(() => setCopied((c) => (c === hit.id ? null : c)), 1600);
  }

  const actionsFor = (hit: SemanticHit): ContextMenuAction[] => [
    ...(onOpen ? [{ id: "open", label: t.open, icon: Search, onSelect: () => onOpen(hit) }] : []),
    { id: "copy", label: t.copy, icon: Copy, onSelect: () => void copy(hit) },
  ];

  return (
    <section data-slot="semantic-search" aria-label={t.label} className={cn("flex min-w-0 flex-col gap-4", className)} {...props}>
      <form
        className="flex flex-col gap-3"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {modes.length > 0 || limits.length > 1 ? (
          <div className="flex flex-wrap items-center gap-2">
            {modes.length > 0 ? (
              <div role="group" aria-label={t.mode} className="flex flex-wrap items-center gap-1.5">
                {modes.map((m, i) => (
                  <Button
                    key={m.id}
                    type="button"
                    size="sm"
                    variant={mode === m.id ? "primary" : "secondary"}
                    aria-pressed={mode === m.id}
                    onClick={() => setMode(m.id)}
                  >
                    {i === 0 ? <Sparkles aria-hidden /> : <Search aria-hidden />}
                    {m.label ?? t.modes[m.id] ?? m.id}
                  </Button>
                ))}
              </div>
            ) : null}
            {limits.length > 1 ? (
              <div role="group" aria-label={t.limit} className="ms-auto flex items-center gap-1.5">
                <span className="text-caption text-muted-foreground">{t.limit}</span>
                {limits.map((n) => (
                  <Button key={n} type="button" size="sm" variant={limit === n ? "primary" : "ghost"} aria-pressed={limit === n} onClick={() => setLimit(n)} className="h-7 px-2 tabular-nums">
                    {formatNumber(n, locale)}
                  </Button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search aria-hidden className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input dir="auto" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.placeholder} aria-label={t.placeholder} className="ps-9" />
          </div>
          <Button type="submit" variant="primary" loading={searching} disabled={!query.trim()}>
            {searching ? t.searching : t.search}
          </Button>
        </div>
      </form>

      {raw.length > 0 && !searching ? (
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t.tune}>
          <span className="me-1 inline-flex items-center gap-1.5 text-caption text-muted-foreground">
            <SlidersHorizontal aria-hidden className="size-3.5" />
            {t.tune}
          </span>
          {facetLists.map(([field, values]) =>
            values.length > 0 ? (
              <span key={field} role="group" aria-label={t.fields[field]} className="flex flex-wrap items-center gap-1.5 border-s border-border ps-2 first:border-s-0 first:ps-0">
                {values.map(({ value }) => (
                  <Facet
                    key={value}
                    label={
                      <bdi dir="ltr" className="font-mono text-[12px]">
                        {value}
                      </bdi>
                    }
                    active={facets[field].has(value)}
                    onClick={() => setFacets((f) => ({ ...f, [field]: toggleInSet(f[field], value) }))}
                  />
                ))}
              </span>
            ) : null,
          )}
          {raw.some((h) => h.importance !== undefined) ? (
            <span className="border-s border-border ps-2">
              <Facet label={t.highImportance} icon={<Star aria-hidden />} active={high} onClick={() => setHigh((v) => !v)} />
            </span>
          ) : null}
          {filtered ? (
            <Button type="button" size="sm" variant="ghost" className="ms-auto h-7" onClick={clear}>
              <X aria-hidden />
              {t.clear}
            </Button>
          ) : null}
        </div>
      ) : null}

      {searching ? (
        <div role="status" aria-live="polite" className="flex flex-col gap-3 rounded-card border border-border bg-card p-4">
          <span className="sr-only">{t.loading}</span>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState title={error} actions={onRetry ? <Button onClick={onRetry}>{t.retry}</Button> : undefined} />
      ) : !ran && raw.length === 0 ? (
        <p className="py-6 text-center text-body-sm text-muted-foreground">{t.idle}</p>
      ) : raw.length === 0 ? (
        <EmptyState icon={Search} title={t.none(asked ?? query)} description={t.noneHint} />
      ) : shown.length === 0 ? (
        <p className="py-6 text-center text-body-sm text-muted-foreground">{t.allFiltered(formatNumber(raw.length, locale))}</p>
      ) : (
        <div className="flex flex-col gap-2">
          <p role="status" aria-live="polite" className="text-caption text-muted-foreground">
            {filtered ? t.countOf(formatNumber(shown.length, locale), formatNumber(raw.length, locale)) : shown.length === 1 ? t.countOne : t.countMany(formatNumber(shown.length, locale))}
          </p>
          <ol className="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
            {shown.map((hit) => (
              <ContextMenuActions key={hit.id} actions={contextMenu ? actionsFor(hit) : []} render={<li className="flex flex-col gap-2 px-4 py-3" />}>
                <div className="flex items-start gap-3">
                  <p dir="auto" className="line-clamp-4 min-w-0 flex-1 whitespace-pre-wrap text-body text-foreground">
                    {highlightParts(hit.content, asked ?? query).map((part, i) =>
                      part.match ? (
                        <mark key={i} className="rounded-[3px] bg-nq-accent/20 px-0.5 text-inherit">
                          {part.text}
                        </mark>
                      ) : (
                        <span key={i}>{part.text}</span>
                      ),
                    )}
                  </p>
                  {onOpen ? (
                    <Button size="sm" className="shrink-0" onClick={() => onOpen(hit)}>
                      {t.open}
                    </Button>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-caption text-muted-foreground">
                  {hit.group || hit.kind ? (
                    <Badge variant="outline" dir="ltr" className="font-mono">
                      {[hit.group, hit.kind].filter(Boolean).join(" · ")}
                    </Badge>
                  ) : null}
                  {hit.source ? (
                    <bdi dir="ltr" className="max-w-56 truncate font-mono">
                      {hit.source}
                      {hit.sourceRef ? ` · ${hit.sourceRef}` : ""}
                    </bdi>
                  ) : null}
                  {hit.viaEntity ? <span className="text-nq-accent-text">{t.via(hit.viaEntity)}</span> : null}
                  <span className="ms-auto flex flex-wrap items-center gap-3">
                    {copied === hit.id ? <span role="status">{t.copied}</span> : null}
                    {showScores ? <ScoreBar score={hit.score} locale={locale} t={t} /> : null}
                    {hit.importance !== undefined ? (
                      <span>{t.importance(formatNumber(clamp01(hit.importance), locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}</span>
                    ) : null}
                  </span>
                </div>
              </ContextMenuActions>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
