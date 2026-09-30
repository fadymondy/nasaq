"use client";

import { Check, CircleDashed, RotateCcw, X } from "lucide-react";
import { type ComponentProps, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Button } from "../button";
import { type ContextMenuAction, ContextMenuActions } from "../context-menu";
import { DateTime, formatNumber } from "../numeric";
import { EmptyState, ErrorState, LoadingState } from "../states";
import { Status, type StatusTone } from "../status";
import { Toggle, ToggleGroup } from "../toggle-group";
import { gapCounts, gapTransitions, groupGaps, hitShare, KNOWLEDGE_GAP_ORDER, type KnowledgeGapStatus } from "./knowledge-gaps-math";

export type { KnowledgeGapStatus } from "./knowledge-gaps-math";

/* ------------------------------------------------------------------ strings */

const STRINGS = {
  en: {
    label: "Knowledge gaps",
    filter: "Filter by status",
    all: "All",
    statuses: { open: "Open", indexed: "Indexed", dismissed: "Dismissed" },
    count: (n: string) => `${n} unanswered`,
    asked: (n: string, count: number) => (count === 1 ? `Asked ${n} time` : `Asked ${n} times`),
    firstSeen: "First asked",
    lastSeen: "Last asked",
    markIndexed: "Mark as indexed",
    dismiss: "Dismiss",
    reopen: "Reopen",
    resolved: { open: "Reopened.", indexed: "Marked as indexed.", dismissed: "Dismissed." },
    failed: "The change could not be saved. Try again.",
    empty: "No unanswered questions",
    emptyHint: "When the brain cannot answer a question, it shows up here so you can add what is missing.",
    emptyFiltered: "Nothing with this status",
    loading: "Loading gaps",
    retry: "Try again",
  },
  ar: {
    label: "فجوات المعرفة",
    filter: "تصفية حسب الحالة",
    all: "الكل",
    statuses: { open: "مفتوحة", indexed: "مفهرسة", dismissed: "مستبعدة" },
    count: (n: string) => `${n} بلا إجابة`,
    asked: (n: string, count: number) => (count === 1 ? "سُئل مرة واحدة" : count === 2 ? "سُئل مرتين" : `سُئل ${n} مرات`),
    firstSeen: "أول مرة",
    lastSeen: "آخر مرة",
    markIndexed: "تحديد كمفهرس",
    dismiss: "استبعاد",
    reopen: "إعادة فتح",
    resolved: { open: "أُعيد فتحه.", indexed: "تم تحديده كمفهرس.", dismissed: "تم استبعاده." },
    failed: "تعذر حفظ التغيير. حاول مرة أخرى.",
    empty: "لا توجد أسئلة بلا إجابة",
    emptyHint: "عندما يعجز العقل عن الإجابة عن سؤال، يظهر هنا لتضيف ما ينقصه.",
    emptyFiltered: "لا شيء بهذه الحالة",
    loading: "جارٍ تحميل الفجوات",
    retry: "إعادة المحاولة",
  },
};

export type KnowledgeGapsLabels = Omit<typeof STRINGS.en, "statuses" | "resolved"> & {
  statuses: Record<KnowledgeGapStatus, string>;
  resolved: Record<KnowledgeGapStatus, string>;
};
type LabelOverrides = Partial<Omit<KnowledgeGapsLabels, "statuses" | "resolved">> & {
  statuses?: Partial<KnowledgeGapsLabels["statuses"]>;
  resolved?: Partial<KnowledgeGapsLabels["resolved"]>;
};

/* ------------------------------------------------------------------ types */

export interface KnowledgeGap {
  id: string;
  /** The question nobody could answer, as it was asked. */
  query: string;
  /** How many times it was asked. */
  hits: number;
  firstSeen: Date | string | number;
  lastSeen: Date | string | number;
  status: KnowledgeGapStatus;
  /** A note on how it was handled, shown in quotes. */
  resolution?: string;
}

export type KnowledgeGapResult = void | { error?: string };

