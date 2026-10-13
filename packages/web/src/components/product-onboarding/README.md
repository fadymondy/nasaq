---
name: product-onboarding
title: ProductOnboarding
category: feedback
status: beta
summary: "The first-run flow every Nasaq product shares: workspace → business basics → sample data → connect your AI → invite your team → done. Skippable and resumable from server state."
exports: [ProductOnboarding, ProductOnboardingProps, ProductOnboardingLabels, ProductOnboardingStepBody, PRODUCT_ONBOARDING_STEPS, REQUIRED_ONBOARDING_STEPS, ProductOnboardingStepId, ProductOnboardingState, OnboardingAction, isOptionalStep, onboardingResumeIndex, onboardingOpen, applyOnboardingAction, onboardingProgress]
related: [setup-wizard, onboarding-checklist, mcp-connect, product-shell]
story: components-onboarding-pages-product-onboarding
base-ui: []
keywords: [onboarding, first run, setup, wizard, sample data, demo, mcp, invite, resume, skip, product]
---

# ProductOnboarding

The same first-run flow in every Nasaq product. It runs these steps in a fixed order: confirm the workspace, the
business basics, load sample data, connect an AI app over MCP, and invite the team. The first two are required and
the rest can be skipped. Progress lives on the server, so people resume where they left off, and "Skip setup" leaves
at any point. It is built on `SetupWizard`; the sample-data, connect and invite steps come with their own bodies.

## When to use

- The `/onboarding` page a product opens after "Create business/store".

## When not to use

- A product that is not a business workspace: use `SetupWizard` with your own steps.
- The dashboard reminder: use `OnboardingChecklist` with `onboardingOpen(state)`.

## Import

```tsx
import { ProductOnboarding } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
"use client";
import { Field, FieldLabel, Input, ProductOnboarding, type ProductOnboardingState } from "@fadymondy/nasaq/web";

declare const state: ProductOnboardingState;
declare const api: { post(path: string, body?: unknown): Promise<void> };

export function Onboarding({ onExit }: { onExit: () => void }) {
  return (
    <ProductOnboarding
      product="Matjar"
      state={state}
      workspace={{ content: <Field><FieldLabel>Store name</FieldLabel><Input defaultValue="3x1" /></Field> }}
      business={{ content: <Field><FieldLabel>Currency</FieldLabel><Input defaultValue="EGP" /></Field> }}
      onLoadSampleData={() => api.post("/api/onboarding/sample-data")}
      mcp={{ server: { name: "matjar", url: "https://3x1.matjar.app/api/mcp" } }}
      onInvite={(emails, role) => api.post("/api/team/invites", { emails, role })}
      roles={[{ value: "staff", label: "Staff" }]}
      onAction={(step, action) => api.post("/api/onboarding", { step, action })}
      onExit={onExit}
    />
  );
}
```

## Anatomy

```
ProductOnboarding                 data-slot="product-onboarding"
├─ SetupWizard                    data-step="workspace|business|sample-data|connect-mcp|invite"
│  ├─ workspace (required)        your form
│  ├─ business (required)         your form
│  ├─ sample-data (optional)      built-in: Load sample data → success alert
│  ├─ connect-mcp (optional)      built-in: McpConnectApps
│  ├─ invite (optional)           built-in: emails + role → onInvite
│  └─ done screen                 Open dashboard
└─ Skip setup                     dismiss + onExit
```

## API

**ProductOnboarding**

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `product` | `string` | required | Product name in the page language. |
| `state` | `ProductOnboardingState` | required | `{ completed, skipped?, dismissed?, finishedAt? }` from `GET /api/onboarding`. |
| `workspace` / `business` | `ProductOnboardingStepBody` | required | `{ content, ready?, title?, description? }`. |
| `onLoadSampleData` | `() => AuthSubmitResult \| Promise` | | Omit to drop the step. |
| `mcp` | `Omit<McpConnectAppsProps, "product">` | | Omit to drop the step. |
| `onInvite` | `(emails, role) => AuthSubmitResult \| Promise` | | Omit to drop the step. |
| `roles` | `{ value, label }[]` | | Invite roles; the first is the default. |
| `onAction` | `(step, action) => AuthSubmitResult \| Promise` | required | `action` is `complete`, `skip`, `dismiss` or `finish`. `{ error }` keeps the step. |
| `onExit` | `() => void` | required | Open dashboard / after Skip setup. |
| `labels` / `wizardLabels` | partial labels | built-in EN/AR | |

Helpers (pure): `onboardingResumeIndex(stepIds, state)`, `onboardingOpen(state)`, `applyOnboardingAction(state, step, action, now?)` (the server's rules, for optimistic updates and tests), `onboardingProgress(stepIds, state)`, `isOptionalStep(id)`. Constants: `PRODUCT_ONBOARDING_STEPS`, `REQUIRED_ONBOARDING_STEPS`.

The server contract every product implements: `GET /api/onboarding` → state, and `POST /api/onboarding { step?, action }` → state. `skip` never overrides `complete`. `finish` sets `finishedAt` once.

## Examples

Show the dashboard card while setup is open:

```tsx
import { OnboardingChecklist, PRODUCT_ONBOARDING_STEPS, onboardingOpen, type ProductOnboardingState } from "@fadymondy/nasaq/web";

declare const state: ProductOnboardingState;
export const Resume = () =>
  onboardingOpen(state) ? (
    <OnboardingChecklist items={PRODUCT_ONBOARDING_STEPS.map((id) => ({ id, title: id, done: state.completed.includes(id) || (state.skipped ?? []).includes(id) }))} />
  ) : null;
```

## Accessibility

| Key | Action |
| --- | --- |
| `Tab` | Moves through the step body, then Back · Skip · Continue. |
| `Enter` / `Space` | Activates the focused button. |

The step heading takes focus on every step change. Errors render as `role="alert"`.

## RTL & i18n

Every built-in string has EN and AR copy. Email addresses are entered `dir="ltr"`. Arrows mirror in RTL (from `SetupWizard`).

## Styling & tokens

Inherits `SetupWizard` and `McpConnectApps`. Target `[data-slot=product-onboarding]` and `[data-step]`.

## Do / Don't

- Do mark `workspace` complete on the server when the console creates the business, so people start at step 2.
- Do keep business basics to six fields or fewer.
- Don't add steps; put product extras on the dashboard checklist.

## Related

- [setup-wizard](../setup-wizard/README.md)
- [onboarding-checklist](../onboarding-checklist/README.md)
- [mcp-connect](../mcp-connect/README.md)
- [product-shell](../product-shell/README.md)

## Lab

`https://docs.nasaqui.com/?path=/docs/components-onboarding-pages-product-onboarding--docs`
