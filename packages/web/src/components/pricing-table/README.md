---
name: pricing-table
title: PricingTable
category: pricing
status: beta
summary: Plans from data with a Monthly / Yearly switch and working subscribe, upgrade and downgrade buttons, plus a feature comparison matrix and a compact plan picker.
exports: [PricingTable, PricingTableProps, PricingPlan, PricingLabels, BillingPeriod, BillingPeriodSwitch, BillingPeriodSwitchProps, PlanComparison, PlanComparisonProps, PlanComparisonRow, PlanComparisonSection, PlanPicker, PlanPickerProps, PlanActionState, planPrice, planAction, yearlySavings, usePricingLabels]
related: [plan-card, upgrade-prompt, price, radio-group, toggle-group]
story: components-pricing-pricing-table
base-ui: [toggle-group, radio-group]
keywords: [pricing, plans, subscribe, subscription, upgrade, downgrade, billing, monthly, yearly, annual, comparison, compare, matrix, checkout, trial, paywall]
---

# PricingTable

Everything a pricing page needs to turn a visitor into a subscriber, built from one list of plans:

- `PricingTable`: a Monthly / Yearly switch (with the yearly saving on a badge) and one [`PlanCard`](../plan-card/README.md) per plan. Each card has a working button that knows the account's current plan: "Start 14-day free trial", "Upgrade · Team", "Downgrade", "Current plan", "Contact sales".
- `PlanComparison`: every feature, plan by plan, with a sticky header holding each plan's name, price and button.
- `PlanPicker`: the same plans as compact radio cards, for an upgrade dialog, checkout or onboarding step.
- `BillingPeriodSwitch`: the Monthly / Yearly switch on its own.

## When to use

- A public pricing page: `PricingTable`, then `PlanComparison` under it.
- An in-app "Plans" or "Billing" page: pass `currentPlanId` so the buttons say Upgrade or Downgrade.
- Choosing a plan inside a dialog or checkout: `PlanPicker`.

## When not to use

- An upgrade popup at the moment someone hits a limit: use [`UpgradeDialog`](../upgrade-prompt/README.md) (it uses `PlanPicker` inside).
- Hand-built cards with custom content: use [`PlanCard`](../plan-card/README.md) and `PlanGrid` directly.
- Selling one-off products: use [`ProductCard`](../product-card/README.md).

## Import

```tsx
import { PricingTable, PlanComparison, PlanPicker, BillingPeriodSwitch, type PricingPlan } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { PricingTable, type PricingPlan } from "@fadymondy/nasaq/web";

const plans: PricingPlan[] = [
  { id: "free", name: "Free", description: "For trying it out.", monthly: 0, features: ["3 projects", "Community support"] },
  {
    id: "pro",
    name: "Pro",
    description: "For growing teams.",
    monthly: 15,
    yearly: 12, // per month, billed yearly
    highlighted: true,
    badge: "Most popular",
    trialDays: 14,
    featuresTitle: "Everything in Free, plus",
    features: ["Unlimited projects", "Priority support"],
  },
  { id: "enterprise", name: "Enterprise", custom: "Custom", features: ["SSO", "SLA"] },
];

export function Pricing() {
  return (
    <PricingTable
      plans={plans}
      onSelect={async (plan, period) => {
        const { url } = await createCheckout(plan.id, period); // your API
        location.assign(url);
      }}
      note="Prices in USD, excluding VAT. Cancel anytime."
    />
  );
}
```

## Anatomy

```
PricingTable                  data-slot="pricing-table"
├─ BillingPeriodSwitch        data-slot="billing-period-switch"   ToggleGroup + "Save N%" badge
├─ PlanGrid > PlanCard × n    see plan-card
│  └─ Button                  label and variant from planAction(); aria-busy while onSelect's promise runs
└─ note

PlanComparison                data-slot="plan-comparison"   <table>, scrolls sideways when narrow
├─ thead (sticky)             plan name, price, optional button per column
└─ tbody                      section heading rows (<th scope="colgroup">) and feature rows (<th scope="row">)

PlanPicker                    data-slot="plan-picker"   RadioGroup > RadioCard × n
```

