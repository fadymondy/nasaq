---
name: usage-meter
title: UsageMeter
category: data-display
status: beta
summary: A quantity used against its limit (count, money or hours) with warning and danger thresholds, an unlimited state, budget burn with a pace projection, and a plan usage panel with an overage estimate strip.
exports: [UsageMeter, UsageMeterProps, UsageKind, UsageMeterLabels, BudgetBurn, BudgetBurnProps, UsageSummary, UsageSummaryProps, UsageItem]
related: [progress, stat-card, price, plan-card, limits-editor]
story: components-data-display-usage-meter
base-ui: [meter]
keywords: [usage, quota, limit, meter, budget, burn, overage, plan, unlimited, threshold]
---

# UsageMeter

How much of a limit is used. `UsageMeter` is one row: label, "used of limit", a bar that turns warning at 75% and danger at 90%, and a line saying so ("Approaching the limit", "Over the limit by 2,000"). It is built on the Nasaq `Meter`. `BudgetBurn` shows a project budget in hours and money with a tick for how much of the period has passed and a projected end figure. `UsageSummary` is the plan usage section: all resources, plus an estimated overage strip.

## When to use

- Seats, storage, API calls, AI spend, project hours against a plan or budget.
- A plan usage or billing page that needs to show what the next invoice will add.

## When not to use

- Work that is running (an upload, an import): use [`Progress`](../progress/README.md).
- A single headline number with a trend: use [`StatCard`](../stat-card/README.md).
- Editing the limits themselves: use [`LimitsEditor`](../limits-editor/README.md).

## Import

```tsx
import { BudgetBurn, UsageMeter, UsageSummary } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { UsageMeter } from "@fadymondy/nasaq/web";

export function Seats() {
  return (
    <>
      <UsageMeter label="Seats" used={46} limit={50} unit="seats" />
      <UsageMeter label="Storage" used={12} limit={null} unit="GB" />
      <UsageMeter label="AI spend" kind="money" currency="USD" used={182} limit={200} />
    </>
  );
}
```

## Anatomy

```
UsageMeter          data-slot="usage-meter"  data-tone="ok|warning|danger|over"  data-unlimited
  usage-meter-label / usage-meter-value
  Meter             data-slot="meter"        (or usage-meter-unlimited badge)
  usage-meter-marker  (when marker is set)
  usage-meter-status  (warning, danger, over)
BudgetBurn          data-slot="budget-burn"
UsageSummary        data-slot="usage-summary"
  usage-overage-strip  usage-overage-total
```

## API

### UsageMeter

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `label` | `ReactNode` | required | What is metered. Localise it. |
| `ariaLabel` | `string` | label when a string | Accessible name when `label` is a node. |
| `used` | `number` | required | Amount used. |
| `limit` | `number \| null` | required | The limit; `null` is unlimited (no bar, an Unlimited badge). |
| `kind` | `"count" \| "money" \| "hours"` | `"count"` | How amounts are formatted. |
| `unit` | `string` | none | Noun after a count ("seats", "GB"). |
| `currency` | `string` | `"USD"` (`"SAR"` in Arabic) | ISO 4217 code for `money`. |
| `thresholds` | `{ warnAt?: number; dangerAt?: number }` | 0.75 and 0.9 | Fractions of the limit for warning and danger. |
| `marker` | `number` | none | Fraction of the period passed; draws a tick on the bar. |
| `hint` | `ReactNode` | remaining amount | End-of-row text such as a projection. |
| `size` | `"sm" \| "md"` | `"md"` | Bar thickness. |
| `labels` | `UsageMeterLabels` | en / ar | Override any string. |

### BudgetBurn

`hours?: { used, budget }`, `money?: { used, budget, currency? }`, `elapsed?: number` (0 to 1), `thresholds`, `labels`. With `elapsed`, each bar projects the end of the period at the current rate.

### UsageSummary

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `planName` | `ReactNode` | required | Shown in the badge. |
| `period` | `ReactNode` | "Current period" | Localised period text. |
| `items` | `UsageItem[]` | required | `{ id, label, used, limit, kind?, unit?, overageRate?, hint? }`. |
| `currency` | `string` | `"USD"` (`"SAR"` in Arabic) | For the estimate and money items. |
| `onUpgrade` | `() => void` | none | Shows Upgrade plan when any item is near or over its limit. |
| `loading` | `boolean` | `false` | Skeleton layout. |

The overage estimate is the sum over items of `max(0, used - limit) * overageRate`. The pure helpers `usageTone`, `usageFraction`, `overageAmount`, `overageTotal` and `burnProjection` are exported too.

## Examples

Budget burn:

```tsx
import { BudgetBurn } from "@fadymondy/nasaq/web";

export const Burn = () => <BudgetBurn hours={{ used: 96, budget: 160 }} money={{ used: 7200, budget: 12000, currency: "USD" }} elapsed={0.5} />;
```

Plan page:

```tsx
import { UsageSummary } from "@fadymondy/nasaq/web";

export const Page = () => (
  <UsageSummary
    planName="Team"
    currency="USD"
    items={[
      { id: "seats", label: "Seats", used: 46, limit: 50, unit: "seats" },
      { id: "calls", label: "API calls", used: 1_200_000, limit: 1_000_000, overageRate: 0.00001 },
    ]}
  />
);
```

Arabic: wrap the app in `NasaqProvider locale="ar"`; the strings switch and the bar fills from the right.

## Accessibility

The bar is a Base UI `meter` with an accessible name and a spoken value ("46 of 50"). The state is written out with an icon and a sentence, so it never depends on colour. Over the limit the sentence has `role="alert"`. The projection and the overage strip are plain text.

## RTL & i18n

- Layout uses logical properties; the fill and the period tick start at the inline start.
- Amounts are formatted with the active locale and isolated with `<bdi>` so "1,200 seats" keeps its order in Arabic.
- Every string has an English and Arabic default; override with `labels`.

## Styling & tokens

- Fill colours come from `--primary`, `--nq-warning`, `--nq-danger` through `Meter`.
- Target `[data-slot="usage-meter"][data-tone="danger"]` for state styling.

## Do / Don't

- Do give an `overageRate` only when the plan really charges past the limit.
- Do pass `elapsed` to a budget so a fast burn is visible before the limit is hit.
- Don't hide unlimited resources; the Unlimited badge tells the reader nothing will run out.
- Don't rely on the bar colour alone to say a limit is close.

## Related

- [`Progress`](../progress/README.md)
- [`StatCard`](../stat-card/README.md)
- [`PlanCard`](../plan-card/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-data-display-usage-meter--docs
