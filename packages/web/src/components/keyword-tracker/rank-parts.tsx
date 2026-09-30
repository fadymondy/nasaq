"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { Alert } from "../alert";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { type DataTableColumn, DataTable, useDataTable } from "../data-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Field, FieldError, FieldLabel, Textarea } from "../field";
import { Num } from "../numeric";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { Toggle, ToggleGroup } from "../toggle-group";
import { KEYWORD_STRINGS, type KeywordTrackerLabels } from "./keyword-labels";
import type { AddKeywordsInput, KeywordCompetitor, KeywordDevice, KeywordLocation, KeywordResult, TrackedKeyword } from "./keyword-types";
import { RANK_BUCKETS, type RankBucket, type RankDistribution as Distribution, type RankPosition, competitorStats, parseKeywordList, rankChange } from "./rank-math";

const BUCKET_BAR: Record<RankBucket, string> = { top3: "bg-nq-success", top10: "bg-nq-info", top100: "bg-nq-warning", unranked: "bg-nq-line-strong" };

/* ------------------------------------------------------------------ change arrow */

export interface RankChangeProps {
  current: RankPosition;
  previous?: RankPosition;
  className?: string;
  labels?: Partial<KeywordTrackerLabels>;
}

/** How a keyword moved: an arrow and the places gained or lost, or New and Lost. Lower positions are better. */
export function RankChange({ current, previous, className, labels }: RankChangeProps) {
  const t = useAnalyticsLabels(KEYWORD_STRINGS, labels);
  const m = rankChange(previous, current);
  if (m.direction === "none") return null;
  if (m.direction === "new") return <Badge variant="info" className={className}>{t.newRank}</Badge>;
  if (m.direction === "lost") return <Badge variant="danger" className={className}>{t.lostRank}</Badge>;
  if (m.direction === "same")
    return (
      <span className={cn("inline-flex items-center gap-0.5 text-caption text-muted-foreground", className)} title={t.same}>
        <Minus aria-hidden className="size-3" />
        <span className="sr-only">{t.same}</span>
      </span>
    );
  const up = m.direction === "up";
  const n = Math.abs(m.delta);
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span data-direction={m.direction} className={cn("inline-flex items-center gap-0.5 text-caption font-medium", up ? "text-nq-success-text" : "text-nq-danger-text", className)} title={up ? t.up(n) : t.down(n)}>
      <Icon aria-hidden className="size-3" />
      <Num value={n} />
      <span className="sr-only">{up ? t.up(n) : t.down(n)}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ distribution */

export interface RankDistributionProps {
  distribution: Distribution;
  title?: ReactNode;
  description?: ReactNode;
  className?: string;
  labels?: Partial<KeywordTrackerLabels>;
}

/** Keywords by ranking band, top 3, 4 to 10, 11 to 100 and not ranking, as one stacked bar with a legend of counts and shares. */
export function RankDistribution({ distribution, title, description, className, labels }: RankDistributionProps) {
  const t = useAnalyticsLabels(KEYWORD_STRINGS, labels);
  const total = distribution.total;
  const pct = (n: number) => (total > 0 ? n / total : 0);
  const fmt = (n: number) => new Intl.NumberFormat("en", { style: "percent", maximumFractionDigits: 0 }).format(pct(n));
  const summary = RANK_BUCKETS.map((b) => t.bucketCount(t.bucket[b], distribution[b], fmt(distribution[b]))).join(". ");
  return (
    <Card data-slot="rank-distribution" className={className}>
      <CardHeader>
        <CardTitle as="h3">{title ?? t.distributionTitle}</CardTitle>
        <CardDescription>{description ?? t.distributionDescription}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div role="img" aria-label={summary} className="flex h-3 w-full overflow-hidden rounded-full bg-nq-surface-soft">
          {RANK_BUCKETS.map((b) =>
            distribution[b] > 0 ? <span key={b} data-bucket={b} className={cn("h-full", BUCKET_BAR[b])} style={{ width: `${pct(distribution[b]) * 100}%` }} /> : null,
          )}
        </div>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-3">
          {RANK_BUCKETS.map((b) => (
            <li key={b} data-bucket={b} className="flex items-start gap-2">
              <span aria-hidden className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", BUCKET_BAR[b])} />
              <div className="flex min-w-0 flex-col leading-tight">
                <span className="text-caption text-muted-foreground">{t.bucket[b]}</span>
                <span className="text-label text-foreground">
                  <Num value={distribution[b]} /> <span className="text-caption font-normal text-muted-foreground"><Num value={pct(distribution[b])} format={{ style: "percent", maximumFractionDigits: 0 }} /></span>
                </span>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ add keywords */

export interface AddKeywordsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locations: readonly KeywordLocation[];
  defaultLocation?: string;
  defaultDevice?: KeywordDevice;
  onAdd: (input: AddKeywordsInput) => Promise<KeywordResult>;
  labels?: Partial<KeywordTrackerLabels>;
}

/** Add keywords to track: one per line or comma separated, with the location and device to check. Duplicates are dropped and counted. */
export function AddKeywordsDialog({ open, onOpenChange, locations, defaultLocation, defaultDevice = "desktop", onAdd, labels }: AddKeywordsDialogProps) {
  const t = useAnalyticsLabels(KEYWORD_STRINGS, labels);
  const [text, setText] = useState("");
  const [location, setLocation] = useState(defaultLocation ?? locations[0]?.value ?? "");
  const [device, setDevice] = useState<KeywordDevice>(defaultDevice);
  const [touched, setTouched] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keywords = useMemo(() => parseKeywordList(text), [text]);
  const invalid = touched && keywords.length === 0;

  async function submit(event: { preventDefault(): void }) {
    event.preventDefault();
    setTouched(true);
    if (keywords.length === 0) return;
    setPending(true);
    setError(null);
    try {
      const out = await onAdd({ keywords, location, device });
      if (out && out.error) setError(out.error);
      else {
        setText("");
        setTouched(false);
        onOpenChange(false);
      }
    } catch {
      setError(t.actionFailed);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent data-slot="add-keywords-dialog" className="max-w-lg">
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{t.addTitle}</DialogTitle>
            <DialogDescription>{t.addBody}</DialogDescription>
          </DialogHeader>
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <Field invalid={invalid}>
            <FieldLabel>{t.keywordsLabel}</FieldLabel>
            <Textarea dir="auto" rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder={t.keywordsPlaceholder} />
            {invalid ? <FieldError match>{t.keywordsRequired}</FieldError> : null}
            <span className="text-caption text-muted-foreground" aria-live="polite">
              {t.keywordCount(keywords.length)}
            </span>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>{t.locationLabel}</FieldLabel>
              <Select items={[...locations]} value={location} onValueChange={(v) => v && setLocation(String(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="flex flex-col gap-1.5">
              <span className="text-label text-foreground">{t.deviceLabel}</span>
              <ToggleGroup value={[device]} onValueChange={(v) => v[0] && setDevice(v[0] as KeywordDevice)} aria-label={t.deviceLabel}>
                <Toggle value="desktop">{t.desktop}</Toggle>
                <Toggle value="mobile">{t.mobile}</Toggle>
              </ToggleGroup>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={pending} onClick={() => onOpenChange(false)}>
              {t.cancel}
            </Button>
            <Button type="submit" variant="primary" loading={pending}>
              {t.addSubmit(keywords.length)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ competitors */

export interface CompetitorComparisonProps {
  keywords: readonly Pick<TrackedKeyword, "id" | "keyword" | "volume">[];
  competitors: readonly KeywordCompetitor[];
  title?: ReactNode;
  description?: ReactNode;
  className?: string;
  labels?: Partial<KeywordTrackerLabels>;
}

const cellPosition = (p: RankPosition | undefined, best: boolean) =>
  p === null || p === undefined ? (
    <span className="text-muted-foreground">-</span>
  ) : (
    <Num value={p} className={cn(best && "font-semibold text-nq-success-text")} />
  );

/** You against your competitors: visibility, average position and top 10 count per domain, then each keyword's rank side by side with the best in green. */
export function CompetitorComparison({ keywords, competitors, title, description, className, labels }: CompetitorComparisonProps) {
  const t = useAnalyticsLabels(KEYWORD_STRINGS, labels);
  const me = competitors.find((c) => c.you);
  const stats = useMemo(() => competitors.map((c) => ({ c, s: competitorStats(c.ranks, keywords, me && c !== me ? me.ranks : undefined) })), [competitors, keywords, me]);

  const summaryColumns = useMemo<DataTableColumn<(typeof stats)[number]>[]>(
    () => [
      {
        id: "domain",
        header: t.domain,
        label: t.domain,
        hideable: false,
        sortValue: (r) => r.c.domain,
        cell: (r) => (
          <span className="flex items-center gap-2">
            <bdi dir="ltr" className="text-label text-foreground">
              {r.c.domain}
            </bdi>
            {r.c.you ? <Badge variant="brand">{t.you}</Badge> : null}
          </span>
        ),
      },
      { id: "visibility", header: t.share, label: t.share, align: "end", sortValue: (r) => r.s.visibility, cell: (r) => <Num value={r.s.visibility} format={{ style: "percent", maximumFractionDigits: 1 }} /> },
      {
        id: "avg",
        header: t.avgPos,
        label: t.avgPos,
        align: "end",
        sortValue: (r) => r.s.averagePosition,
        cell: (r) => (r.s.averagePosition === null ? "-" : <Num value={r.s.averagePosition} format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }} />),
      },
      { id: "top10", header: t.top10Count, label: t.top10Count, align: "end", sortValue: (r) => r.s.top10, cell: (r) => <Num value={r.s.top10} /> },
    ],
    [t],
  );
  const summary = useDataTable({ data: stats, columns: summaryColumns, getRowId: (r) => r.c.id, defaultSort: { id: "visibility", direction: "desc" } });

  const matrixColumns = useMemo<DataTableColumn<(typeof keywords)[number]>[]>(
    () => [
      {
        id: "keyword",
        header: t.keyword,
        label: t.keyword,
        hideable: false,
        sortValue: (k) => k.keyword,
        cell: (k) => (
          <span dir="auto" className="block max-w-[24ch] truncate text-label text-foreground">
            {k.keyword}
          </span>
        ),
      },
      ...competitors.map<DataTableColumn<(typeof keywords)[number]>>((c) => ({
        id: `c-${c.id}`,
        header: <bdi dir="ltr">{c.domain}</bdi>,
        label: c.domain,
        align: "end",
        sortValue: (k) => c.ranks[k.id] ?? null,
        cell: (k) => {
          const mine = c.ranks[k.id] ?? null;
          const bestAll = Math.min(...competitors.map((x) => x.ranks[k.id] ?? Infinity));
          return cellPosition(mine, mine !== null && mine === bestAll);
        },
      })),
    ],
    [t, competitors],
  );
  const matrix = useDataTable({ data: [...keywords], columns: matrixColumns, getRowId: (k) => k.id });

  return (
    <div data-slot="competitor-comparison" className={cn("flex flex-col gap-4", className)}>
      <Card>
        <CardHeader>
          <CardTitle as="h3">{title ?? t.competitorsTitle}</CardTitle>
          <CardDescription>{description ?? t.competitorsDescription}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <DataTable table={summary} label={t.competitorsTitle} empty={t.noCompetitors} />
          {me ? (
            <ul className="flex flex-wrap gap-2 text-caption text-muted-foreground">
              {stats
                .filter((r) => r.c !== me)
                .map((r) => (
                  <li key={r.c.id}>
                    <bdi dir="ltr">{r.c.domain}</bdi>: {t.ahead(r.s.ahead)}
                  </li>
                ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle as="h3">{t.matrixTitle}</CardTitle>
          <CardDescription>{t.lowerIsBetter}</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable table={matrix} label={t.matrixTitle} empty={t.empty} />
        </CardContent>
      </Card>
    </div>
  );
}
