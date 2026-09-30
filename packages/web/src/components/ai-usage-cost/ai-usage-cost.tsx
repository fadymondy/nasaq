"use client";

import { Coins, Cpu, ReceiptText, Sparkles, Wallet } from "lucide-react";
import { type ComponentProps, type ReactNode, useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { BreakdownTable, type BreakdownColumn, type BreakdownRow } from "../breakdown-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { ChartContainer, type ChartConfig, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, useChartAxis } from "../chart";
import { parseAnalyticsDay } from "../metric-tiles/analytics-shared";
import { type FormatNumberOptions, formatDate, formatNumber } from "../numeric";
import { StatCard, StatGrid } from "../stat-card";
import { Tabs, TabsList, TabsPanel, TabsTab } from "../tabs";
import { UsageMeter } from "../usage-meter";
import { type AiCostDay, type AiCostRow, costTotals, sumTokens, tokenSplit, withMarkup } from "./usage-cost-math";

const STRINGS = {
  en: {
    total: "Total cost",
    tokens: "Tokens",
    billed: "Billed",
    unbilled: "Unbilled",
    clientPrice: (pct: string) => `Client price (+${pct})`,
    daily: "Cost per day",
    dailyHint: "Billed and unbilled spend, by day",
    model: "Model",
    product: "Product",
    run: "Run",
    byModel: "By model",
    byProduct: "By product",
    byRun: "By run",
    tokensIn: "In",
    tokensOut: "Out",
    cost: "Cost",
    vsPrevious: "vs previous period",
    breakdownBy: "Cost breakdown",
    chartLabel: (n: number) => `Daily cost, ${n} days`,
    input: "Input",
    output: "Output",
    cached: "Cached",
    budget: "Run budget",
    tokenSplit: "Token split",
    tokenTotal: (n: string) => `${n} tokens`,
  },
  ar: {
    total: "إجمالي التكلفة",
    tokens: "الرموز",
    billed: "مفوتر",
    unbilled: "غير مفوتر",
    clientPrice: (pct: string) => `سعر العميل (+${pct})`,
    daily: "التكلفة اليومية",
    dailyHint: "الإنفاق المفوتر وغير المفوتر حسب اليوم",
    model: "النموذج",
    product: "المنتج",
    run: "التشغيل",
    byModel: "حسب النموذج",
    byProduct: "حسب المنتج",
    byRun: "حسب التشغيل",
    tokensIn: "دخل",
    tokensOut: "خرج",
    cost: "التكلفة",
    vsPrevious: "مقارنة بالفترة السابقة",
    breakdownBy: "تفصيل التكلفة",
    chartLabel: (n: number) => `التكلفة اليومية، ${n} يومًا`,
    input: "الإدخال",
    output: "الإخراج",
    cached: "مخزّن مؤقتًا",
    budget: "ميزانية التشغيل",
    tokenSplit: "توزيع الرموز",
    tokenTotal: (n: string) => `${n} رمز`,
  },
};

export type AiUsageCostLabels = Partial<typeof STRINGS.en>;

function useLabels(labels?: AiUsageCostLabels) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  return { locale, t: { ...STRINGS[locale.startsWith("ar") ? "ar" : "en"], ...labels } };
}

export interface AiUsageCostProps extends Omit<ComponentProps<"div">, "children"> {
  /** Daily spend, oldest first. */
  days: readonly AiCostDay[];
  /** Cost by model. */
  byModel?: readonly AiCostRow[];
  /** Cost by product or feature. */
  byProduct?: readonly AiCostRow[];
  /** Cost by run, task or job. */
  byRun?: readonly AiCostRow[];
  /** Markup on provider cost as a fraction: 0.2 is +20%. Adds the client-price tile. */
  markup?: number;
  /** Total cost of the previous period, adds a change to the total tile. */
  previousTotal?: number;
  /** ISO 4217 code. Default "USD". */
  currency?: string;
  loading?: boolean;
  labels?: AiUsageCostLabels;
}

