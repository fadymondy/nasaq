---
name: ai-usage-cost
title: AiUsageCost
category: ai
status: beta
summary: AI spend overview with total, token, billed, unbilled and marked-up client price tiles, a daily stacked cost chart and a by-model, product or run breakdown with token columns, plus a TokenCostMeter for one run.
exports: [AiUsageCost, AiUsageCostProps, AiUsageCostLabels, TokenCostMeter, TokenCostMeterProps]
related: [usage-meter, ai-model-picker, model-routing-editor, breakdown-table, stat-card]
story: components-ai-ai-usage-cost
base-ui: [tabs]
keywords: [ai, cost, tokens, spend, billing, markup, billed, unbilled, model, run, llm]
---

# AiUsageCost

What the AI features cost. Tiles give the total, the tokens, what has been billed, what is still unbilled and, when you pass a `markup`, the price the client pays. A stacked daily chart splits billed from unbilled spend. Tabs break the cost down by model, product or run, each with input and output token columns. `TokenCostMeter` shows one run: its input, cached and output tokens and, optionally, its spend against a budget.

## When to use

- A billing or admin screen that reports AI spend to an owner or an agency.
- A run detail that needs its token split and budget.

## When not to use

- Plan quotas and limits: use [`UsageMeter`](../usage-meter/README.md).
- General analytics with no cost or token idea: use [`BreakdownTable`](../breakdown-table/README.md) or [`TimeSeriesPanel`](../time-series-panel/README.md).

## Import

```tsx
import { AiUsageCost, TokenCostMeter } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { AiUsageCost } from "@fadymondy/nasaq/web";

export function Costs() {
  return (
    <AiUsageCost
      currency="USD"
      markup={0.2}
      days={[
        { date: "2026-09-28", billed: 12.4, unbilled: 0 },
        { date: "2026-09-29", billed: 0, unbilled: 9.1 },
      ]}
      byModel={[{ id: "opus", label: "Opus 5.5", tokensIn: 2_400_000, tokensOut: 310_000, cost: 21.5 }]}
    />
  );
}
```

## Anatomy

```
AiUsageCost        data-slot="ai-usage-cost"
  StatGrid         total, tokens, billed, unbilled, client price
  Card + BarChart  stacked billed / unbilled per day
  Tabs             By model | By product | By run  (only tabs that have rows)
    BreakdownTable cost, share, change, In and Out token columns
TokenCostMeter     data-slot="token-cost-meter"
```

## API

### AiUsageCost

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `days` | `AiCostDay[]` | required | `{ date: "YYYY-MM-DD", billed, unbilled }`, oldest first. |
| `byModel` / `byProduct` / `byRun` | `AiCostRow[]` | none | `{ id, label, tokensIn, tokensOut, cost, previous? }`. A tab appears for each one given. |
| `markup` | `number` | none | Fraction over provider cost (0.2 is +20%). Adds the client price tile. |
| `previousTotal` | `number` | none | Adds the change on the total tile (a rise is the bad tone). |
| `currency` | `string` | `"USD"` | ISO 4217 code. |
| `loading` | `boolean` | `false` | Skeletons in tiles and tables. |
| `labels` | `AiUsageCostLabels` | en / ar | Override any string. |

### TokenCostMeter

`tokensIn`, `tokensOut`, `cached` (part of `tokensIn`), `cost`, `budget` (`number` or `null` for none; with `cost` it adds a `UsageMeter` in money), `currency`, `labels`.

Pure helpers `costTotals`, `withMarkup`, `sumTokens`, `tokenSplit`, `costPerMillion` and `totalTokens` are exported for reports and tests.

## Examples

A run with a budget:

```tsx
import { TokenCostMeter } from "@fadymondy/nasaq/web";

export const Run = () => <TokenCostMeter tokensIn={182_000} tokensOut={24_000} cached={120_000} cost={1.42} budget={2} />;
```

Arabic: use `NasaqProvider locale="ar"`. Model and run names stay left to right; the chart axis mirrors.

## Accessibility

The chart has a text name and the same data is in the breakdown tables. The token split bar is an image with a spoken summary and a visible legend with numbers. Trend on cost is text and an arrow, never colour alone.

## RTL & i18n

- Logical properties; the chart axes reverse in Arabic.
- Money and token counts use the active locale with Latin digits by default; row labels are `dir="ltr"`.
- Every string has an English and Arabic default.

## Styling & tokens

- Billed uses `--primary`, unbilled `--nq-warning`; the token bar adds `--nq-info` for cached.
- Target `[data-slot="ai-usage-cost"]` or `[data-slot="token-cost-meter"]`.

## Do / Don't

- Do show billed and unbilled together; unbilled is what surprises people.
- Do pass `previousTotal` so the total has context.
- Don't put vendor logos in the label; names are text.

## Related

- [`UsageMeter`](../usage-meter/README.md)
- [`BreakdownTable`](../breakdown-table/README.md)
- [`ModelRoutingEditor`](../model-routing-editor/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-ai-ai-usage-cost--docs
