"use client";

import { Check, TriangleAlert } from "lucide-react";
import { type ComponentProps, type ReactNode, useId, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell as Slice, Line, LineChart, Pie, PieChart, XAxis, YAxis } from "recharts";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { Badge, type BadgeProps } from "../badge";
import { Button } from "../button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../card";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig, useChartAxis } from "../chart";
import { Checkbox } from "../checkbox";
import { CodeBlock } from "../code-block";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Markdown } from "../markdown";
import { Num } from "../numeric";
import { Radio, RadioGroup } from "../radio-group";
import { StatCard, StatGrid } from "../stat-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../table";
import {
  type Artifact,
  type ArtifactAction,
  type ArtifactCell,
  type ArtifactParse,
  type ArtifactText,
  type ArtifactTone,
  type PickerArtifact,
  type PieSlice,
  frameDocument,
  frameHeight,
  localize,
  parseArtifact,
  pieSlices,
} from "./artifact-renderer-logic";

export {
  ARTIFACT_KINDS,
  ARTIFACT_LIMITS,
  extractArtifacts,
  frameDocument,
  frameHeight,
  localize,
  parseArtifact,
  pieSlices,
  safeColor,
  type ActionsArtifact,
  type Artifact,
  type ArtifactAction,
  type ArtifactCell,
  type ArtifactKind,
  type ArtifactParse,
  type ArtifactText,
  type ArtifactTone,
  type ArtifactVariant,
  type CardArtifact,
  type ChartArtifact,
  type CodeArtifact,
  type ExtractedArtifacts,
  type HtmlArtifact,
  type MarkdownArtifact,
  type PickerArtifact,
  type PieSlice,
  type StatsArtifact,
  type TableArtifact,
} from "./artifact-renderer-logic";

const STRINGS = {
  en: {
    invalid: "This content could not be shown",
    unsupported: "Unsupported content",
    yes: "Yes",
    no: "No",
    confirm: "Confirm",
    cancel: "Cancel",
    send: "Send",
    sent: "Sent",
    choose: "Choose an option",
    failed: "That did not work. Try again.",
    htmlAsCode: "HTML from the agent is shown as code. Enable it in a sandbox with allowHtml.",
    htmlFrame: "Content from the agent, in a sandbox",
    source: "Source",
    chartLabel: (title: string) => (title ? `Chart: ${title}` : "Chart"),
    other: "Other",
    tones: { neutral: "Neutral", success: "Good", warning: "Warning", danger: "Critical", info: "Info" } as Record<ArtifactTone, string>,
  },
  ar: {
    invalid: "تعذّر عرض هذا المحتوى",
    unsupported: "محتوى غير مدعوم",
    yes: "نعم",
    no: "لا",
    confirm: "تأكيد",
    cancel: "إلغاء",
    send: "إرسال",
    sent: "تم الإرسال",
    choose: "اختر خيارًا",
    failed: "لم تنجح العملية. حاول مرة أخرى.",
    htmlAsCode: "يُعرض HTML القادم من الوكيل على هيئة شيفرة. فعّله داخل صندوق معزول بالخاصية allowHtml.",
    htmlFrame: "محتوى من الوكيل داخل صندوق معزول",
    source: "المصدر",
    chartLabel: (title: string) => (title ? `مخطط: ${title}` : "مخطط"),
    other: "أخرى",
    tones: { neutral: "محايد", success: "جيد", warning: "تحذير", danger: "حرج", info: "معلومة" } as Record<ArtifactTone, string>,
  },
};

export type ArtifactRendererLabels = (typeof STRINGS)["en"];

type Result = void | { error?: string };

function useI18n(labels?: Partial<ArtifactRendererLabels>) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t = { ...STRINGS[locale.startsWith("ar") ? "ar" : "en"], ...labels };
  return { t, tx: (v: ArtifactText | undefined) => localize(v, locale) };
}

interface CommonProps {
  /** Render `html` artifacts in a sandboxed frame. Off by default: the HTML is shown as code. */
  allowHtml?: boolean;
  /** A button in a card or action row was pressed. Return `{ error }` or reject to show a failure. */
  onAction?: (actionId: string, artifact: Artifact) => void | Promise<Result>;
  /** A picker was submitted with the chosen values. */
  onPick?: (values: string[], artifact: PickerArtifact) => void | Promise<Result>;
  labels?: Partial<ArtifactRendererLabels>;
}

/* ------------------------------------------------------------------ pieces */