/**
 * AI spend at a glance: total, tokens, billed, unbilled and the client price with markup, a daily stacked bar
 * of billed and unbilled cost, and a breakdown by model, product or run with token columns.
 */
export function AiUsageCost({ days, byModel, byProduct, byRun, markup, previousTotal, currency = "USD", loading = false, labels, className, ...props }: AiUsageCostProps) {
  const { locale, t } = useLabels(labels);
  const { xAxis, yAxis } = useChartAxis();
  const totals = useMemo(() => costTotals(days), [days]);
  const primary = byModel ?? byProduct ?? byRun ?? [];
  const tokens = useMemo(() => sumTokens(primary), [primary]);
  const money = (max = 2): FormatNumberOptions => ({ style: "currency", currency, maximumFractionDigits: max });
  const cfg: ChartConfig = { billed: { label: t.billed, color: "var(--primary)" }, unbilled: { label: t.unbilled, color: "var(--nq-warning)" } };
  const data = days.map((d) => ({ label: formatDate(parseAnalyticsDay(d.date), locale, { day: "numeric", month: "short" }), billed: d.billed, unbilled: d.unbilled }));
  const delta = previousTotal && previousTotal > 0 ? (totals.total - previousTotal) / previousTotal : undefined;

  const tabs = [
    { id: "model", label: t.byModel, dim: t.model, rows: byModel },
    { id: "product", label: t.byProduct, dim: t.product, rows: byProduct },
    { id: "run", label: t.byRun, dim: t.run, rows: byRun },
  ].filter((x) => x.rows && x.rows.length > 0);

  return (
    <div data-slot="ai-usage-cost" className={cn("flex min-w-0 flex-col gap-4", className)} {...props}>
      <StatGrid>
        <StatCard loading={loading} icon={<Wallet />} label={t.total} value={totals.total} format={money(0)} delta={delta} deltaLabel={t.vsPrevious} invert />
        <StatCard loading={loading} icon={<Cpu />} label={t.tokens} value={tokens.total} format={{ notation: "compact", maximumFractionDigits: 1 }} />
        <StatCard loading={loading} icon={<ReceiptText />} label={t.billed} value={totals.billed} format={money()} />
        <StatCard loading={loading} icon={<Coins />} label={t.unbilled} value={totals.unbilled} format={money()} />
        {markup !== undefined ? (
          <StatCard
            loading={loading}
            icon={<Sparkles />}
            label={t.clientPrice(formatNumber(markup, locale, { style: "percent", maximumFractionDigits: 0 }))}
            value={withMarkup(totals.total, markup)}
            format={money()}
          />
        ) : null}
      </StatGrid>

      <Card>
        <CardHeader>
          <CardTitle as="h3" className="text-h3">
            {t.daily}
          </CardTitle>
          <CardDescription>{t.dailyHint}</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={cfg} label={`${t.daily}. ${t.chartLabel(days.length)}`} className="aspect-auto h-52">
            <BarChart data={data} barCategoryGap={4}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={20} {...xAxis} />
              <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={(v: number) => formatNumber(v, locale, { style: "currency", currency, notation: "compact", maximumFractionDigits: 0 })} {...yAxis} />
              <ChartTooltip content={<ChartTooltipContent config={cfg} valueFormat={money()} />} />
              <ChartLegend content={<ChartLegendContent config={cfg} />} />
              <Bar dataKey="billed" stackId="c" fill="var(--color-billed)" isAnimationActive={false} />
              <Bar dataKey="unbilled" stackId="c" fill="var(--color-unbilled)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {tabs.length > 0 ? (
        <Tabs defaultValue={tabs[0]!.id}>
          <TabsList aria-label={t.breakdownBy}>
            {tabs.map((x) => (
              <TabsTab key={x.id} value={x.id}>
                {x.label}
              </TabsTab>
            ))}
          </TabsList>
          {tabs.map((x) => (
            <TabsPanel key={x.id} value={x.id} className="pt-3">
              <CostTable rows={x.rows!} dimension={x.dim} label={x.label} currency={currency} loading={loading} t={t} />
            </TabsPanel>
          ))}
        </Tabs>
      ) : null}
    </div>
  );
}

