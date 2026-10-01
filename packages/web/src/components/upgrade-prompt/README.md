---
name: upgrade-prompt
title: UpgradeDialog
category: pricing
status: beta
summary: The in-app ways to ask for an upgrade — a promotion popup with plans and an offer countdown, a banner, a sidebar card, a feature gate and a Pro badge.
exports: [UpgradeDialog, UpgradeDialogProps, UpgradeOffer, UpgradeBanner, UpgradeBannerProps, UpgradeCard, UpgradeCardProps, FeatureGate, FeatureGateProps, PlanBadge, PlanBadgeProps, UpgradeLabels]
related: [pricing-table, plan-card, dialog, usage-meter, app-shell]
story: components-pricing-upgrade-prompt
base-ui: [dialog]
keywords: [upgrade, upsell, paywall, promotion, promo, popup, modal, trial, limit, gate, locked, pro, badge, offer, countdown, subscribe]
---

# UpgradeDialog

The places inside an app where people decide to pay. Each one leads with what they get, shows the price, and goes straight to checkout:

- `UpgradeDialog`: the promotion popup. A brand hero, three to five benefits, a Monthly / Yearly switch, one price or a [`PlanPicker`](../pricing-table/README.md), an optional time-limited offer with a live countdown, and one button.
- `UpgradeBanner`: a strip at the top of a page: trial ending, limit near, offer.
- `UpgradeCard`: the nudge in the sidebar footer, with an optional usage bar. Shrinks to an icon when the sidebar is collapsed.
- `FeatureGate`: wraps a paid feature. Locked, it shows a blurred preview with an upgrade panel on top.
- `PlanBadge`: a small "Pro" mark on menu items, settings and buttons.

## When to use

- Someone hits a limit or clicks a paid feature: open `UpgradeDialog`.
- A trial is ending or usage is near the limit: `UpgradeBanner` (tone `warning`).
- A standing reminder while on a free plan: `UpgradeCard` in `SidebarFooter`.
- A page or panel that only paid plans can use: `FeatureGate`.

## When not to use

- The full pricing page: use [`PricingTable`](../pricing-table/README.md).
- A blocking error unrelated to plans: use [`AlertDialog`](../alert-dialog/README.md).
- More than one prompt on screen at a time. Pick one.

## Import

```tsx
import { UpgradeDialog, UpgradeBanner, UpgradeCard, FeatureGate, PlanBadge } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Button, UpgradeDialog, type PricingPlan } from "@fadymondy/nasaq/web";

const pro: PricingPlan = { id: "pro", name: "Pro", monthly: 15, yearly: 12 };

export function ProjectLimit() {
  const [open, setOpen] = useState(false);
  return (
    <UpgradeDialog
      open={open}
      onOpenChange={setOpen}
      trigger={<Button>New project</Button>}
      title="Unlock unlimited projects"
      description="You've used all 3 projects on Free."
      benefits={["Unlimited projects", "Client portal", "Priority support"]}
      plans={[pro]}
      offer={{ label: "Launch offer: 30% off your first year", endsAt: "2026-10-08T00:00:00Z" }}
      onUpgrade={async (planId, period) => location.assign(await checkoutUrl(planId, period))}
    />
  );
}
```

## Anatomy

```
UpgradeDialog                 data-slot="upgrade-dialog"   Dialog
├─ hero                       brand-tinted: icon, DialogTitle, DialogDescription
├─ benefits                   <ul>, success checks
├─ BillingPeriodSwitch        when a plan has a yearly price
├─ Price | PlanPicker         one plan: its price; several: radio cards
├─ offer                      accent box, label + live countdown (role="timer")
├─ upgrade button             primary, aria-busy while onUpgrade's promise runs
├─ "Maybe later"              DialogClose
└─ note                       shield icon, "Cancel anytime…"

UpgradeBanner                 data-slot="upgrade-banner", data-tone   role="region"
UpgradeCard                   data-slot="upgrade-card"   card, or an icon button when the sidebar is collapsed
FeatureGate                   data-slot="feature-gate", data-locked
├─ preview                    children, blurred, inert, aria-hidden
└─ panel                      lock, PlanBadge, title, description, button
PlanBadge                     data-slot="plan-badge"   brand Badge + sparkles
```

## API

### `UpgradeDialog`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `open?` / `defaultOpen?` / `onOpenChange?` | | | Controlled or uncontrolled open state. |
| `trigger?` | `ReactElement` | none | Becomes the dialog trigger, usually a `<Button />`. |
| `icon?` | `ReactNode` | sparkles | The hero icon. |
| `title` | `ReactNode` | required | What they get: "Unlock unlimited projects". |
| `description?` | `ReactNode` | none | Why now: "You've used all 3 projects on Free." |
| `benefits?` | `ReactNode[]` | none | Three to five concrete wins. |
| `plans?` | `PricingPlan[]` | none | One plan shows its price; several show a `PlanPicker`. The current plan is left out. |
| `defaultPlanId?` | `string` | highlighted, else first | |
| `currentPlanId?` | `string` | none | Removed from the choices. |
| `currency?` | `string` | `"USD"` | |
| `defaultPeriod?` | `BillingPeriod` | `"year"` | Starts on yearly when a yearly price exists. |
| `offer?` | `{ label, endsAt? }` | none | A time-limited offer with a live countdown. |
| `note?` | `ReactNode \| null` | "Cancel anytime. Your data stays yours." | `null` hides it. |
| `onUpgrade` | `(planId, period) => void \| Promise` | required | Return a promise to keep the button busy until checkout opens. |
| `cta?` | `ReactNode` | "Upgrade to {plan}" | |
| `labels?` | `UpgradeLabels` | locale | |

