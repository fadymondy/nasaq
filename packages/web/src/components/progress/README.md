---
name: progress
title: Progress
category: feedback
status: stable
summary: Progress bar for work under way (with an indeterminate state and tones) and Meter for a quantity against a limit that turns warning and danger past thresholds. Wraps Base UI Progress and Meter.
exports: [Progress, Meter, ProgressProps, MeterProps, ProgressTone, ProgressSize]
related: [spinner, states, alert, badge, status]
story: components-feedback-progress
base-ui: [progress, meter]
keywords: [progress, meter, quota, budget, usage, upload, loading, bar, gauge]
---

# Progress

Two thin bars that look alike and mean different things. `Progress` shows **a task moving toward done**: an
upload, an import, a setup. `Meter` shows **an amount against a limit**: seats used, storage, a monthly budget.
The fill starts at the inline start, so it grows from the right in Arabic.

## When to use

- `Progress`: something with a start and an end that takes long enough to see. Pass `value={null}` when the length is unknown.
- `Meter`: a quota or budget where crossing a threshold matters. It changes tone for you.

## When not to use

- A short wait with no length: use [`Spinner`](../spinner/README.md) or a [`LoadingState`](../states/README.md).
- A rating or score: use [`Rating`](../rating/README.md).
- A single status word: use [`Status`](../status/README.md) or [`Badge`](../badge/README.md).
- A written warning about a limit: pair a `Meter` with an [`Alert`](../alert/README.md).

## Import

```tsx
import { Meter, Progress } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Progress } from "@fadymondy/nasaq/web";

export function Upload({ percent }: { percent: number }) {
  return <Progress value={percent} label="Uploading files" />;
}
```

## Anatomy

```
Progress / Meter          Base UI Root (role="progressbar" / role="meter")   data-slot="progress" | "meter"
├─ head                   label + value row (when label or showValue)        data-slot="progress-head"
└─ track                                                                     data-slot="progress-track" | "meter-track"
   └─ indicator           the fill                                           data-slot="progress-indicator" | "meter-indicator"
```

Both roots carry `data-tone` with the tone in use.

## API

### `Progress`

`ProgressProps` extends `ComponentProps<"div">` (without `children`).

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `number \| null` | required | Current value. `null` is indeterminate. |
| `tone?` | `"default" \| "info" \| "success" \| "warning" \| "danger"` | `"default"` | Fill colour. Set `success` when it completes. |
| `label?` | `ReactNode` | none | Visible name above the bar. Without one, pass `aria-label`. |
| `showValue?` | `boolean` | `true` when `label` is set | Shows the formatted value at the inline end. Hidden while indeterminate. |
| `valueText?` | `ReactNode` | formatted value | Replaces the visible value text ("45 of 50 seats"). |
| `format?` | `Intl.NumberFormatOptions` | percentage of the range | How the value is formatted. |
| `locale?` | `Intl.LocalesArgument` | runtime locale | Locale for numbers, e.g. `"ar-SA"`. |
| `size?` | `"sm" \| "md"` | `"md"` | Track height: 4px or 8px. |
| `min?` / `max?` | `number` | `0` / `100` | Range. |

### `Meter`

`MeterProps` shares the props above (`label`, `showValue`, `valueText`, `format`, `locale`, `size`, `min`, `max`) and has:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `number` | required | Current amount. Never `null`. |
| `warnAt?` | `number` | `0.8` | Fraction of the range at which the fill turns `warning`. |
| `dangerAt?` | `number` | `0.95` | Fraction of the range at which the fill turns `danger`. |
| `tone?` | `ProgressTone` | derived | Forces a tone and skips the thresholds. |

## Examples

### Unknown length, then determinate

```tsx
import { Progress } from "@fadymondy/nasaq/web";

export function Import({ percent }: { percent: number | null }) {
  return (
    <Progress
      value={percent}
      tone={percent === 100 ? "success" : "default"}
      label={percent === null ? "Preparing…" : "Importing"}
    />
  );
}
```

### Quota with visible text

```tsx
import { Meter } from "@fadymondy/nasaq/web";

export function Seats() {
  return <Meter value={42} max={50} label="Seats" valueText="42 of 50" />;
}
```

### Budget in Arabic, custom thresholds

```tsx
import { Meter } from "@fadymondy/nasaq/web";

export function BudgetAr() {
  return (
    <Meter
      value={7200}
      max={10000}
      warnAt={0.7}
      dangerAt={0.9}
      locale="ar-SA"
      format={{ style: "currency", currency: "USD", maximumFractionDigits: 0 }}
      label="ميزانية الذكاء الاصطناعي"
    />
  );
}
```

## Accessibility

- `Progress` is `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax` (no `aria-valuenow` when indeterminate). `Meter` is `role="meter"`.
- The `label` names the bar. If you omit `label`, pass `aria-label` or `aria-labelledby`.
- Colour is never the only carrier: the value text stays visible, and a threshold crossing should be backed by text (an [`Alert`](../alert/README.md) or `valueText`).
- Nothing is focusable and no keys apply.
- Indeterminate uses a pulse that stops under `prefers-reduced-motion`; width changes do not animate then either.

## RTL & i18n

- The fill is positioned with `inset-inline-start`, so it grows from the right in RTL. The head row (label, value) mirrors with the document.
- Numbers format with `locale` (pass `"ar-SA"` for Arabic-Indic digits). The component has no built-in strings; localise `label` and `valueText`.

## Styling & tokens

- Track `bg-nq-surface-soft`, fill `bg-primary` (default) or `bg-nq-info` / `-success` / `-warning` / `-danger`; `rounded-full`; 300ms width transition on `ease-nq`.
- Target `[data-slot=progress]`, `[data-slot=meter]`, `[data-tone=warning]`, `progress-track`, `progress-indicator`. Extend with `className`; set the width with a wrapper or `className` (the bar is `w-full`).

## Do / Don't

- **Do** use `Meter` for limits and `Progress` for tasks; the semantics differ for assistive tech.
- **Do** show the numbers ("42 of 50"), not just the bar.
- **Don't** use `danger` on a `Progress` unless the task failed; stop the bar and show an [`Alert`](../alert/README.md).
- **Don't** fake a percentage for unknown work: use `value={null}`.

## Related

- [Spinner](../spinner/README.md) · [States](../states/README.md) · [Alert](../alert/README.md) · [Status](../status/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-feedback-progress--docs