## API

### `PricingPlan`

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` | Stable id; passed back to you. |
| `name` | `ReactNode` | "Pro". A string is also used in button labels ("Upgrade · Pro"). |
| `description?` | `ReactNode` | Who it is for. |
| `monthly?` | `number` | Price per month, billed monthly. `0` is free. |
| `yearly?` | `number` | Price per month when billed yearly (120 a year is `10`). Shown with the monthly price struck through and "Billed $120 yearly". |
| `perSeat?` | `boolean` | The period reads per seat per month. |
| `custom?` | `ReactNode` | Shown instead of a price ("Custom"); the button becomes "Contact sales". |
| `features?` | `(ReactNode \| PlanFeature)[]` | See [`PlanFeature`](../plan-card/README.md). |
| `featuresTitle?` | `ReactNode` | "Everything in Free, plus". |
| `badge?` | `ReactNode` | "Most popular". |
| `highlighted?` | `boolean` | The recommended plan. At most one. Its button is primary. |
| `trialDays?` | `number` | The button reads "Start 14-day free trial". |
| `cta?` | `ReactNode` | Overrides the button label. |
| `footnote?` | `ReactNode` | Fine print under the button. |

Plans are listed smallest first; the order decides Upgrade versus Downgrade.

### `PricingTable`

`PricingTableProps extends Omit<ComponentProps<"div">, "onSelect">`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `plans` | `PricingPlan[]` | required | Smallest first. Up to four. |
| `currency?` | `string` | `"USD"` | ISO 4217 code. |
| `period?` / `defaultPeriod?` | `BillingPeriod` | `"month"` | Controlled or initial billing period. |
| `onPeriodChange?` | `(period) => void` | none | The switch changed. |
| `currentPlanId?` | `string` | none | The account's plan: its card says "Current plan", others Upgrade or Downgrade. |
| `onSelect?` | `(plan, period) => void \| Promise` | none | A plan's button. Return a promise to keep the button busy (and the others disabled) until it settles. |
| `hidePeriodSwitch?` | `boolean` | `false` | Hides the switch. It is also hidden when no plan has a `yearly` price. |
| `note?` | `ReactNode` | none | One line under the plans. |
| `labels?` | `Partial<PricingLabels>` | locale | Override any built-in string. |

### `BillingPeriodSwitch`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `BillingPeriod` | required | `"month"` or `"year"`. |
| `onValueChange` | `(period) => void` | required | |
| `savings?` | `number` | `0` | Yearly saving in percent, usually `yearlySavings(plans)`. `0` hides the badge. |
| `labels?` | `Partial<PricingLabels>` | locale | |

### `PlanComparison`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `plans` | `PricingPlan[]` | required | The columns. |
| `sections` | `PlanComparisonSection[]` | required | `{ title?, rows: { label, hint?, values: Record<planId, boolean \| ReactNode> }[] }`. `true` is a check, `false` or missing a dash, anything else is shown as text ("10 GB"). |
| `currency?` / `period?` | | `"USD"` / `"month"` | For the header prices. Pass the same `period` as the `PricingTable` above it. |
| `currentPlanId?` | `string` | none | |
| `onSelect?` | `(plan, period) => void` | none | Adds each plan's button to the sticky header. |
| `caption?` | `ReactNode` | none | The table's accessible name (visually hidden). |

### `PlanPicker`

`RadioGroup` props, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `plans` | `PricingPlan[]` | required | |
| `value?` / `defaultValue?` | `string` | none | The chosen plan id. |
| `onValueChange?` | `(planId) => void` | none | |
| `currency?` / `period?` | | `"USD"` / `"month"` | |
| `currentPlanId?` | `string` | none | Shown with a "Current plan" badge and disabled. |

### Helpers

- `planPrice(plan, period)`: `{ amount, compareAt? }` per month, or `null`.
- `yearlySavings(plans)`: the best yearly saving, whole percent.
- `planAction(plan, plans, labels, currentPlanId?)`: `{ label, variant, disabled }` for a plan's button, for building your own cards.
- `usePricingLabels(labels?)`: the locale's strings merged with overrides.

## Examples

### In-app plans page

```tsx
<PricingTable plans={plans} currentPlanId="free" defaultPeriod="year" onSelect={(plan, period) => openCheckout(plan.id, period)} />
```

### Pricing page with a comparison under it

```tsx
const [period, setPeriod] = useState<BillingPeriod>("year");