### `UpgradeBanner`

`ComponentProps<"div">` minus `title`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `tone?` | `"brand" \| "warning"` | `"brand"` | `warning` for a limit near or a trial ending. |
| `icon?` | `ReactNode` | sparkles | |
| `title` | `ReactNode` | required | |
| `description?` | `ReactNode` | none | |
| `action?` | `ReactNode` | none | Usually a `Button`. |
| `onDismiss?` | `() => void` | none | Shows a dismiss button. Only for offers. |

### `UpgradeCard`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `title` | `ReactNode` | required | Also the tooltip when collapsed. |
| `description?` | `ReactNode` | none | |
| `usage?` | `{ value, max, label? }` | none | A `Meter` that turns warning and danger as it fills. |
| `actionLabel?` | `ReactNode` | "Upgrade" | |
| `onUpgrade` | `() => void` | required | Usually opens `UpgradeDialog`. |

### `FeatureGate`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `locked` | `boolean` | required | `false` renders the children untouched. |
| `title` | `ReactNode` | required | "Custom reports are on Pro". |
| `description?` | `ReactNode` | none | |
| `plan?` | `ReactNode` | "Pro" | The plan in the badge. |
| `actionLabel?` | `ReactNode` | "See plans" | |
| `onUpgrade` | `() => void` | required | |

### `PlanBadge`

`Badge` props. `children` is the plan name, default "Pro".

## Examples

### Several plans in the popup

```tsx
<UpgradeDialog
  defaultOpen
  title="Choose your plan"
  plans={plans}
  currentPlanId="free"
  onUpgrade={(planId, period) => checkout(planId, period)}
/>
```

### Trial banner

```tsx
<UpgradeBanner
  tone="warning"
  title="Your trial ends in 3 days"
  description="Pick a plan to keep your projects and history."
  action={<Button size="sm">Choose a plan</Button>}
/>
```

### Sidebar card

```tsx
<SidebarFooter>
  <UpgradeCard title="You're on Free" usage={{ value: 8, max: 10, label: "8 of 10 projects" }} onUpgrade={() => setUpgradeOpen(true)} />
  <UserMenu … />
</SidebarFooter>
```

### Gated feature

```tsx
<FeatureGate locked={plan === "free"} title="Custom reports are on Pro" description="Build and schedule your own reports." onUpgrade={() => setUpgradeOpen(true)}>
  <ReportsPreview />
</FeatureGate>
```

## Accessibility

- `UpgradeDialog` is a modal `Dialog`: focus moves in, `Esc` closes, the title and description name it. "Maybe later" is a real close button, as easy to reach as the upgrade button.
- The offer countdown is `role="timer"` with `aria-live="off"`, so it does not chatter every second.
- `UpgradeBanner` is a named region. `UpgradeCard` collapsed is an icon button with an `aria-label` and a tooltip.
- `FeatureGate` makes the preview `inert` and `aria-hidden`: nobody can tab into or use the locked feature, and screen readers hear only the upgrade panel.

| Key | Action |
| --- | --- |
| `Tab` | Moves through the dialog: switch, plans, upgrade, Maybe later. |
| `Esc` | Closes the dialog. |

## RTL & i18n

- Built-in strings in English and Arabic follow the Nasaq locale: Pro, Upgrade, Upgrade now, Upgrade to {plan}, Maybe later, Dismiss, Cancel anytime…, Ends in, See plans. Override with `labels`.
- The countdown uses Latin digits in an LTR island so it reads the same in both directions.
- The collapsed `UpgradeCard` tooltip opens toward the content side.

## Styling & tokens

- Brand tints are `color-mix` of `--nq-brand` into `--nq-surface` (10–12%); solid marks use `bg-primary text-primary-foreground`. Warning uses `nq-warning`, `nq-warning-soft`, `nq-warning-text`; offers use `nq-accent`; benefit checks use `nq-success-soft`.
- Target `[data-slot=upgrade-dialog]`, `[data-slot=upgrade-banner][data-tone]`, `[data-slot=upgrade-card]`, `[data-slot=feature-gate]`, `[data-slot=plan-badge]`.

## Do / Don't

- **Do** open the dialog at the moment of need (the limit, the locked click), not on page load.
- **Do** say what they get in the title; put the price below it.
- **Do** always offer "Maybe later". Never trap people in an upgrade dialog.
- **Do** use a real `endsAt` for offers. Don't invent fake urgency with a countdown that resets.
- **Don't** make `UpgradeBanner` dismissible when the limit is actually hit; the banner explains why things stopped.
- **Don't** show more than one upgrade prompt at a time.

## Related

- [PricingTable](../pricing-table/README.md) · [PlanCard](../plan-card/README.md) · [Dialog](../dialog/README.md) · [UsageMeter](../usage-meter/README.md) · [AppShell](../app-shell/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-pricing-upgrade-prompt--docs