export interface KnowledgeGapsProps extends Omit<ComponentProps<"section">, "children" | "onChange" | "contextMenu"> {
  gaps: readonly KnowledgeGap[];
  /** Status filter (controlled): a status, or "" for all. */
  status?: KnowledgeGapStatus | "";
  defaultStatus?: KnowledgeGapStatus | "";
  onStatusChange?: (status: KnowledgeGapStatus | "") => void;
  /** Move a gap to a new status. Return `{ error }` (or throw) to keep it where it is and show the message. */
  onResolve?: (gap: KnowledgeGap, status: KnowledgeGapStatus) => Promise<KnowledgeGapResult> | KnowledgeGapResult;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  /** Turn the row context menu off. Default on. */
  contextMenu?: boolean;
  labels?: LabelOverrides;
}

const TONE: Record<KnowledgeGapStatus, StatusTone> = { open: "warning", indexed: "success", dismissed: "neutral" };
const ACTION_ICON = { open: RotateCcw, indexed: Check, dismissed: X } as const;

function useStrings(labels?: LabelOverrides) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const base = STRINGS[locale.startsWith("ar") ? "ar" : "en"];
  const t: KnowledgeGapsLabels = {
    ...base,
    ...labels,
    statuses: { ...base.statuses, ...labels?.statuses },
    resolved: { ...base.resolved, ...labels?.resolved },
  };
  return { locale, t };
}

/* ------------------------------------------------------------------ component */

/**
 * Questions the brain could not answer, grouped as open, indexed and dismissed, most asked first. Each row can be marked
 * indexed once the missing knowledge is added, dismissed, or reopened, from buttons or the context menu.
 */
