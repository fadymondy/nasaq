---
name: rates-subscriptions
title: Rates and Subscriptions
category: commerce
status: beta
summary: Effective-dated bill and cost rates, per-project recurring subscriptions with month-end clamping, and an organisation billing overview.
exports: [RatesSubscriptionsLabels, Rate, RateScheduleProps, RateSchedule, SubscriptionStatus, SubscriptionSchedule, Subscription, SubscriptionInput, subscriptionCharges, subscriptionMonthly, RecurringSubscriptionsProps, RecurringSubscriptions, BillingOverviewProps, BillingOverview]
related: [cron-builder, usage-meter, plan-card, time-tracker, stat-card]
story: components-commerce-rates-and-subscriptions
base-ui: [dialog, select, switch]
keywords: [rates, bill rate, cost rate, subscription, recurring, billing, mrr, proration]
---

# Rates and Subscriptions

Rates that change over time without repricing old work, subscriptions that renew on a cycle or a cron schedule (per project or for
the whole organisation), and an overview of what is billed each month and what is due soon. Money is integer minor units and every
division rounds half up.

## When to use

- Agencies and studios pricing time by the hour, and tracking recurring costs or revenue.

## When not to use

- Choosing a plan on a pricing page: use `PlanCard`.
- Metered usage: use `UsageMeter`.

## Import

```tsx
import { BillingOverview, RateSchedule, RecurringSubscriptions } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<RateSchedule rates={rates} currency="EGP" onAdd={async ({ amount, from }) => api.addRate(amount, from)} />
<RecurringSubscriptions subscriptions={subs} currency="EGP" onSave={save} onStatusChange={setStatus} />
<BillingOverview subscriptions={subs} currency="EGP" />
```

## Anatomy

```
RateSchedule             data-slot="rate-schedule"             current rate, margin, history with changes, Add dialog
RecurringSubscriptions   data-slot="recurring-subscriptions"   list, editor dialog (cycle or cron), cancel dialog
BillingOverview          data-slot="billing-overview"          stat cards, split by project, upcoming charges
```

## API

Read the exported prop types in `rates-subscriptions.tsx` for the exact fields. In short:

- `RateSchedule`: `rates` (`id`, `amount`, `from`), `currency`, optional `today`, `marginAgainst`, `onAdd`, `onRemove`, `loading`, `labels`. A rate holds until the next one starts. Omit `onAdd` for read only. Remove is in the row's context menu.
- `RecurringSubscriptions`: `subscriptions`, `currency`, optional `projects`, `today`, `onSave(input, id?)`, `onStatusChange`, `loading`, `labels`. The schedule is a cycle (`every` and `unit`) or a cron expression. Pause, resume, edit and cancel are in each row's context menu.
- `BillingOverview`: `subscriptions`, `currency`, optional `today`, `loading`, `labels`. Only active subscriptions count.

Pure helpers: `rateAt`, `sortRates`, `rateSegments`, `checkRate`, `amountForWork`, `marginBps`, `nextOccurrences`, `cycleAround`, `prorate`,
`cycleMonthlyEquivalent`, `monthlyRecurring`. `nextOccurrences` counts months from the anchor, so 31 January gives 28 February then 31 March.

## Examples

### Price tracked time

```tsx
amountForWork([{ day: "2026-03-30", minutes: 90 }], rates); // each entry uses the rate in force that day
```

### Prorate a mid-cycle change

```tsx
prorate(3000, "2026-09-01", "2026-10-01", "2026-09-16"); // 1500
```

## Accessibility

| Key | Action |
| --- | --- |
| Tab | Move through buttons, rows and dialog fields. |
| Enter | Submit the open dialog. |
| Escape | Close the dialog (not while busy). |
| Shift+F10 or Menu | Open a row's actions. |

- Rate changes are a sign, an arrow and text, not colour alone.
- Dialog problems use `role="alert"`.

## RTL & i18n

Built-in English and Arabic, and a `labels` prop to override. Cron descriptions follow the locale. Amounts and dates use `Intl`.

## Styling & tokens

Card, surface, border, primary and status tokens only. Target the `data-slot` values above and extend with `className`. No raw hex.

## Do / Don't

- Do store dates as day keys, not timestamps.
- Do keep old rates: a change adds a rate, it does not edit history.
- Don't compute money in floats.

## Related

- `cron-builder`, `usage-meter`, `stat-card`

## Lab

Storybook: Components / Commerce / Rates and Subscriptions.
