---
name: plan-catalog-editor
title: PlanCatalogEditor
category: pricing
status: beta
summary: Admin editor for a product catalog (plans, features, apps, pay-as-you-go prices and bundles) that edits a draft and publishes it through a sync preview dry run and an apply step.
exports: [PlanCatalogEditor, PlanCatalogEditorProps, PlanCatalogEditorLabels, CatalogPreviewResult, CatalogApplyResult]
related: [admin-tenants, plan-card, price, repeater, limits-editor]
story: components-pricing-plan-catalog-editor
base-ui: [tabs, dialog, checkbox, switch, select, field]
keywords: [catalog, plans, pricing, features, apps, bundles, payg, sync, dry run, admin]
---

# PlanCatalogEditor

Where an admin shapes what the product sells. Five tabs edit a **draft**: Plans, Features, Apps, Pay as you go, Bundles. Nothing is live until the admin opens the sync preview, a dry run that lists what will be added, updated (with the fields that change) and removed, and applies it. The Plans tab is the existing `AdminPlans` (cards, plan dialog, feature list), shared rather than copied, so plan editing looks and behaves the same as in the tenants console.

## When to use

- An admin or back-office screen that manages a pricing catalog.
- Any editor where a batch of changes should be reviewed before it goes live.

## When not to use

- Showing plans to customers: use [`PlanCard`](../plan-card/README.md).
- Per-workspace plan assignment: use [`AdminWorkspaces`](../admin-tenants/README.md).
- Just the quota numbers of one plan: use [`LimitsEditor`](../limits-editor/README.md).

## Import

```tsx
import { PlanCatalogEditor, type PlanCatalog } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { PlanCatalogEditor } from "@fadymondy/nasaq/web";

export function Catalog({ catalog }: { catalog: PlanCatalog }) {
  return (
    <PlanCatalogEditor
      catalog={catalog}
      currency="USD"
      onPreview={async (draft) => api.dryRun(draft)} // optional: { changes?, warnings?, error? }
      onApply={async (draft) => {
        await api.publish(draft);
      }}
    />
  );
}
```

## Anatomy

```
PlanCatalogEditor         data-slot="plan-catalog-editor"
  plan-catalog-toolbar    unpublished count, Discard, Review and apply
  Tabs                    plans | features | apps | payg | bundles
    AdminPlans            (Plans tab, shared with admin-tenants)
    Repeater rows         (the other tabs)
  Dialog                  data-slot="plan-catalog-preview"  counts, change list, warnings, blocking issues
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `catalog` | `PlanCatalog` | required | What is live: `{ apps, features, plans, payg, bundles }`. Pass a stable value; when its contents change the draft resets to it. |
| `onPreview` | `(draft) => Promise<CatalogPreviewResult \| void>` | local diff | Your server-side dry run. Return `changes` to replace the local diff, `warnings` to show, or `error`. |
| `onApply` | `(draft) => Promise<void \| { error?: string }>` | none | Publishes. Return `{ error }` or throw to keep the preview open. Without it the preview is read-only. |
| `onChange` | `(draft) => void` | none | Called on every edit. |
| `currency` | `string` | `"USD"` | ISO 4217 code for prices. |
| `planLabels` | `AdminTenantsLabels` | en / ar | Labels for the plan cards and plan dialog. |
| `loading` | `boolean` | `false` | Skeleton for the tabs. |
| `labels` | `PlanCatalogEditorLabels` | en / ar | Override any string. |

Row types: `CatalogApp` (`id, name, description?, enabled`), `CatalogFeature` (`id, name, appId?`), `PaygPrice` (`id, name, unit, unitPrice, freeUnits?`), `CatalogBundle` (`id, name, price, appIds`), and `AdminPlan` from `admin-tenants`. Ids of rows that already exist in the live catalog are read-only; changing one would be a delete plus an add.

The pure helpers `diffCatalog`, `countChanges`, `catalogIssues`, `makeId` and `emptyCatalog` are exported for server code and tests. Apply is blocked while `catalogIssues` reports an empty name, a duplicate id or a reference to a missing app.

## Examples

Server-side dry run with warnings:

```tsx
import { PlanCatalogEditor } from "@fadymondy/nasaq/web";

export const Dry = ({ catalog }: { catalog: PlanCatalog }) => (
  <PlanCatalogEditor
    catalog={catalog}
    onPreview={async (draft) => {
      const r = await api.dryRun(draft);
      return { changes: r.changes, warnings: r.subscribersAffected ? [`${r.subscribersAffected} workspaces change price`] : [] };
    }}
    onApply={api.publish}
  />
);
```

Arabic: use `NasaqProvider locale="ar"`; pass Arabic `labels` and `planLabels` if you override any string.

## Accessibility

Tabs are Base UI Tabs with arrow-key navigation; each tab carries a badge with its number of unpublished changes and a spoken name for it. The unpublished count is a `role="status"` region. The preview is a modal dialog with a labelled title; each change lists its kind as text and an icon, never colour alone. Repeater rows reorder and remove by keyboard.

## RTL & i18n

- Logical properties throughout; the tab underline, the row layouts and the dialog mirror.
- Ids, keys and prices are left to right; field names in the preview are isolated with `dir="ltr"`.
- Every string has an English and Arabic default.

## Styling & tokens

- Status tones use `--nq-success`, `--nq-info` and `--nq-danger` via `Badge`.
- Target `[data-slot="plan-catalog-toolbar"]` to restyle the bar.

## Do / Don't

- Do run a real dry run on the server in `onPreview` when applying has side effects such as repricing subscribers.
- Do keep ids stable; they are how the diff matches rows.
- Don't put unsaved changes anywhere else; the draft lives in this component until applied.

## Related

- [`AdminPlans`](../admin-tenants/README.md)
- [`Repeater`](../repeater/README.md)
- [`LimitsEditor`](../limits-editor/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-pricing-plan-catalog-editor--docs
