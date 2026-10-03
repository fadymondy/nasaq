---
name: admin-tenants
title: AdminWorkspaces
category: admin
status: beta
summary: The tenants and plans console for an admin area. A workspaces table with seat usage, change plan, suspend and reactivate, and a plan catalogue with an edit dialog.
exports: [AdminWorkspaces, AdminPlans, PlanDialog, AdminTenantsLabels, AdminPlan, WorkspaceStatus, AdminWorkspace, AdminTenantResult, AdminWorkspacesProps, PlanDialogProps, AdminPlansProps]
related: [admin-area, admin-users, plan-card, repeater]
story: components-admin-admin-tenants
base-ui: [dialog, alert-dialog, select, switch]
keywords: [admin, workspaces, tenants, plans, pricing, seats, suspend, billing]
---

# AdminWorkspaces

Two screens for the tenant side of a back office. `AdminWorkspaces` lists every workspace; `AdminPlans` shows
the plans and lets an admin edit them. You own the data; actions are async callbacks that return nothing or
`{ error }`.

## When to use

- Admins managing workspaces, their plans and seat limits.

## When not to use

- A customer choosing their own plan: use `PlanGrid` with `PlanCard`.

## Import

```tsx
import { AdminWorkspaces, AdminPlans } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { AdminPlans, AdminWorkspaces } from "@fadymondy/nasaq/web";

export function Tenants({ workspaces, plans }) {
  return (
    <>
      <AdminWorkspaces
        workspaces={workspaces}
        plans={plans}
        onChangePlan={async (w, planId) => { await api.setPlan(w.id, planId); }}
        onSetSuspended={async (w, suspended) => { await api.suspend(w.id, suspended); }}
      />
      <AdminPlans plans={plans} onSavePlan={async (plan) => { await api.savePlan(plan); }} />
    </>
  );
}
```

## Anatomy

```
AdminWorkspaces        data-slot="admin-workspaces": stat tiles, notice, toolbar (search, plan and status facets), DataTable, dialogs
AdminPlans             data-slot="admin-plans": New plan button, PlanGrid of PlanCard, PlanDialog
PlanDialog             name, description, price, seat and storage limits, visibility, features (Repeater)
```

## API

### AdminWorkspaces

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `workspaces` | `AdminWorkspace[]` | required | `{ id, name, slug, owner, planId, status, seatsUsed, createdAt, trialEndsAt? }`. Status: `active`, `trial`, `suspended`. |
| `plans` | `AdminPlan[]` | required | `{ id, name, description?, priceMonthly, currency?, seats, storageGb, features, visible, subscribers?, featured? }`. `null` limits mean unlimited. |
| `onChangePlan` | `(workspace, planId) => result` | none | Adds Change plan. A warning shows when seats exceed the new limit. |
| `onSetSuspended` | `(workspace, suspended) => result` | none | Suspend asks first; reactivate is direct. |
| `onOpen` | `(workspace) => void` | none | |
| `loading`, `error`, `onRetry`, `pageSize`, `hideStats`, `labels` | | | |

### AdminPlans and PlanDialog

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `plans` | `AdminPlan[]` | required | |
| `onSavePlan` | `(plan) => result` | none | Enables New plan and Edit. `plan.id` is undefined for a new one. Return `{ error }` to keep the dialog open. |
| `currency` | `string` | `"USD"` (`"SAR"` in Arabic) | For new plans. |

## Examples

- **Read-only plans**: omit `onSavePlan`.
- **Unlimited**: leave seat or storage limits empty in the dialog; the plan gets `null`.

## Accessibility

Dialogs trap focus and return it; errors use `role="alert"`; the notice is dismissable. Pass `labels` to translate.

## RTL & i18n

Built-in English and Arabic. Slugs and emails are LTR isolates; prices and counts use the locale.

## Styling & tokens

Uses `PlanCard`, `Price`, `Meter` and `Status`. Extend with `className`.

## Do / Don't

- Do warn before a plan change that drops seats below use.
- Do not delete plans that have subscribers; hide them.

## Related

- [AdminArea](../admin-area/README.md)
- [Repeater](../repeater/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-admin-admin-tenants--docs