const TONE_BADGE: Record<ArtifactTone, BadgeProps["variant"]> = { neutral: "neutral", success: "success", warning: "warning", danger: "danger", info: "info" };

const TONE_DOT: Record<ArtifactTone, string> = { neutral: "bg-muted-foreground", success: "bg-nq-success", warning: "bg-nq-warning", danger: "bg-nq-danger", info: "bg-nq-info" };

/** A coloured dot with the tone in words for screen readers, so the tone is never colour alone. */
function ToneDot({ tone, t }: { tone: ArtifactTone; t: ArtifactRendererLabels }) {
  return (
    <>
      <span aria-hidden data-tone={tone} className={cn("inline-block size-2 shrink-0 rounded-full", TONE_DOT[tone])} />
      <span className="sr-only">{t.tones[tone]}: </span>
    </>
  );
}

function Frame({ artifact, children, footer, note }: { artifact: Artifact; children: ReactNode; footer?: ReactNode; note?: string }) {
  const { tx } = useI18n();
  const title = tx(artifact.title);
  const description = tx(artifact.description);
  return (
    <Card data-slot="artifact" data-kind={artifact.kind} className="min-w-0">
      {title || description ? (
        <CardHeader>
          {title ? <CardTitle dir="auto">{title}</CardTitle> : null}
          {description ? <CardDescription dir="auto">{description}</CardDescription> : null}
        </CardHeader>
      ) : null}
      <CardContent className="flex flex-col gap-3">{children}</CardContent>
      {footer || note ? (
        <CardFooter className="flex flex-col items-stretch gap-3">
          {footer}
          {note ? (
            <p data-slot="artifact-note" dir="auto" className="text-caption text-muted-foreground">
              {note}
            </p>
          ) : null}
        </CardFooter>
      ) : null}
    </Card>
  );
}

function Cell({ value, t }: { value: ArtifactCell; t: ArtifactRendererLabels }) {
  if (value === null) return <span className="text-muted-foreground">—</span>;
  if (typeof value === "number") return <Num value={value} />;
  if (typeof value === "boolean") return <span>{value ? t.yes : t.no}</span>;
  return <>{value}</>;
}