export function KnowledgeGaps({
  gaps,
  status: statusProp,
  defaultStatus = "",
  onStatusChange,
  onResolve,
  loading,
  error,
  onRetry,
  contextMenu = true,
  labels,
  className,
  ...props
}: KnowledgeGapsProps) {
  const { locale, t } = useStrings(labels);
  const [inner, setInner] = useState<KnowledgeGapStatus | "">(defaultStatus);
  const status = statusProp ?? inner;
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const grouped = useMemo(() => groupGaps(gaps), [gaps]);
  const counts = useMemo(() => gapCounts(gaps), [gaps]);
  const max = useMemo(() => Math.max(0, ...gaps.map((g) => g.hits)), [gaps]);
  const visible = status ? [status] : KNOWLEDGE_GAP_ORDER;
  const shown = visible.reduce((n, s) => n + grouped[s].length, 0);

  const setStatus = (next: KnowledgeGapStatus | "") => {
    setInner(next);
    onStatusChange?.(next);
  };

  async function resolve(gap: KnowledgeGap, next: KnowledgeGapStatus) {
    if (busy || !onResolve) return;
    setBusy(`${gap.id}:${next}`);
    setMessage(null);
    try {
      const result = await onResolve(gap, next);
      if (result && result.error) setMessage({ tone: "error", text: result.error });
      else setMessage({ tone: "ok", text: t.resolved[next] });
    } catch (e) {
      setMessage({ tone: "error", text: e instanceof Error && e.message ? e.message : t.failed });
    } finally {
      setBusy(null);
    }
  }

  const actionLabel = (s: KnowledgeGapStatus) => (s === "indexed" ? t.markIndexed : s === "dismissed" ? t.dismiss : t.reopen);
  const actionsFor = (gap: KnowledgeGap): ContextMenuAction[] =>
    gapTransitions(gap.status).map((s) => ({
      id: s,
      label: actionLabel(s),
      icon: ACTION_ICON[s],
      disabled: busy !== null,
      onSelect: () => void resolve(gap, s),
    }));

  const total = gaps.length;

  return (
    <section data-slot="knowledge-gaps" aria-label={t.label} className={cn("flex min-w-0 flex-col gap-4", className)} {...props}>
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup
          aria-label={t.filter}
          value={[status || "all"]}
          onValueChange={(v: string[]) => {
            const next = v[0];
            if (next) setStatus(next === "all" ? "" : (next as KnowledgeGapStatus));
          }}
        >
          <Toggle value="all">{t.all}</Toggle>
          {KNOWLEDGE_GAP_ORDER.map((s) => (
            <Toggle key={s} value={s}>
              {t.statuses[s]}
              <span className="ms-1.5 tabular-nums text-muted-foreground">{formatNumber(counts[s], locale)}</span>
            </Toggle>
          ))}
        </ToggleGroup>
        {counts.open > 0 ? <span className="ms-auto text-caption text-muted-foreground">{t.count(formatNumber(counts.open, locale))}</span> : null}
      </div>

      <p role="status" aria-live="polite" className={cn("min-h-5 text-body-sm", message?.tone === "error" ? "text-nq-danger-text" : "text-muted-foreground")}>
        {message?.text ?? ""}
      </p>

      {error ? (
        <ErrorState title={error} actions={onRetry ? <Button onClick={onRetry}>{t.retry}</Button> : undefined} />
      ) : loading ? (
        <LoadingState label={t.loading} rows={4} />
      ) : total === 0 ? (
        <EmptyState icon={CircleDashed} title={t.empty} description={t.emptyHint} />
      ) : shown === 0 ? (
        <EmptyState icon={CircleDashed} title={t.emptyFiltered} />
      ) : (
        visible.map((s) => {
          const rows = grouped[s];
          if (rows.length === 0) return null;
          return (
            <div key={s} data-status={s} className="flex flex-col gap-2">
              <h3 className="flex items-center gap-2 text-label text-foreground">
                <Status tone={TONE[s]}>{t.statuses[s]}</Status>
                <span className="text-caption tabular-nums text-muted-foreground">{formatNumber(rows.length, locale)}</span>
              </h3>
              <ul aria-label={t.statuses[s]} className="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
                {rows.map((gap) => (
                  <ContextMenuActions
                    key={gap.id}
                    actions={contextMenu && onResolve ? actionsFor(gap) : []}
                    render={<li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3" />}
                  >
                    <div className="min-w-0 flex-1">
                      <p dir="auto" title={gap.query} className="truncate text-label text-foreground">
                        {gap.query}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
                        <span className="inline-flex items-center gap-2">
                          <span aria-hidden className="block h-1 w-10 overflow-hidden rounded-full bg-nq-surface-soft">
                            <span className="block h-full rounded-full bg-nq-accent" style={{ width: `${Math.max(8, hitShare(gap.hits, max) * 100)}%` }} />
                          </span>
                          {t.asked(formatNumber(gap.hits, locale), gap.hits)}
                        </span>
                        <span>
                          {t.firstSeen} <DateTime value={gap.firstSeen} />
                        </span>
                        <span>
                          {t.lastSeen} <DateTime value={gap.lastSeen} relative />
                        </span>
                      </p>
                      {gap.resolution ? (
                        <p dir="auto" className="mt-1 text-body-sm italic text-muted-foreground">
                          “{gap.resolution}”
                        </p>
                      ) : null}
                    </div>
                    {onResolve ? (
                      <div className="flex shrink-0 flex-wrap gap-1.5">
                        {gapTransitions(gap.status).map((next) => {
                          const Icon = ACTION_ICON[next];
                          return (
                            <Button
                              key={next}
                              size="sm"
                              variant={next === "dismissed" ? "ghost" : "secondary"}
                              disabled={busy !== null && busy !== `${gap.id}:${next}`}
                              loading={busy === `${gap.id}:${next}`}
                              onClick={() => void resolve(gap, next)}
                            >
                              <Icon aria-hidden />
                              {actionLabel(next)}
                            </Button>
                          );
                        })}
                      </div>
                    ) : null}
                  </ContextMenuActions>
                ))}
              </ul>
            </div>
          );
        })
      )}
    </section>
  );
}