function CostTable({ rows, dimension, label, currency, loading, t }: { rows: readonly AiCostRow[]; dimension: ReactNode; label: string; currency: string; loading: boolean; t: typeof STRINGS.en }) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const byId = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);
  const breakdown: BreakdownRow[] = rows.map((r) => ({ id: r.id, label: r.label, value: r.cost, previous: r.previous }));
  const compact = (n: number) => formatNumber(n, locale, { notation: "compact", maximumFractionDigits: 1 });
  const columns: BreakdownColumn[] = [
    { id: "in", header: t.tokensIn, align: "end", cell: (r) => <bdi>{compact(byId.get(r.id)?.tokensIn ?? 0)}</bdi> },
    { id: "out", header: t.tokensOut, align: "end", cell: (r) => <bdi>{compact(byId.get(r.id)?.tokensOut ?? 0)}</bdi> },
  ];
  return <BreakdownTable rows={breakdown} label={`${t.breakdownBy}: ${label}`} dimensionLabel={dimension} valueLabel={t.cost} format={{ style: "currency", currency, maximumFractionDigits: 2 }} columns={columns} invert ltrLabels loading={loading} />;
}

export interface TokenCostMeterProps extends Omit<ComponentProps<"div">, "children"> {
  tokensIn: number;
  tokensOut: number;
  /** Part of `tokensIn` that was served from the cache. */
  cached?: number;
  /** Cost of the run so far. */
  cost?: number;
  /** Budget for the run. Adds a spend meter. */
  budget?: number | null;
  currency?: string;
  labels?: AiUsageCostLabels;
}

/** One run's tokens split into input, output and cached, with an optional spend meter against its budget. */
export function TokenCostMeter({ tokensIn, tokensOut, cached = 0, cost, budget, currency = "USD", className, labels, ...props }: TokenCostMeterProps) {
  const { locale, t } = useLabels(labels);
  const split = tokenSplit(tokensIn, tokensOut, cached);
  const n = (v: number) => formatNumber(v, locale, { notation: "compact", maximumFractionDigits: 1 });
  const parts = [
    { key: "input", label: t.input, value: tokensIn - Math.min(cached, tokensIn), share: split.input, color: "var(--primary)" },
    { key: "cached", label: t.cached, value: Math.min(cached, tokensIn), share: split.cached, color: "var(--nq-info)" },
    { key: "output", label: t.output, value: tokensOut, share: split.output, color: "var(--nq-warning)" },
  ];
  return (
    <div data-slot="token-cost-meter" className={cn("flex min-w-0 flex-col gap-3", className)} {...props}>
      <div className="flex items-baseline justify-between gap-3 text-body-sm">
        <span className="text-label text-foreground">{t.tokenSplit}</span>
        <bdi className="text-muted-foreground tabular-nums">{t.tokenTotal(n(tokensIn + tokensOut))}</bdi>
      </div>
      <div role="img" aria-label={parts.map((p) => `${p.label} ${n(p.value)}`).join(", ")} className="flex h-2 overflow-hidden rounded-full bg-nq-surface-soft" dir="ltr">
        {parts.map((p) => (p.share > 0 ? <span key={p.key} className="h-full" style={{ width: `${p.share * 100}%`, background: p.color }} /> : null))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-muted-foreground">
        {parts.map((p) => (
          <li key={p.key} className="flex items-center gap-1.5">
            <span aria-hidden className="size-2 rounded-full" style={{ background: p.color }} />
            {p.label}
            <bdi className="text-foreground tabular-nums">{n(p.value)}</bdi>
          </li>
        ))}
      </ul>
      {budget !== undefined && cost !== undefined ? <UsageMeter label={t.budget} used={cost} limit={budget} kind="money" currency={currency} size="sm" /> : null}
    </div>
  );
}