<PricingTable plans={plans} period={period} onPeriodChange={setPeriod} onSelect={subscribe} />
<h2>Compare plans</h2>
<PlanComparison
  plans={plans}
  period={period}
  onSelect={subscribe}
  caption="Compare plans"
  sections={[
    { title: "Projects", rows: [{ label: "Projects", values: { free: "3", pro: "Unlimited", enterprise: "Unlimited" } }] },
    { title: "Security", rows: [{ label: "SSO", hint: "SAML and OIDC", values: { enterprise: true } }] },
  ]}
/>
```

### Arabic

```tsx
<NasaqProvider locale="ar">
  <div dir="rtl">
    <PricingTable plans={arabicPlans} currency="SAR" onSelect={subscribe} />
  </div>
</NasaqProvider>
```

## Accessibility

- The switch is a `ToggleGroup` named "Billing period"; arrow keys move between Monthly and Yearly.
- Each plan is a named `<article>` (see `PlanCard`). While `onSelect`'s promise runs the button has `aria-busy` and the other buttons are disabled, so double checkouts can't start.
- `PlanComparison` is a real `<table>`: plan names are column headers, features are row headers, section titles are `scope="colgroup"` headers. Checks and dashes carry hidden "Included" / "Not included" text.
- `PlanPicker` is a radio group; the current plan is disabled, not hidden.

| Key | Action |
| --- | --- |
| `Tab` | Switch, then each plan's button. |
| `←` / `→` | Monthly / Yearly inside the switch (reading direction). |
| `↑` / `↓` | Between plans in `PlanPicker`. |

## RTL & i18n

- Built-in strings in English and Arabic follow the Nasaq locale: Monthly, Yearly, Save N%, Billed … yearly, Current plan, Get started, Choose …, Upgrade, Downgrade, Start N-day free trial, Contact sales. Override any with `labels`.
- Prices go through `Price`, formatted for the locale. Plans flow in the reading direction: the first plan is on the right in RTL.
- The comparison table scrolls horizontally on narrow screens; its first column is at the inline start.

## Styling & tokens

- Inherits `PlanCard` tokens. The comparison tints the highlighted column with a 7% `--nq-brand` mix; checks use `text-nq-brand`.
- Target `[data-slot=pricing-table]`, `[data-slot=billing-period-switch]`, `[data-slot=plan-comparison]`, `[data-slot=plan-picker]`.

## Do / Don't

- **Do** show yearly prices as a monthly equivalent, with the monthly price struck through. `yearly` does this for you.
- **Do** pass `currentPlanId` inside the app so nobody is asked to buy the plan they have.
- **Do** return a promise from `onSelect` so the button shows it is working.
- **Don't** highlight more than one plan.
- **Don't** hide the price of a self-serve plan behind "Contact sales"; use `custom` only for plans you sell by talking.

## Related

- [PlanCard](../plan-card/README.md) · [UpgradeDialog](../upgrade-prompt/README.md) · [Price](../price/README.md) · [RadioGroup](../radio-group/README.md) · [ToggleGroup](../toggle-group/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-pricing-pricing-table--docs