function ActionButtons({ actions, artifact, onAction, labels }: { actions: ArtifactAction[]; artifact: Artifact; onAction: CommonProps["onAction"]; labels?: Partial<ArtifactRendererLabels> }) {
  const { t, tx } = useI18n(labels);
  const [busy, setBusy] = useState<string | null>(null);
  const [asking, setAsking] = useState<ArtifactAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = async (a: ArtifactAction) => {
    setBusy(a.id);
    setError(null);
    try {
      const r = await onAction?.(a.id, artifact);
      if (r && r.error) setError(r.error);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : t.failed);
    }
    setBusy(null);
  };
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {actions.map((a) => (
          <Button key={a.id} variant={a.variant ?? "secondary"} loading={busy === a.id} disabled={busy !== null && busy !== a.id} onClick={() => (a.confirm ? setAsking(a) : void run(a))}>
            {tx(a.label)}
          </Button>
        ))}
      </div>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Dialog open={asking !== null} onOpenChange={(o) => !o && setAsking(null)}>
        <DialogContent data-slot="artifact-confirm">
          <DialogHeader>
            <DialogTitle>{asking ? tx(asking.label) : ""}</DialogTitle>
            <DialogDescription>{asking ? tx(asking.confirm) : ""}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAsking(null)}>
              {t.cancel}
            </Button>
            <Button
              variant={asking?.variant === "danger" ? "danger" : "primary"}
              onClick={() => {
                const a = asking;
                setAsking(null);
                if (a) void run(a);
              }}
            >
              {t.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ChartView({ artifact }: { artifact: Extract<Artifact, { kind: "chart" }> }) {
  const { t, tx } = useI18n();
  const { xAxis, yAxis } = useChartAxis();
  // Series keys come from the agent, so they are mapped to s0, s1... before they become CSS variable names.
  const { data, config, keys } = useMemo(() => {
    const keys = artifact.series.map((_, i) => `s${i}`);
    const config: ChartConfig = Object.fromEntries(artifact.series.map((s, i) => [keys[i] as string, { label: tx(s.label), ...(s.color ? { color: s.color } : {}) }]));
    const data = artifact.data.map((row) => ({ x: row[artifact.xKey] as string | number, ...Object.fromEntries(artifact.series.map((s, i) => [keys[i] as string, row[s.key] as number])) }));
    return { data, config, keys };
  }, [artifact]);
  const kind = artifact.chart ?? "bar";
  if (kind === "pie" || kind === "donut") return <PieView artifact={artifact} donut={kind === "donut"} />;
  const axes = (
    <>
      <CartesianGrid vertical={false} />
      <XAxis dataKey="x" tickLine={false} axisLine={false} tickMargin={8} {...xAxis} />
      <YAxis tickLine={false} axisLine={false} width={44} {...yAxis} />
      <ChartTooltip content={<ChartTooltipContent config={config} />} />
      {keys.length > 1 ? <ChartLegend content={<ChartLegendContent config={config} />} /> : null}
    </>
  );
  return (
    <ChartContainer config={config} label={t.chartLabel(tx(artifact.title))} className="aspect-auto h-56 w-full">
      {kind === "line" ? (
        <LineChart data={data}>
          {axes}
          {keys.map((k) => (
            <Line key={k} dataKey={k} type="monotone" stroke={`var(--color-${k})`} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      ) : kind === "area" ? (
        <AreaChart data={data}>
          {axes}
          {keys.map((k) => (
            <Area key={k} dataKey={k} type="monotone" stroke={`var(--color-${k})`} fill={`var(--color-${k})`} fillOpacity={0.15} strokeWidth={2} />
          ))}
        </AreaChart>
      ) : (
        <BarChart data={data}>
          {axes}
          {keys.map((k) => (
            <Bar key={k} dataKey={k} fill={`var(--color-${k})`} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      )}
    </ChartContainer>
  );
}

function PieView({ artifact, donut }: { artifact: Extract<Artifact, { kind: "chart" }>; donut: boolean }) {
  const { t, tx } = useI18n();
  // Slice names come from the agent too, so they become p0, p1... keys with the name as the label.
  const { data, config } = useMemo(() => {
    const slices: PieSlice[] = pieSlices(artifact);
    const config: ChartConfig = Object.fromEntries(slices.map((s, i) => [`p${i}`, { label: s.other ? t.other : s.name }]));
    const data = slices.map((s, i) => ({ key: `p${i}`, value: s.value }));
    return { data, config };
  }, [artifact, t.other]);
  return (
    <ChartContainer config={config} label={t.chartLabel(tx(artifact.title))} className="aspect-auto h-64 w-full">
      <PieChart>
        <ChartTooltip cursor={false} content={<ChartTooltipContent config={config} hideLabel />} />
        <Pie data={data} dataKey="value" nameKey="key" innerRadius={donut ? "58%" : 0} outerRadius="80%" stroke="var(--card)" strokeWidth={2} isAnimationActive={false}>
          {data.map((d) => (
            <Slice key={d.key} fill={`var(--color-${d.key})`} />
          ))}
        </Pie>
        <ChartLegend content={<ChartLegendContent config={config} />} />
      </PieChart>
    </ChartContainer>
  );
}

function Picker({ artifact, onPick, labels }: { artifact: PickerArtifact; onPick: CommonProps["onPick"]; labels?: Partial<ArtifactRendererLabels> }) {
  const { t, tx } = useI18n(labels);
  const uid = useId();
  const multiple = artifact.mode === "multiple";
  const [value, setValue] = useState<string[]>(artifact.defaultValue ?? []);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toggle = (v: string) => setValue((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]));
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await onPick?.(value, artifact);
      if (r && r.error) setError(r.error);
      else setSent(true);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : t.failed);
    }
    setBusy(false);
  };
  const disabled = busy || sent;
  return (
    <div className="flex flex-col gap-3">
      {multiple ? (
        <ul aria-label={tx(artifact.title) || t.choose} className="flex flex-col gap-2">
          {artifact.options.map((o, i) => (
            <li key={o.value}>
              <label className={cn("flex cursor-pointer items-start gap-3 rounded-control border border-border bg-background p-3 text-start", value.includes(o.value) && "border-primary bg-nq-selected", disabled && "cursor-not-allowed opacity-70")}>
                <Checkbox checked={value.includes(o.value)} onCheckedChange={() => toggle(o.value)} disabled={disabled} className="mt-0.5" id={`${uid}-${i}`} />
                <span className="flex min-w-0 flex-col">
                  <span dir="auto" className="text-body-sm text-foreground">
                    {tx(o.label)}
                  </span>
                  {o.description ? (
                    <span dir="auto" className="text-caption text-muted-foreground">
                      {tx(o.description)}
                    </span>
                  ) : null}
                </span>
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <RadioGroup aria-label={tx(artifact.title) || t.choose} value={value[0] ?? null} onValueChange={(v) => setValue([String(v)])} disabled={disabled}>
          {artifact.options.map((o) => (
            <label key={o.value} className={cn("flex cursor-pointer items-start gap-3 rounded-control border border-border bg-background p-3 text-start", value[0] === o.value && "border-primary bg-nq-selected", disabled && "cursor-not-allowed opacity-70")}>
              <Radio value={o.value} className="mt-0.5" />
              <span className="flex min-w-0 flex-col">
                <span dir="auto" className="text-body-sm text-foreground">
                  {tx(o.label)}
                </span>
                {o.description ? (
                  <span dir="auto" className="text-caption text-muted-foreground">
                    {tx(o.description)}
                  </span>
                ) : null}
              </span>
            </label>
          ))}
        </RadioGroup>
      )}
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <div className="flex items-center gap-2">
        <Button variant="primary" onClick={() => void submit()} loading={busy} disabled={sent || value.length === 0}>
          {sent ? (
            <>
              <Check aria-hidden />
              {t.sent}
            </>
          ) : artifact.submitLabel ? (
            tx(artifact.submitLabel)
          ) : (
            t.send
          )}
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ renderer */

export interface ArtifactViewProps extends CommonProps {
  artifact: Artifact;
}

/** Renders one already-validated artifact. Use `ArtifactRenderer` when the data comes from an agent. */
export function ArtifactView({ artifact, allowHtml = false, onAction, onPick, labels }: ArtifactViewProps) {
  const { t, tx } = useI18n(labels);
  switch (artifact.kind) {
    case "card":
      return (
        <Frame
          artifact={artifact}
          note={tx(artifact.footer) || undefined}
          footer={artifact.actions?.length ? <ActionButtons actions={artifact.actions} artifact={artifact} onAction={onAction} labels={labels} /> : undefined}
        >
          {artifact.badges?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {artifact.badges.map((b, i) => (
                <Badge key={i} variant={TONE_BADGE[b.tone ?? "neutral"]}>
                  {tx(b.label)}
                </Badge>
              ))}
            </div>
          ) : null}
          {artifact.fields?.length ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-body-sm">
              {artifact.fields.map((f, i) => (
                <div key={i} className="contents">
                  <dt dir="auto" className="text-muted-foreground">
                    {tx(f.label)}
                  </dt>
                  <dd dir="auto" className="min-w-0 break-words text-foreground">
                    <Cell value={f.value} t={t} />
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
          {artifact.items?.length ? (
            <ul data-slot="artifact-items" className="flex flex-col divide-y divide-border rounded-control border border-border">
              {artifact.items.map((it, i) => (
                <li key={i} className="flex items-start gap-3 px-3 py-2">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span dir="auto" className="flex items-center gap-2 text-body-sm text-foreground">
                      {it.tone ? <ToneDot tone={it.tone} t={t} /> : null}
                      {tx(it.label)}
                    </span>
                    {it.description ? (
                      <span dir="auto" className="text-caption text-muted-foreground">
                        {tx(it.description)}
                      </span>
                    ) : null}
                  </span>
                  {it.value !== undefined ? (
                    <span dir="auto" className="shrink-0 text-body-sm text-foreground tabular-nums">
                      <Cell value={it.value} t={t} />
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          {artifact.body ? <Markdown>{tx(artifact.body)}</Markdown> : null}
        </Frame>
      );
    case "table":
      return (
        <Frame artifact={artifact}>
          <Table label={tx(artifact.title) || undefined}>
            <TableHeader>
              <TableRow>
                {artifact.columns.map((c) => (
                  <TableHead key={c.key} dir="auto" className={cn("text-start", c.align === "end" && "text-end")}>
                    {tx(c.label)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {artifact.rows.map((r, i) => (
                <TableRow key={i}>
                  {artifact.columns.map((c) => (
                    <TableCell key={c.key} dir="auto" className={cn("text-start", (c.align === "end" || typeof r[c.key] === "number") && "text-end tabular-nums")}>
                      <Cell value={r[c.key] ?? null} t={t} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Frame>
      );
    case "chart":
      return (
        <Frame artifact={artifact}>
          <ChartView artifact={artifact} />
        </Frame>
      );
    case "markdown":
      return (
        <Frame artifact={artifact}>
          <Markdown>{artifact.text}</Markdown>
        </Frame>
      );
    case "code":
      return (
        <Frame artifact={artifact}>
          <CodeBlock code={artifact.code} language={artifact.language ?? "text"} filename={artifact.filename} label={tx(artifact.title) || t.source} preClassName="max-h-80" />
        </Frame>
      );
    case "actions":
      return (
        <Frame artifact={artifact}>
          <ActionButtons actions={artifact.actions} artifact={artifact} onAction={onAction} labels={labels} />
        </Frame>
      );
    case "picker":
      return (
        <Frame artifact={artifact}>
          <Picker artifact={artifact} onPick={onPick} labels={labels} />
        </Frame>
      );
    case "stats":
      return (
        <Frame artifact={artifact}>
          <StatGrid>
            {artifact.items.map((s, i) => (
              <StatCard
                key={i}
                data-tone={s.tone}
                label={
                  s.tone ? (
                    <span className="inline-flex items-center gap-1.5">
                      <ToneDot tone={s.tone} t={t} />
                      {tx(s.label)}
                    </span>
                  ) : (
                    tx(s.label)
                  )
                }
                value={s.value}
                {...(s.delta !== undefined ? { delta: s.delta } : {})}
                {...(s.invert ? { invert: true } : {})}
                {...(s.sparkline ? { sparkline: s.sparkline } : {})}
              />
            ))}
          </StatGrid>
        </Frame>
      );
    case "html":
      return (
        <Frame artifact={artifact}>
          {allowHtml ? (
            // Empty sandbox: no scripts, no same-origin, no forms, no top navigation, no popups. The document also carries a CSP.
            <iframe
              title={tx(artifact.title) || t.htmlFrame}
              sandbox=""
              referrerPolicy="no-referrer"
              loading="lazy"
              srcDoc={frameDocument(artifact.html)}
              style={{ height: frameHeight(artifact.height) }}
              className="w-full rounded-control border border-border bg-background"
            />
          ) : (
            <>
              <p className="text-caption text-muted-foreground">{t.htmlAsCode}</p>
              <CodeBlock code={artifact.html} language="html" label={t.source} preClassName="max-h-60" />
            </>
          )}
        </Frame>
      );
  }
}

export interface ArtifactRendererProps extends CommonProps, Omit<ComponentProps<"div">, "children" | "onSelect"> {
  /** Anything an agent produced: an object to validate, or an already parsed result from `parseArtifact`. */
  artifact: unknown;
}

function isParse(v: unknown): v is ArtifactParse {
  return typeof v === "object" && v !== null && "ok" in v && typeof (v as { ok: unknown }).ok === "boolean" && ((v as { ok: boolean }).ok ? "artifact" in v : "error" in v);
}

/**
 * Generative UI: turns an agent's JSON into a card, table, chart, markdown, code block, action row, picker, stat row
 * or (opt in) sandboxed HTML. The input is validated, sized down and rendered with Nasaq components, so a bad or
 * hostile payload shows an error card and never markup. Button presses and picks come back as callbacks.
 */
export function ArtifactRenderer({ artifact, allowHtml, onAction, onPick, labels, className, ...props }: ArtifactRendererProps) {
  const { t } = useI18n(labels);
  const parsed = useMemo(() => (isParse(artifact) ? artifact : parseArtifact(artifact)), [artifact]);
  return (
    <div data-slot="artifact-renderer" data-kind={parsed.ok ? parsed.artifact.kind : "invalid"} className={cn("min-w-0", className)} {...props}>
      {parsed.ok ? (
        <ArtifactView artifact={parsed.artifact} allowHtml={allowHtml} onAction={onAction} onPick={onPick} labels={labels} />
      ) : (
        <Alert tone="warning" icon={TriangleAlert} title={parsed.kind ? t.unsupported : t.invalid}>
          <span dir="ltr" className="text-caption">
            {parsed.error}
          </span>
        </Alert>
      )}
    </div>
  );
}

export interface ArtifactListProps extends CommonProps, Omit<ComponentProps<"div">, "children" | "onSelect"> {
  artifacts: readonly unknown[];
}

/** Several artifacts in a row of the conversation, one after another. Each is validated on its own. */
export function ArtifactList({ artifacts, allowHtml, onAction, onPick, labels, className, ...props }: ArtifactListProps) {
  return (
    <div data-slot="artifact-list" className={cn("flex min-w-0 flex-col gap-3", className)} {...props}>
      {artifacts.map((a, i) => (
        <ArtifactRenderer key={i} artifact={a} allowHtml={allowHtml} onAction={onAction} onPick={onPick} labels={labels} />
      ))}
    </div>
  );
}
