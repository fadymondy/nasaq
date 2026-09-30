"use client";

import { AlignLeft, BarChart3, Heading, Info, Minus, Plus, Printer, Table2, Trash2, TrendingUp, type LucideIcon } from "lucide-react";
import { type ReactNode, useId, useMemo, useRef, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { cn } from "../../lib/cn";
import { Alert } from "../alert";
import { Badge } from "../badge";
import { Button } from "../button";
import { ChartContainer, type ChartConfig, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, useChartAxis } from "../chart";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../dropdown-menu";
import { Field, FieldLabel, Input, Textarea } from "../field";
import { Icon } from "../icon";
import { formatDate, formatNumber } from "../numeric";
import { Repeater } from "../repeater";
import { RichTextEditor } from "../rich-text-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { StatCard, StatGrid } from "../stat-card";
import { EmptyState } from "../states";
import { Toggle, ToggleGroup } from "../toggle-group";
import { Tooltip } from "../tooltip";
import {
  addSeries,
  addTableColumn,
  type CalloutTone,
  CALLOUT_TONES,
  type ChartBlock,
  type ChartKind,
  CHART_KINDS,
  chartRows,
  chartSeriesKey,
  cloneBlock,
  convertBlock,
  fitTable,
  newBlock,
  parseNumber,
  plainText,
  readingMinutes,
  REPORT_BLOCK_TYPES,
  type Report,
  type ReportBlock,
  type ReportBlockType,
  type ReportFigure,
  reportIssues,
  removeSeries,
  removeTableColumn,
  type TableBlock,
  tocOf,
  wordCount,
  makeBlockId,
} from "./report-math";
import { type ReportLabels, type ReportText, useReportStrings } from "./report-strings";

export type { CalloutTone, ChartBlock, ChartKind, Report, ReportBlock, ReportBlockType, ReportFigure } from "./report-math";
export type { ReportLabels } from "./report-strings";

const TYPE_ICON: Record<ReportBlockType, LucideIcon> = {
  heading: Heading,
  text: AlignLeft,
  metrics: TrendingUp,
  chart: BarChart3,
  table: Table2,
  callout: Info,
  divider: Minus,
};

function typeName(type: ReportBlockType, t: ReportText): string {
  return { heading: t.typeHeading, text: t.typeText, metrics: t.typeMetrics, chart: t.typeChart, table: t.typeTable, callout: t.typeCallout, divider: t.typeDivider }[type];
}
function toneName(tone: CalloutTone, t: ReportText): string {
  return { info: t.toneInfo, success: t.toneSuccess, warning: t.toneWarning, danger: t.toneDanger }[tone];
}
function kindName(kind: ChartKind, t: ReportText): string {
  return { bar: t.kindBar, line: t.kindLine, area: t.kindArea }[kind];
}

/* ------------------------------------------------------------------ chart */

export interface ReportChartProps {
  block: ChartBlock;
  className?: string;
  labels?: ReportLabels;
}

/** A bar, line or area chart of a chart block, mirrored for RTL, with tooltip and legend. */
export function ReportChart({ block, className, labels }: ReportChartProps) {
  const { locale, t } = useReportStrings(labels);
  const { xAxis, yAxis } = useChartAxis();
  const n = (v: number) => formatNumber(v, locale);
  const config = useMemo<ChartConfig>(() => Object.fromEntries(block.series.map((s, i) => [chartSeriesKey(i), { label: s || t.defaultSeries(n(i + 1)) }])), [block.series, t, locale]); // eslint-disable-line react-hooks/exhaustive-deps
  const data = chartRows(block);
  const keys = block.series.map((_, i) => chartSeriesKey(i));
  const summary = t.chartSummary(block.title, kindName(block.kind, t), n(block.rows.length), n(block.series.length));

  const axes = (
    <>
      <CartesianGrid vertical={false} />
      <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} {...xAxis} />
      <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={(v: number) => formatNumber(v, locale, { notation: "compact" })} {...yAxis} />
      <ChartTooltip content={<ChartTooltipContent config={config} />} />
      {block.series.length > 1 ? <ChartLegend content={<ChartLegendContent config={config} />} /> : null}
    </>
  );

  return (
    <ChartContainer config={config} label={summary} className={cn("aspect-auto h-64", className)}>
      {block.kind === "line" ? (
        <LineChart data={data} margin={{ left: 4, right: 4, top: 8 }}>
          {axes}
          {keys.map((k) => (
            <Line key={k} dataKey={k} type="monotone" stroke={`var(--color-${k})`} strokeWidth={2} dot={false} isAnimationActive={false} />
          ))}
        </LineChart>
      ) : block.kind === "area" ? (
        <AreaChart data={data} margin={{ left: 4, right: 4, top: 8 }}>
          {axes}
          {keys.map((k) => (
            <Area key={k} dataKey={k} type="monotone" stroke={`var(--color-${k})`} fill={`var(--color-${k})`} fillOpacity={0.16} strokeWidth={2} isAnimationActive={false} />
          ))}
        </AreaChart>
      ) : (
        <BarChart data={data} margin={{ left: 4, right: 4, top: 8 }}>
          {axes}
          {keys.map((k) => (
            <Bar key={k} dataKey={k} fill={`var(--color-${k})`} radius={[3, 3, 0, 0]} isAnimationActive={false} />
          ))}
        </BarChart>
      )}
    </ChartContainer>
  );
}

