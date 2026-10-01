---
name: limits-editor
title: LimitsEditor
category: forms
status: beta
summary: A per-resource limits form where each row is a number, Unlimited or Inherit, with optional price, overage price, per-key rate limit and spend cap, validation and change tracking.
exports: [LimitsEditor, LimitsEditorProps, LimitsEditorLabels, LimitsSaveResult, LimitResource]
related: [usage-meter, plan-catalog-editor, admin-tenants, field, toggle-group]
story: components-forms-limits-editor
base-ui: [field, toggle-group]
keywords: [limits, quota, rate limit, spend cap, overage, unlimited, inherit, plan, entitlements]
---

# LimitsEditor

The quota rules of a plan, a workspace or an API key, edited in one form. Every resource is one of three things: a number, Unlimited, or Inherit (take the parent's value, which the row shows). Optional columns add a price and an overage price per resource, and a per-key rate limit and spend cap. It validates, marks changed rows and offers Save and Discard. It never persists anything itself.

## When to use

- A plan's or a tenant's entitlements: seats, storage, API calls, AI spend.
- Per-key limits on an API key or a service account.

## When not to use

- Showing usage against a limit: use [`UsageMeter`](../usage-meter/README.md).
- A single number input: use [`Field`](../field/README.md) with `Input`.

## Import

```tsx
import { LimitsEditor, type LimitRules } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { LimitsEditor } from "@fadymondy/nasaq/web";

export function PlanLimits() {
  return (
    <LimitsEditor
      resources={[
        { key: "seats", label: "Seats", unit: "seats" },
        { key: "storage", label: "Storage", unit: "GB" },
      ]}
      defaultValue={{ seats: { mode: "limit", value: 50 }, storage: { mode: "unlimited" } }}
      inherited={{ seats: 10, storage: 100 }}
      onSave={async (rules) => {
        await fetch("/api/limits", { method: "PUT", body: JSON.stringify(rules) });
      }}
    />
  );
}
```

## Anatomy

```
LimitsEditor            data-slot="limits-editor"  (a form)
  limits-editor-list    data-slot="limits-editor-list"
    limits-editor-row   data-slot="limits-editor-row"  data-mode  data-changed
      ToggleGroup       Limit / Unlimited / Inherit
      Field + Input     value, price, overage, rate limit, spend cap
      limits-editor-effective  (Unlimited badge or what Inherit resolves to)
  limits-editor-footer  data-slot="limits-editor-footer"  (when onSave is set)
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `resources` | `LimitResource[]` | required | `{ key, label, description?, unit? }`. |
| `value` / `defaultValue` | `LimitRules` | `{}` | Rules by key: `{ mode, value?, price?, overage?, rateLimit?, spendLimit? }`. A missing key is Inherit. |
| `onValueChange` | `(rules) => void` | none | Called on every edit. |
| `inherited` | `Record<string, number \| null>` | none | What Inherit resolves to; `null` is unlimited. |
| `showPricing` | `boolean` | `false` | Price and overage price columns. |
| `showKeyLimits` | `boolean` | `false` | Per-key rate limit and spend cap. |
| `currency` | `string` | `"USD"` (`"SAR"` in Arabic) | ISO 4217 code for money fields. |
| `onSave` | `(rules) => Promise<void \| { error?: string }>` | none | Adds the footer. Return `{ error }` (or throw) to show a failure. |
| `disabled` | `boolean` | `false` | Read-only form. |
| `labels` | `LimitsEditorLabels` | en / ar | Override any string. |

The pure helpers `validateRules`, `effectiveLimit`, `changedKeys`, `ruleEquals`, `ruleOf`, `hasErrors` and `parseNumberInput` are exported for server-side checks and tests.

## Examples

Pricing and per-key limits:

```tsx
import { LimitsEditor } from "@fadymondy/nasaq/web";

export const Keys = () => (
  <LimitsEditor
    resources={[{ key: "calls", label: "API calls", unit: "calls" }]}
    showPricing
    showKeyLimits
    currency="SAR"
    defaultValue={{ calls: { mode: "limit", value: 100000, overage: 0.0004, rateLimit: 600, spendLimit: 250 } }}
  />
);
```

Arabic: use `NasaqProvider locale="ar"`. Numbers stay left to right; the layout and the segmented control mirror.

## Accessibility

Each row's mode is a labelled segmented control (arrow keys move, Space or Enter selects). Every number input has a visible label and its own error text, tied to it by Base UI Field. The unsaved-change count is in a `role="status"` region. Errors show after the first Save attempt, then update live.

## RTL & i18n

- Logical properties throughout; the footer buttons and the segmented control follow the reading direction.
- Number inputs are forced left to right (`ltr`) so digits keep their order.
- Every string has an English and Arabic default; override with `labels`.

## Styling & tokens

- Row divider is `--border`; the changed dot uses `--primary`.
- Target `[data-slot="limits-editor-row"][data-changed]` to style edited rows.

## Do / Don't

- Do pass `inherited` so Inherit shows the number it stands for.
- Do use Unlimited sparingly; it is an explicit promise, not a default.
- Don't use it for live usage; pair it with `UsageMeter` on a separate screen.

## Related

- [`UsageMeter`](../usage-meter/README.md)
- [`PlanCatalogEditor`](../plan-catalog-editor/README.md)
- [`Field`](../field/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-forms-limits-editor--docs
