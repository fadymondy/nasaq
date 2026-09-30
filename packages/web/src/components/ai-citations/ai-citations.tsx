"use client";

import { ChevronDown, ExternalLink, FileText, Quote, ShieldCheck, ShieldQuestion } from "lucide-react";
import { type ComponentProps, type ReactNode, useId, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { AiConfidenceMeter, AiFeedback, AiGeneratedLabel } from "../ai-states";
import { Badge } from "../badge";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "../collapsible";
import { hostOf, isSafeUrl } from "../copilot-chat";
import { Markdown } from "../markdown";
import { DateTime, Num } from "../numeric";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";
import { Progress } from "../progress";
import { citationCoverage, citedNumbers, latencyParts, linkCitations, parseCitationHref, splitHighlight } from "./ai-citations-logic";

export {
  citationCoverage,
  citationHref,
  citedNumbers,
  latencyParts,
  linkCitations,
  markerNumbers,
  parseCitationHref,
  splitHighlight,
  type HighlightPart,
} from "./ai-citations-logic";

const STRINGS = {
  en: {
    citation: (n: number, title: string) => `Source ${n}: ${title}`,
    sources: "Sources",
    sourcesLabel: "Sources cited",
    evidence: "Evidence",
    showEvidence: "Show evidence",
    hideEvidence: "Hide evidence",
    excerpt: "Excerpt from the source",
    noExcerpt: "No excerpt for this source",
    relevance: "Relevance",
    openSource: "Open source",
    notCited: "Not cited",
    provenance: "How this answer was made",
    grounded: "Grounded in sources",
    groundedIn: (n: number) => (n === 1 ? "Grounded in 1 source" : `Grounded in ${n} sources`),
    ungrounded: "Not grounded, from model knowledge",
    model: "Model",
    latency: "Response time",
    tokens: "Tokens",
    tokensIn: "in",
    tokensOut: "out",
    generatedAt: "Generated",
    retrieved: "Passages retrieved",
    coverage: (cited: number, total: number) => `${cited} of ${total} paragraphs cite a source.`,
    partlyCited: "Some statements have no source. Check them before you rely on them.",
  },
  ar: {
    citation: (n: number, title: string) => `المصدر ${n}: ${title}`,
    sources: "المصادر",
    sourcesLabel: "المصادر المذكورة",
    evidence: "الأدلة",
    showEvidence: "عرض الأدلة",
    hideEvidence: "إخفاء الأدلة",
    excerpt: "مقتطف من المصدر",
    noExcerpt: "لا يوجد مقتطف لهذا المصدر",
    relevance: "الصلة",
    openSource: "فتح المصدر",
    notCited: "غير مذكور",
    provenance: "كيف أُعدّت هذه الإجابة",
    grounded: "مبنية على مصادر",
    groundedIn: (n: number) => (n === 1 ? "مبنية على مصدر واحد" : n === 2 ? "مبنية على مصدرين" : `مبنية على ${n} مصادر`),
    ungrounded: "غير مبنية على مصادر، من معرفة النموذج",
    model: "النموذج",
    latency: "زمن الاستجابة",
    tokens: "الرموز",
    tokensIn: "دخل",
    tokensOut: "خرج",
    generatedAt: "وقت التوليد",
    retrieved: "المقاطع المسترجعة",
    coverage: (cited: number, total: number) => `${cited} من ${total} فقرات تذكر مصدرًا.`,
    partlyCited: "بعض العبارات بلا مصدر. تحقق منها قبل الاعتماد عليها.",
  },
};

export type AiCitationsLabels = (typeof STRINGS)["en"];

function useLabels(labels?: Partial<AiCitationsLabels>): AiCitationsLabels {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  return { ...STRINGS[ar ? "ar" : "en"], ...labels };
}

/** One thing an answer can point at. `snippet` is used as the excerpt when there is no `quote`. */
export interface AiCitationSource {
  id: string;
  title: string;
  /** Only http(s) links become clickable. */
  url?: string;
  /** The passage the answer relied on. */
  quote?: string;
  snippet?: string;
  /** Where in the source: "p. 4", "section 2.1", "00:14:30". Kept left to right. */
  locator?: string;
  /** Free kind such as "PDF", "Web", "Ticket". Shown as a small badge. */
  kind?: string;
  /** How relevant the passage was, 0 to 1. */
  score?: number;
  /** Words inside the quote to mark, e.g. the ones the answer used. */
  highlight?: string | readonly string[];
}

/* ------------------------------------------------------------------ evidence card */

export interface AiEvidenceCardProps extends Omit<ComponentProps<"div">, "children"> {
  source: AiCitationSource;
  /** 1-based number shown in the corner, matching the `[n]` in the text. */
  index?: number;
  /** Highlights the card, for example while its marker is hovered. */
  active?: boolean;
  /** Hide the relevance bar and the open link (used inside a popover). */
  compact?: boolean;
  labels?: Partial<AiCitationsLabels>;
}

/** A source with the passage the answer used. The quote is plain text with matches marked, never HTML. */
export function AiEvidenceCard({ source, index, active, compact, labels, className, ...props }: AiEvidenceCardProps) {
  const t = useLabels(labels);
  const quote = source.quote ?? source.snippet;
  const parts = useMemo(() => splitHighlight(quote ?? "", source.highlight as string | readonly string[] | undefined), [quote, source.highlight]);
  const safe = isSafeUrl(source.url);
  const score = source.score === undefined ? undefined : Math.min(1, Math.max(0, source.score));
  return (
    <div
      data-slot="ai-evidence-card"
      data-active={active ? "" : undefined}
      className={cn(
        "flex min-w-0 flex-col gap-2 rounded-control border border-border bg-card p-3 text-start transition-colors duration-150 ease-nq",
        active && "border-nq-accent bg-nq-hover",
        className,
      )}
      {...props}
    >
      <div className="flex items-start gap-2">
        {index !== undefined ? (
          <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-secondary text-[11px] tabular-nums text-foreground">
            <Num value={index} />
          </span>
        ) : (
          <FileText aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <span dir="auto" className="text-body-sm font-medium text-foreground">
            {source.title}
          </span>
          <span className="flex flex-wrap items-center gap-x-2 text-caption text-muted-foreground">
            {hostOf(source.url) ? <bdi dir="ltr">{hostOf(source.url)}</bdi> : null}
            {source.locator ? <bdi dir="ltr">{source.locator}</bdi> : null}
          </span>
        </div>
        {source.kind ? <Badge variant="outline">{source.kind}</Badge> : null}
      </div>
      <figure className="flex flex-col gap-1">
        <figcaption className="sr-only">{t.excerpt}</figcaption>
        {quote ? (
          <blockquote dir="auto" className="flex gap-2 border-s-2 border-nq-line-strong ps-3 text-body-sm text-nq-fg-body">
            <Quote aria-hidden className="mt-0.5 size-3.5 shrink-0 text-muted-foreground rtl:-scale-x-100" />
            <span>
              {parts.map((p, i) =>
                p.hit ? (
                  <mark key={i} className="rounded-[2px] bg-nq-accent/20 px-0.5 text-foreground">
                    {p.text}
                  </mark>
                ) : (
                  <span key={i}>{p.text}</span>
                ),
              )}
            </span>
          </blockquote>
        ) : (
          <p className="text-caption text-muted-foreground">{t.noExcerpt}</p>
        )}
      </figure>
      {!compact && (score !== undefined || safe) ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-caption text-muted-foreground">
          {score !== undefined ? (
            <span className="flex items-center gap-2">
              {t.relevance}
              <Progress value={Math.round(score * 100)} size="sm" aria-label={t.relevance} className="w-14" />
              <span className="text-foreground">
                <Num value={score} format={{ style: "percent" }} />
              </span>
            </span>
          ) : (
            <span />
          )}
          {safe ? (
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-[2px] text-foreground underline decoration-nq-line-strong underline-offset-4 outline-none hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus"
            >
              {t.openSource}
              <ExternalLink aria-hidden className="size-3 rtl:-scale-x-100" />
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ marker */

function CitationMarker({
  n,
  source,
  active,
  onActiveChange,
  labels,
}: {
  n: number;
  source: AiCitationSource;
  active: boolean;
  onActiveChange?: (id: string | null) => void;
  labels?: Partial<AiCitationsLabels>;
}) {
  const t = useLabels(labels);
  return (
    <Popover onOpenChange={(open) => onActiveChange?.(open ? source.id : null)}>
      <PopoverTrigger
        openOnHover
        delay={150}
        aria-label={t.citation(n, source.title)}
        data-slot="ai-citation-marker"
        data-active={active ? "" : undefined}
        className={cn(
          "mx-0.5 inline-grid h-4 min-w-4 -translate-y-0.5 place-items-center rounded-full border border-border bg-secondary px-1 align-middle text-[10px] leading-none tabular-nums text-foreground",
          "cursor-pointer outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-nq-focus",
          "data-active:border-nq-accent data-active:bg-nq-accent/15 data-popup-open:border-nq-accent",
        )}
      >
        <Num value={n} />
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" side="top">
        <AiEvidenceCard source={source} index={n} compact labels={labels} className="border-0 bg-transparent" />
      </PopoverContent>
    </Popover>
  );
}

/* ------------------------------------------------------------------ cited text */

export interface AiCitedTextProps extends Omit<ComponentProps<"div">, "children"> {
  /** Markdown that may hold `[1]`, `[1, 2]` or `[2-4]` markers. Numbers point into `sources` (1-based). */
  text: string;
  sources: readonly AiCitationSource[];
  /** The source whose marker is open or hovered. Controlled by `AiCitedAnswer`, or by you. */
  activeId?: string | null;
  onActiveChange?: (id: string | null) => void;
  labels?: Partial<AiCitationsLabels>;
}

/**
 * Renders an answer with `[n]` markers as small buttons. Hover, focus or press one to see the passage behind it.
 * Markdown is rendered by `Markdown` (raw HTML dropped), and a number with no source stays as plain text.
 */
export function AiCitedText({ text, sources, activeId, onActiveChange, labels, className, ...props }: AiCitedTextProps) {
  const linked = useMemo(() => linkCitations(text, sources.length), [text, sources.length]);
  // The link renderer must keep the same identity between renders, or every marker remounts and its popover closes.
  const latest = useRef({ sources, activeId, onActiveChange, labels });
  latest.current = { sources, activeId, onActiveChange, labels };
  const components = useMemo<ComponentProps<typeof Markdown>["components"]>(
    () => ({
        a: ({ node: _n, href, children, className: cls, ...rest }) => {
          const { sources: list, activeId: current, onActiveChange: change, labels: l } = latest.current;
          const n = parseCitationHref(href);
          const source = n ? list[n - 1] : undefined;
          if (n && source) return <CitationMarker n={n} source={source} active={current === source.id} onActiveChange={change} labels={l} />;
          const external = typeof href === "string" && /^https?:\/\//i.test(href);
          return (
            <a
              href={href}
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className={cn(
                "rounded-[2px] text-foreground underline decoration-nq-line-strong underline-offset-4 outline-none hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
                cls,
              )}
              {...rest}
            >
              {children}
            </a>
          );
        },
    }),
    [],
  );
  return (
    <Markdown data-slot="ai-cited-text" className={className} {...props} components={components}>
      {linked}
    </Markdown>
  );
}

/* ------------------------------------------------------------------ chips */

export interface AiSourceChipsProps extends Omit<ComponentProps<"div">, "children" | "onSelect"> {
  sources: readonly AiCitationSource[];
  /** Source ids the text cites. Sources not in it are dimmed and marked not cited. Omit to treat all as cited. */
  citedIds?: readonly string[];
  activeId?: string | null;
  onActiveChange?: (id: string | null) => void;
  /** Called when a chip is pressed. Without it, a chip with a safe url is a link. */
  onSelect?: (source: AiCitationSource, index: number) => void;
  label?: string;
  labels?: Partial<AiCitationsLabels>;
}

/** A row of numbered source chips with the host underneath. Hovering one lights the matching marker and evidence card. */
export function AiSourceChips({ sources, citedIds, activeId, onActiveChange, onSelect, label, labels, className, ...props }: AiSourceChipsProps) {
  const t = useLabels(labels);
  if (sources.length === 0) return null;
  return (
    <div data-slot="ai-source-chips" role="group" aria-label={label ?? t.sourcesLabel} className={cn("flex flex-col gap-1.5", className)} {...props}>
      <span className="text-caption text-muted-foreground">{label ?? t.sources}</span>
      <ol className="flex flex-wrap gap-2">
        {sources.map((s, i) => {
          const cited = !citedIds || citedIds.includes(s.id);
          const cls = cn(
            "flex max-w-56 items-center gap-2 rounded-control border border-border bg-card px-2 py-1.5 text-start outline-none transition-colors duration-150 ease-nq",
            "hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus",
            activeId === s.id && "border-nq-accent bg-nq-hover",
            !cited && "opacity-60",
          );
          const body = (
            <>
              <span className="grid size-4 shrink-0 place-items-center rounded-full bg-secondary text-[10px] tabular-nums text-muted-foreground">
                <Num value={i + 1} />
              </span>
              <span className="flex min-w-0 flex-col">
                <span dir="auto" className="truncate text-caption text-foreground">
                  {s.title}
                </span>
                {hostOf(s.url) ? (
                  <bdi dir="ltr" className="truncate text-[11px] text-muted-foreground">
                    {hostOf(s.url)}
                  </bdi>
                ) : null}
                {!cited ? <span className="text-[11px] text-muted-foreground">{t.notCited}</span> : null}
              </span>
            </>
          );
          const hover = {
            onMouseEnter: () => onActiveChange?.(s.id),
            onMouseLeave: () => onActiveChange?.(null),
            onFocus: () => onActiveChange?.(s.id),
            onBlur: () => onActiveChange?.(null),
          };
          return (
            <li key={s.id} className="min-w-0">
              {onSelect ? (
                <button type="button" data-active={activeId === s.id ? "" : undefined} onClick={() => onSelect(s, i)} className={cls} {...hover}>
                  {body}
                </button>
              ) : isSafeUrl(s.url) ? (
                <a href={s.url} target="_blank" rel="noopener noreferrer" className={cls} {...hover}>
                  {body}
                </a>
              ) : (
                <span className={cls} {...hover}>
                  {body}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------------ provenance */

export interface AiProvenanceInfo {
  /** Model name, kept left to right. */
  model?: string;
  latencyMs?: number;
  /** Whether the answer was built from retrieved sources. */
  grounded?: boolean;
  /** How many sources it used. Shown when grounded. */
  sourceCount?: number;
  tokens?: { input?: number; output?: number };
  /** Passages the retriever returned before ranking. */
  retrieved?: number;
  at?: Date | number | string;
  /** 0 to 1. */
  confidence?: number;
  /** Extra rows, for example `{ label: "Index", value: "docs-v3" }`. */
  extra?: readonly { label: ReactNode; value: ReactNode }[];
}

export interface AiProvenanceProps extends Omit<ComponentProps<"div">, "children">, AiProvenanceInfo {
  /** Start with the details open. */
  defaultOpen?: boolean;
  labels?: Partial<AiCitationsLabels>;
}

function LatencyText({ ms }: { ms: number }) {
  const { value, unit } = latencyParts(ms);
  return <Num value={value} format={{ style: "unit", unit: unit === "s" ? "second" : "millisecond", unitDisplay: "narrow", maximumFractionDigits: 1 }} />;
}

/**
 * Where an answer came from: model, response time and whether it is grounded in sources. One quiet line that opens
 * to the full list. Nothing here is guessed, you pass what your backend knows.
 */
export function AiProvenance({
  model,
  latencyMs,
  grounded,
  sourceCount,
  tokens,
  retrieved,
  at,
  confidence,
  extra,
  defaultOpen = false,
  labels,
  className,
  ...props
}: AiProvenanceProps) {
  const t = useLabels(labels);
  const [open, setOpen] = useState(defaultOpen);
  const groundedText = grounded === undefined ? null : grounded ? (sourceCount !== undefined ? t.groundedIn(sourceCount) : t.grounded) : t.ungrounded;
  const rows: { label: ReactNode; value: ReactNode }[] = [];
  if (model) rows.push({ label: t.model, value: <bdi dir="ltr">{model}</bdi> });
  if (latencyMs !== undefined) rows.push({ label: t.latency, value: <LatencyText ms={latencyMs} /> });
  if (tokens && (tokens.input !== undefined || tokens.output !== undefined)) {
    rows.push({
      label: t.tokens,
      value: (
        <span className="flex flex-wrap gap-x-3">
          {tokens.input !== undefined ? (
            <span>
              <Num value={tokens.input} /> {t.tokensIn}
            </span>
          ) : null}
          {tokens.output !== undefined ? (
            <span>
              <Num value={tokens.output} /> {t.tokensOut}
            </span>
          ) : null}
        </span>
      ),
    });
  }
  if (retrieved !== undefined) rows.push({ label: t.retrieved, value: <Num value={retrieved} /> });
  if (at !== undefined) rows.push({ label: t.generatedAt, value: <DateTime value={at} format={{ dateStyle: "medium", timeStyle: "short" }} /> });
  for (const r of extra ?? []) rows.push(r);
  return (
    <Collapsible open={open} onOpenChange={setOpen} data-slot="ai-provenance" className={cn("rounded-control border border-border bg-secondary", className)} {...props}>
      <CollapsibleTrigger className="flex min-h-control-sm w-full flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5 text-start text-caption text-muted-foreground outline-none focus-visible:outline-2 focus-visible:outline-nq-focus">
        {grounded === undefined ? null : grounded ? (
          <ShieldCheck aria-hidden className="size-3.5 shrink-0 text-nq-success-text" />
        ) : (
          <ShieldQuestion aria-hidden className="size-3.5 shrink-0 text-nq-warning-text" />
        )}
        <span className="sr-only">{t.provenance}</span>
        {groundedText ? <span className="text-foreground">{groundedText}</span> : null}
        {model ? <bdi dir="ltr">{model}</bdi> : null}
        {latencyMs !== undefined ? <LatencyText ms={latencyMs} /> : null}
        <span className="flex-1" />
        <ChevronDown aria-hidden className={cn("size-3.5 shrink-0 transition-transform duration-150 ease-nq", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsiblePanel>
        <div className="flex flex-col gap-3 border-t border-border px-3 py-2">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-caption">
            {rows.map((r, i) => (
              <div key={i} className="contents">
                <dt className="text-muted-foreground">{r.label}</dt>
                <dd className="min-w-0 text-foreground">{r.value}</dd>
              </div>
            ))}
          </dl>
          {confidence !== undefined ? <AiConfidenceMeter value={confidence} /> : null}
        </div>
      </CollapsiblePanel>
    </Collapsible>
  );
}

/* ------------------------------------------------------------------ cited answer */

export interface AiCitedAnswerProps extends Omit<ComponentProps<"section">, "children"> {
  text: string;
  sources: readonly AiCitationSource[];
  provenance?: AiProvenanceInfo;
  /** Name after the "AI generated" label. Defaults to `provenance.model`. */
  model?: string;
  /** Show the evidence cards under the chips, open. Default closed. */
  defaultEvidenceOpen?: boolean;
  feedback?: "up" | "down" | null;
  onFeedback?: (value: "up" | "down") => void;
  /** Called when a chip is pressed, after the evidence opens. */
  onSourceOpen?: (source: AiCitationSource) => void;
  labels?: Partial<AiCitationsLabels>;
}

/**
 * The whole answer: AI generated label, text with `[n]` markers, source chips, an evidence panel with the quotes,
 * a note when paragraphs have no source, provenance, and thumbs. Marker, chip and card light up together.
 */
export function AiCitedAnswer({
  text,
  sources,
  provenance,
  model,
  defaultEvidenceOpen = false,
  feedback,
  onFeedback,
  onSourceOpen,
  labels,
  className,
  ...props
}: AiCitedAnswerProps) {
  const t = useLabels(labels);
  const uid = useId();
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState(defaultEvidenceOpen);
  const cited = useMemo(() => citedNumbers(text, sources.length), [text, sources.length]);
  const citedIds = useMemo(() => cited.map((n) => (sources[n - 1] as AiCitationSource).id), [cited, sources]);
  const coverage = useMemo(() => citationCoverage(text, sources.length), [text, sources.length]);
  const partly = sources.length > 0 && coverage.total > 0 && coverage.cited < coverage.total;
  const evidence = sources.filter((s) => s.quote || s.snippet);
  const openSource = (s: AiCitationSource) => {
    setOpen(true);
    setActive(s.id);
    onSourceOpen?.(s);
    requestAnimationFrame(() => document.getElementById(`${uid}-ev-${s.id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
  };
  return (
    <section data-slot="ai-cited-answer" className={cn("flex min-w-0 flex-col gap-3", className)} {...props}>
      <div className="flex items-center justify-between gap-2">
        <AiGeneratedLabel model={model ?? provenance?.model} />
        {onFeedback ? <AiFeedback value={feedback} onChange={onFeedback} /> : null}
      </div>
      <AiCitedText text={text} sources={sources} activeId={active} onActiveChange={setActive} labels={labels} />
      {partly ? (
        <p role="note" className="text-caption text-muted-foreground">
          <span className="text-nq-warning-text">{t.coverage(coverage.cited, coverage.total)}</span> {t.partlyCited}
        </p>
      ) : null}
      <AiSourceChips sources={sources} citedIds={citedIds} activeId={active} onActiveChange={setActive} onSelect={evidence.length > 0 ? (s) => openSource(s) : undefined} labels={labels} />
      {evidence.length > 0 ? (
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger className="inline-flex min-h-control-sm items-center gap-1.5 rounded-control text-caption text-muted-foreground outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus">
            <ChevronDown aria-hidden className={cn("size-3.5 transition-transform duration-150 ease-nq", open && "rotate-180")} />
            {open ? t.hideEvidence : t.showEvidence}
          </CollapsibleTrigger>
          <CollapsiblePanel>
            <ul aria-label={t.evidence} className="mt-1 grid gap-2 sm:grid-cols-2">
              {evidence.map((s) => (
                <li key={s.id} id={`${uid}-ev-${s.id}`} className="min-w-0">
                  <AiEvidenceCard source={s} index={sources.indexOf(s) + 1} active={active === s.id} labels={labels} onMouseEnter={() => setActive(s.id)} onMouseLeave={() => setActive(null)} />
                </li>
              ))}
            </ul>
          </CollapsiblePanel>
        </Collapsible>
      ) : null}
      {provenance ? <AiProvenance {...provenance} labels={labels} /> : null}
    </section>
  );
}