/* ------------------------------------------------------------------ viewer */

export interface ReportViewerProps {
  report: Report;
  /** Show the contents list built from the headings. Default true when there are two or more headings. */
  showToc?: boolean;
  /** Called by the Print button. Default `window.print()`. */
  onPrint?: () => void;
  /** Hide the Print button. */
  hidePrint?: boolean;
  labels?: ReportLabels;
  className?: string;
}

function MetricsView({ items, locale }: { items: ReportFigure[]; locale: string }) {
  return (
    <StatGrid className="break-inside-avoid">
      {items.map((m) => (
        <StatCard
          key={m.id}
          label={m.label}
          value={m.value}
          format={m.currency ? { style: "currency", currency: m.currency, maximumFractionDigits: 0 } : undefined}
          delta={m.delta}
          deltaLabel={m.deltaLabel}
          lang={locale}
        />
      ))}
    </StatGrid>
  );
}

function TableView({ block }: { block: TableBlock }) {
  const fit = fitTable(block);
  return (
    <figure className="flex min-w-0 flex-col gap-2 break-inside-avoid">
      {block.title ? <figcaption className="text-label text-foreground">{block.title}</figcaption> : null}
      <div className="overflow-x-auto rounded-card border border-border">
        <table className="w-full border-collapse text-body-sm">
          <thead className="bg-secondary text-start">
            <tr>
              {fit.columns.map((c, i) => (
                <th key={i} scope="col" className="border-b border-border px-3 py-2 text-start text-label text-foreground">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fit.rows.map((r, ri) => (
              <tr key={ri} className="border-b border-border last:border-b-0">
                {r.map((cell, ci) => (
                  <td key={ci} dir="auto" className="px-3 py-2 text-start text-foreground">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

const HEADING_CLASS = { 1: "text-h2", 2: "text-h3", 3: "text-label" } as const;

function BlockView({ block, anchor, locale, labels }: { block: ReportBlock; anchor: string; locale: string; labels?: ReportLabels }) {
  switch (block.type) {
    case "heading": {
      if (!block.text.trim()) return null;
      const Tag = (`h${block.level + 1}` as "h2" | "h3" | "h4");
      return (
        <Tag id={anchor} dir="auto" className={cn("scroll-mt-4 text-start font-semibold text-foreground break-after-avoid", HEADING_CLASS[block.level])}>
          {block.text}
        </Tag>
      );
    }
    case "text":
      return block.html ? <RichTextEditor readOnly toolbar={[]} value={block.html} minHeight="0" /> : null;
    case "metrics":
      return <MetricsView items={block.items.filter((m) => m.label.trim())} locale={locale} />;
    case "chart":
      return (
        <figure className="flex min-w-0 flex-col gap-2 break-inside-avoid">
          {block.title ? <figcaption className="text-label text-foreground">{block.title}</figcaption> : null}
          <div className="rounded-card border border-border bg-card p-3">
            <ReportChart block={block} labels={labels} />
          </div>
          {block.caption ? <p dir="auto" className="text-caption text-muted-foreground">{block.caption}</p> : null}
        </figure>
      );
    case "table":
      return <TableView block={block} />;
    case "callout":
      return block.text.trim() || block.title?.trim() ? (
        <Alert tone={block.tone} title={block.title} role="note" className="break-inside-avoid">
          <span dir="auto">{block.text}</span>
        </Alert>
      ) : null;
    default:
      return <hr className="border-border" />;
  }
}

/**
 * A finished report for reading: cover, contents, and the blocks as prose, figures, charts, tables and callouts.
 * Read-only and print friendly: the toolbar hides on paper and charts, tables and figures do not split across pages.
 */
export function ReportViewer({ report, showToc, onPrint, hidePrint = false, labels, className }: ReportViewerProps) {
  const { locale, t } = useReportStrings(labels);
  const uid = useId();
  const n = (v: number) => formatNumber(v, locale);
  const toc = tocOf(report);
  const words = wordCount(report);
  const withToc = showToc ?? toc.length >= 2;
  const anchor = (id: string) => `${uid}-${id}`;
  const jump = (id: string) => document.getElementById(anchor(id))?.scrollIntoView({ behavior: "smooth", block: "start" });
  const meta = [report.author ? t.by(report.author) : null, report.date ? formatDate(report.date, locale, { dateStyle: "long" }) : null, words ? `${t.words(n(words))} · ${t.minutes(n(readingMinutes(words)))}` : null].filter(Boolean);

  return (
    <article data-slot="report-viewer" aria-label={report.title || t.viewer} className={cn("mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-5 print:max-w-none", className)}>
      <header className="flex flex-col gap-2">
        <div className="flex items-start gap-3">
          <h1 dir="auto" className="min-w-0 flex-1 text-start text-h1 font-semibold text-foreground">
            {report.title || t.titlePlaceholder}
          </h1>
          {hidePrint ? null : (
            <Button variant="secondary" size="sm" className="print:hidden" onClick={onPrint ?? (() => window.print())}>
              <Printer aria-hidden />
              {t.print}
            </Button>
          )}
        </div>
        {report.subtitle ? (
          <p dir="auto" className="text-start text-body text-muted-foreground">
            {report.subtitle}
          </p>
        ) : null}
        {meta.length ? <p className="text-caption text-muted-foreground">{meta.join(" · ")}</p> : null}
      </header>

      {withToc && toc.length ? (
        <nav aria-label={t.contents} className="rounded-card border border-border bg-card p-3 break-inside-avoid">
          <p className="mb-1 text-label text-foreground">{t.contents}</p>
          <ol className="flex flex-col gap-0.5">
            {toc.map((e) => (
              <li key={e.id} style={{ paddingInlineStart: `${(e.level - 1) * 0.75}rem` }}>
                <a
                  href={`#${anchor(e.id)}`}
                  dir="auto"
                  onClick={(ev) => {
                    ev.preventDefault();
                    jump(e.id);
                  }}
                  className="rounded-control text-body-sm text-foreground underline-offset-2 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-nq-focus"
                >
                  {e.text}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      {report.blocks.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">{t.emptyReport}</p>
      ) : (
        report.blocks.map((b) => <BlockView key={b.id} block={b} anchor={anchor(b.id)} locale={locale} labels={labels} />)
      )}
    </article>
  );
}

/* ------------------------------------------------------------------ block forms */

interface FormProps<B extends ReportBlock> {
  block: B;
  onChange: (next: B) => void;
  t: ReportText;
  locale: string;
  disabled: boolean;
  uid: string;
}

/** A number the user is typing: keeps the raw text while focused so "1." and "" are allowed. */
function NumberInput({ value, onValue, ...props }: { value: number | undefined; onValue: (n: number) => void } & Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type">) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <Input
      {...props}
      ltr
      inputMode="decimal"
      value={draft ?? (value === undefined ? "" : String(value))}
      onFocus={() => setDraft(value === undefined ? "" : String(value))}
      onChange={(e) => {
        setDraft(e.currentTarget.value);
        onValue(parseNumber(e.currentTarget.value));
      }}
      onBlur={() => setDraft(null)}
    />
  );
}

function HeadingForm({ block, onChange, t, disabled, uid }: FormProps<Extract<ReportBlock, { type: "heading" }>>) {
  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
      <Field>
        <FieldLabel>{t.headingText}</FieldLabel>
        <Input dir="auto" disabled={disabled} value={block.text} onChange={(e) => onChange({ ...block, text: e.currentTarget.value })} />
      </Field>
      <div className="flex flex-col gap-1.5">
        <span id={`${uid}-lv`} className="text-label text-foreground">
          {t.headingLevel}
        </span>
        <ToggleGroup aria-labelledby={`${uid}-lv`} disabled={disabled} value={[String(block.level)]} onValueChange={(v) => v[0] && onChange({ ...block, level: Number(v[0]) as 1 | 2 | 3 })}>
          <Toggle value="1">{t.level1}</Toggle>
          <Toggle value="2">{t.level2}</Toggle>
          <Toggle value="3">{t.level3}</Toggle>
        </ToggleGroup>
      </div>
    </div>
  );
}

function MetricsForm({ block, onChange, t, locale, disabled }: FormProps<Extract<ReportBlock, { type: "metrics" }>>) {
  const n = (v: number) => formatNumber(v, locale);
  const set = (id: string, patch: Partial<ReportFigure>) => onChange({ ...block, items: block.items.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {block.items.map((m, i) => (
          <li key={m.id} className="grid gap-2 rounded-control border border-border p-2.5 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
            <Field>
              <FieldLabel>{t.metricLabel}</FieldLabel>
              <Input dir="auto" disabled={disabled} value={m.label} onChange={(e) => set(m.id, { label: e.currentTarget.value })} />
            </Field>
            <Field>
              <FieldLabel>{t.metricValue}</FieldLabel>
              <NumberInput disabled={disabled} value={m.value} onValue={(v) => set(m.id, { value: v })} />
            </Field>
            <Field>
              <FieldLabel>{t.metricDelta}</FieldLabel>
              <NumberInput
                disabled={disabled}
                value={m.delta === undefined ? undefined : Math.round(m.delta * 1000) / 10}
                onValue={(v) => set(m.id, { delta: v / 100 })}
                placeholder="—"
              />
            </Field>
            <Field>
              <FieldLabel>{t.metricCurrency}</FieldLabel>
              <Input ltr maxLength={3} disabled={disabled} value={m.currency ?? ""} placeholder="SAR" onChange={(e) => set(m.id, { currency: e.currentTarget.value.toUpperCase() || undefined })} />
            </Field>
            <div className="flex items-end">
              <Tooltip content={t.removeMetric(n(i + 1))}>
                <Button size="icon-sm" variant="ghost" aria-label={t.removeMetric(n(i + 1))} disabled={disabled || block.items.length <= 1} onClick={() => onChange({ ...block, items: block.items.filter((x) => x.id !== m.id) })}>
                  <Trash2 aria-hidden />
                </Button>
              </Tooltip>
            </div>
          </li>
        ))}
      </ul>
      <div>
        <Button size="sm" variant="secondary" disabled={disabled || block.items.length >= 6} onClick={() => onChange({ ...block, items: [...block.items, { id: makeBlockId(), label: "", value: 0 }] })}>
          <Plus aria-hidden />
          {t.addMetric}
        </Button>
      </div>
    </div>
  );
}

function ChartForm({ block, onChange, t, locale, disabled, uid }: FormProps<ChartBlock>) {
  const n = (v: number) => formatNumber(v, locale);
  const setRow = (ri: number, patch: Partial<ChartBlock["rows"][number]>) => onChange({ ...block, rows: block.rows.map((r, i) => (i === ri ? { ...r, ...patch } : r)) });
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <Field>
          <FieldLabel>{t.chartTitle}</FieldLabel>
          <Input dir="auto" disabled={disabled} value={block.title} onChange={(e) => onChange({ ...block, title: e.currentTarget.value })} />
        </Field>
        <Field>
          <FieldLabel>{t.chartKind}</FieldLabel>
          <Select disabled={disabled} items={CHART_KINDS.map((k) => ({ value: k, label: kindName(k, t) }))} value={block.kind} onValueChange={(v) => v && onChange({ ...block, kind: v as ChartKind })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHART_KINDS.map((k) => (
                <SelectItem key={k} value={k}>
                  {kindName(k, t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="min-w-0 overflow-x-auto rounded-control border border-border">
        <table className="w-full min-w-[32rem] border-collapse text-body-sm">
          <thead>
            <tr className="bg-secondary">
              <th scope="col" className="w-40 p-1.5 text-start text-caption font-medium text-muted-foreground">
                {t.rowLabel}
              </th>
              {block.series.map((s, si) => (
                <th key={si} scope="col" className="p-1.5 text-start">
                  <div className="flex items-center gap-1">
                    <Input dir="auto" aria-label={t.seriesName(n(si + 1))} disabled={disabled} value={s} placeholder={t.defaultSeries(n(si + 1))} onChange={(e) => onChange({ ...block, series: block.series.map((x, i) => (i === si ? e.currentTarget.value : x)) })} />
                    {block.series.length > 1 ? (
                      <Button size="icon-sm" variant="ghost" aria-label={t.removeSeries(n(si + 1))} disabled={disabled} onClick={() => onChange(removeSeries(block, si))}>
                        <Trash2 aria-hidden />
                      </Button>
                    ) : null}
                  </div>
                </th>
              ))}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {block.rows.map((r, ri) => (
              <tr key={ri} className="border-t border-border">
                <td className="p-1.5">
                  <Input dir="auto" aria-label={`${t.rowLabel} ${n(ri + 1)}`} disabled={disabled} value={r.label} onChange={(e) => setRow(ri, { label: e.currentTarget.value })} />
                </td>
                {block.series.map((s, si) => (
                  <td key={si} className="p-1.5">
                    <NumberInput
                      aria-label={`${t.rowValue(s || t.defaultSeries(n(si + 1)))}, ${r.label || n(ri + 1)}`}
                      disabled={disabled}
                      value={r.values[si] ?? 0}
                      onValue={(v) => setRow(ri, { values: block.series.map((_, i) => (i === si ? v : (r.values[i] ?? 0))) })}
                    />
                  </td>
                ))}
                <td className="p-1.5">
                  <Button size="icon-sm" variant="ghost" aria-label={t.removeRow(n(ri + 1))} disabled={disabled || block.rows.length <= 1} onClick={() => onChange({ ...block, rows: block.rows.filter((_, i) => i !== ri) })}>
                    <Trash2 aria-hidden />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" disabled={disabled || block.rows.length >= 24} onClick={() => onChange({ ...block, rows: [...block.rows, { label: "", values: block.series.map(() => 0) }] })}>
          <Plus aria-hidden />
          {t.addRow}
        </Button>
        <Button size="sm" variant="secondary" disabled={disabled || block.series.length >= 5} onClick={() => onChange(addSeries(block, ""))}>
          <Plus aria-hidden />
          {t.addSeries}
        </Button>
      </div>
      <Field>
        <FieldLabel>{t.caption}</FieldLabel>
        <Input dir="auto" disabled={disabled} value={block.caption ?? ""} onChange={(e) => onChange({ ...block, caption: e.currentTarget.value })} />
      </Field>
      <div id={`${uid}-preview`} className="rounded-card border border-border bg-card p-3">
        <ReportChart block={block} />
      </div>
    </div>
  );
}

function TableForm({ block, onChange, t, locale, disabled }: FormProps<TableBlock>) {
  const n = (v: number) => formatNumber(v, locale);
  const fit = fitTable(block);
  const setCell = (ri: number, ci: number, value: string) => onChange({ ...fit, rows: fit.rows.map((r, i) => (i === ri ? r.map((c, j) => (j === ci ? value : c)) : r)) });
  return (
    <div className="flex flex-col gap-3">
      <Field>
        <FieldLabel>{t.tableTitle}</FieldLabel>
        <Input dir="auto" disabled={disabled} value={block.title ?? ""} onChange={(e) => onChange({ ...block, title: e.currentTarget.value })} />
      </Field>
      <div className="min-w-0 overflow-x-auto rounded-control border border-border">
        <table className="w-full min-w-[28rem] border-collapse">
          <thead>
            <tr className="bg-secondary">
              {fit.columns.map((c, ci) => (
                <th key={ci} scope="col" className="p-1.5">
                  <div className="flex items-center gap-1">
                    <Input dir="auto" aria-label={t.column(n(ci + 1))} disabled={disabled} value={c} placeholder={t.column(n(ci + 1))} className="text-label" onChange={(e) => onChange({ ...fit, columns: fit.columns.map((x, i) => (i === ci ? e.currentTarget.value : x)) })} />
                    {fit.columns.length > 1 ? (
                      <Button size="icon-sm" variant="ghost" aria-label={t.removeColumn(n(ci + 1))} disabled={disabled} onClick={() => onChange(removeTableColumn(fit, ci))}>
                        <Trash2 aria-hidden />
                      </Button>
                    ) : null}
                  </div>
                </th>
              ))}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {fit.rows.map((r, ri) => (
              <tr key={ri} className="border-t border-border">
                {r.map((cell, ci) => (
                  <td key={ci} className="p-1.5">
                    <Input dir="auto" aria-label={t.cell(n(ri + 1), n(ci + 1))} disabled={disabled} value={cell} onChange={(e) => setCell(ri, ci, e.currentTarget.value)} />
                  </td>
                ))}
                <td className="p-1.5">
                  <Button size="icon-sm" variant="ghost" aria-label={t.removeRow(n(ri + 1))} disabled={disabled || fit.rows.length <= 1} onClick={() => onChange({ ...fit, rows: fit.rows.filter((_, i) => i !== ri) })}>
                    <Trash2 aria-hidden />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" disabled={disabled} onClick={() => onChange({ ...fit, rows: [...fit.rows, fit.columns.map(() => "")] })}>
          <Plus aria-hidden />
          {t.addRow}
        </Button>
        <Button size="sm" variant="secondary" disabled={disabled || fit.columns.length >= 8} onClick={() => onChange(addTableColumn(fit))}>
          <Plus aria-hidden />
          {t.addColumn}
        </Button>
      </div>
    </div>
  );
}

function CalloutForm({ block, onChange, t, disabled }: FormProps<Extract<ReportBlock, { type: "callout" }>>) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field>
        <FieldLabel>{t.calloutTone}</FieldLabel>
        <Select disabled={disabled} items={CALLOUT_TONES.map((k) => ({ value: k, label: toneName(k, t) }))} value={block.tone} onValueChange={(v) => v && onChange({ ...block, tone: v as CalloutTone })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CALLOUT_TONES.map((k) => (
              <SelectItem key={k} value={k}>
                {toneName(k, t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field>
        <FieldLabel>{t.calloutTitle}</FieldLabel>
        <Input dir="auto" disabled={disabled} value={block.title ?? ""} onChange={(e) => onChange({ ...block, title: e.currentTarget.value })} />
      </Field>
      <Field className="sm:col-span-2">
        <FieldLabel>{t.calloutText}</FieldLabel>
        <Textarea dir="auto" rows={3} disabled={disabled} value={block.text} onChange={(e) => onChange({ ...block, text: e.currentTarget.value })} />
      </Field>
    </div>
  );
}

const plain = (html: string) => html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

/** The rich text editor rewrites HTML when it mounts (adds attributes); that is not an edit, so it must not mark the report unsaved. */
function TextBlockForm({ block, onChange, t, disabled }: { block: Extract<ReportBlock, { type: "text" }>; onChange: (b: ReportBlock) => void; t: ReportText; disabled: boolean }) {
  const mounted = useRef(false);
  return (
    <RichTextEditor
      aria-label={t.textLabel}
      placeholder={t.textPlaceholder}
      minHeight="7rem"
      toolbar={["bold", "italic", "underline", "h2", "h3", "bulletList", "orderedList", "blockquote", "link", "undo", "redo"]}
      value={block.html}
      onValueChange={(html) => {
        if (!mounted.current) {
          mounted.current = true;
          if (plain(html) === plain(block.html)) return;
        }
        onChange({ ...block, html });
      }}
      readOnly={disabled}
    />
  );
}

function BlockForm({ block, onChange, t, locale, disabled, uid }: { block: ReportBlock; onChange: (b: ReportBlock) => void; t: ReportText; locale: string; disabled: boolean; uid: string }) {
  const common = { t, locale, disabled, uid };
  const set = onChange as never;
  switch (block.type) {
    case "heading":
      return <HeadingForm block={block} onChange={set} {...common} />;
    case "text":
      return <TextBlockForm block={block} onChange={set} t={t} disabled={disabled} />;
    case "metrics":
      return <MetricsForm block={block} onChange={set} {...common} />;
    case "chart":
      return <ChartForm block={block} onChange={set} {...common} />;
    case "table":
      return <TableForm block={block} onChange={set} {...common} />;
    case "callout":
      return <CalloutForm block={block} onChange={set} {...common} />;
    default:
      return <p className="text-body-sm text-muted-foreground">—</p>;
  }
}

/* ------------------------------------------------------------------ editor */

export interface ReportEditorProps {
  /** Controlled report. */
  value?: Report;
  defaultValue?: Report;
  onValueChange?: (report: Report) => void;
  /** Persist the report. Return `{ error }` to show why it failed. Adds a Save button and the unsaved-changes state. */
  onSave?: (report: Report) => Promise<void | { error?: string }>;
  /** Called by Print in the preview. Default `window.print()`. */
  onPrint?: () => void;
  /** Start on the preview tab. */
  defaultView?: "edit" | "preview";
  /** Read the report, change nothing. Shows the viewer only. */
  readOnly?: boolean;
  labels?: ReportLabels;
  className?: string;
}

/**
 * Builds a report from blocks: headings, rich text, key figures, charts, tables, callouts and dividers. Each block
 * edits in a collapsible, reorderable row; Preview shows the finished report as a reader sees it.
 */
export function ReportEditor({ value: valueProp, defaultValue, onValueChange, onSave, onPrint, defaultView = "edit", readOnly = false, labels, className }: ReportEditorProps) {
  const { locale, t } = useReportStrings(labels);
  const n = (v: number) => formatNumber(v, locale);
  const uid = useId();
  const [inner, setInner] = useState<Report>(defaultValue ?? valueProp ?? { title: "", blocks: [] });
  const report = valueProp ?? inner;
  const [saved, setSaved] = useState(report);
  const dirty = saved !== report;
  const [saveState, setSaveState] = useState<{ status: "idle" | "saving" | "error"; message?: string }>({ status: "idle" });
  const [view, setView] = useState<"edit" | "preview">(readOnly ? "preview" : defaultView);
  const editable = !readOnly;

  const commit = (next: Report) => {
    if (valueProp === undefined) setInner(next);
    onValueChange?.(next);
    if (saveState.status === "error") setSaveState({ status: "idle" });
  };
  const patch = (p: Partial<Report>) => commit({ ...report, ...p });

  const save = async () => {
    if (!onSave) return;
    setSaveState({ status: "saving" });
    try {
      const result = await onSave(report);
      if (result && result.error) return setSaveState({ status: "error", message: result.error });
      setSaved(report);
      setSaveState({ status: "idle" });
    } catch (error) {
      setSaveState({ status: "error", message: error instanceof Error ? error.message : t.saveFailed });
    }
  };

  const issues = useMemo(() => reportIssues(report), [report]);
  const issueIds = useMemo(() => new Set(issues.map((i) => i.blockId)), [issues]);
  const words = wordCount(report);

  const status = !onSave ? null : saveState.status === "saving" ? (
    <Badge variant="info">{t.saving}</Badge>
  ) : saveState.status === "error" ? (
    <Badge variant="danger" role="alert">
      {saveState.message ?? t.saveFailed}
    </Badge>
  ) : dirty ? (
    <Badge variant="warning">{t.unsaved}</Badge>
  ) : (
    <Badge variant="success">{t.saved}</Badge>
  );

  const insert = (type: ReportBlockType) => commit({ ...report, blocks: [...report.blocks, newBlock(type)] });

  const summaryOf = (b: ReportBlock): ReactNode => {
    if (b.type === "metrics") return b.items.map((m) => m.label).filter(Boolean).join(", ");
    if (b.type === "chart") return b.title;
    if (b.type === "table") return b.title || b.columns.filter(Boolean).join(", ");
    return plainText(b).slice(0, 90);
  };

  return (
    <div data-slot="report-editor" role="group" aria-label={t.editor} className={cn("flex min-w-0 flex-col gap-4", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {editable ? (
          <ToggleGroup aria-label={t.view} value={[view]} onValueChange={(v) => v[0] && setView(v[0] as "edit" | "preview")}>
            <Toggle value="edit">{t.edit}</Toggle>
            <Toggle value="preview">{t.preview}</Toggle>
          </ToggleGroup>
        ) : null}
        <span className="text-caption text-muted-foreground">
          {t.words(n(words))} · {t.minutes(n(readingMinutes(words)))}
        </span>
        {issues.length > 0 && editable ? <Badge variant="warning">{t.issues(n(issues.length))}</Badge> : null}
        <div className="ms-auto flex flex-wrap items-center gap-2">
          {status}
          {onSave && editable ? (
            <Button size="sm" loading={saveState.status === "saving"} disabled={!dirty} onClick={save}>
              {t.save}
            </Button>
          ) : null}
        </div>
      </div>

      {view === "preview" ? (
        <div className="rounded-card border border-border bg-card p-4 sm:p-8">
          {report.blocks.length === 0 && !report.title ? (
            <EmptyState title={t.emptyReport} description={t.previewEmpty} />
          ) : (
            <ReportViewer report={report} onPrint={onPrint} labels={labels} />
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-3 rounded-card border border-border bg-card p-3 sm:grid-cols-2 sm:p-4">
            <Field className="sm:col-span-2">
              <FieldLabel>{t.reportTitle}</FieldLabel>
              <Input dir="auto" value={report.title} placeholder={t.titlePlaceholder} className="text-label" onChange={(e) => patch({ title: e.currentTarget.value })} />
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel>{t.subtitle}</FieldLabel>
              <Input dir="auto" value={report.subtitle ?? ""} onChange={(e) => patch({ subtitle: e.currentTarget.value })} />
            </Field>
            <Field>
              <FieldLabel>{t.author}</FieldLabel>
              <Input dir="auto" value={report.author ?? ""} onChange={(e) => patch({ author: e.currentTarget.value })} />
            </Field>
            <Field>
              <FieldLabel>{t.date}</FieldLabel>
              <Input ltr type="date" value={report.date ?? ""} onChange={(e) => patch({ date: e.currentTarget.value || undefined })} />
            </Field>
          </div>

          <Repeater<ReportBlock>
            label={t.blocks}
            value={report.blocks}
            onValueChange={(blocks) => patch({ blocks })}
            createItem={() => newBlock("text")}
            cloneItem={cloneBlock}
            addLabel={t.addText}
            empty={t.previewEmpty}
            rowTitle={(b) => (
              <span className="inline-flex items-center gap-1.5">
                <Icon icon={TYPE_ICON[b.type]} className="size-4 text-muted-foreground" />
                {typeName(b.type, t)}
              </span>
            )}
            rowLabel={(b) => typeName(b.type, t)}
            rowSummary={(b) => summaryOf(b) || t.untitledBlock}
            rowMeta={(b) => (issueIds.has(b.id) ? <Badge variant="warning">{t.untitledBlock}</Badge> : null)}
            renderRow={(b, ctx) => (
              <div className="flex flex-col gap-4">
                <Field className="sm:max-w-56">
                  <FieldLabel>{t.blockType}</FieldLabel>
                  <Select
                    items={REPORT_BLOCK_TYPES.map((k) => ({ value: k, label: typeName(k, t) }))}
                    value={b.type}
                    onValueChange={(v) => v && ctx.update(convertBlock(b, v as ReportBlockType))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REPORT_BLOCK_TYPES.map((k) => (
                        <SelectItem key={k} value={k}>
                          {typeName(k, t)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <BlockForm block={b} onChange={(next) => ctx.update(next)} t={t} locale={locale} disabled={false} uid={`${uid}-${ctx.id}`} />
              </div>
            )}
          />

          <div>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="secondary" />}>
                <Plus aria-hidden />
                {t.insert}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-44">
                {REPORT_BLOCK_TYPES.map((k) => (
                  <DropdownMenuItem key={k} onClick={() => insert(k)}>
                    <Icon icon={TYPE_ICON[k]} />
                    {typeName(k, t)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </>
      )}
    </div>
  );
}
