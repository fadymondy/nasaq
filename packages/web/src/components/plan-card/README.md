---
name: plan-card
title: PlanCard
category: pricing
status: beta
summary: One pricing plan on a quiet surface, with the recommended plan brand-tinted; PlanGrid lays plans side by side.
exports: [PlanCard, PlanGrid, PlanCardProps, PlanFeature]
related: [pricing-table, upgrade-prompt, price, button, badge]
story: components-pricing-plan-card
base-ui: []
keywords: [pricing, plan, tier, subscription, price, features, highlighted, current, grid]
---

# PlanCard

One pricing plan: name, description, price, an action and a feature list. Plans are separated by space and a quiet surface, not borders. The recommended plan is tinted with the product's brand colour. `PlanGrid` lays several out.

## When to use

- A pricing page with two to four plans, when you lay out the cards yourself.
- Building plans from data with a Monthly / Yearly switch and working buttons? Use [`PricingTable`](../pricing-table/README.md); it renders `PlanCard`s for you.

## When not to use

- A single price with no comparison: use [`Price`](../price/README.md).
- A product listing: use [`ProductCard`](../product-card/README.md).
- A feature comparison with many rows: use [`PlanComparison`](../pricing-table/README.md).
- An upgrade popup: use [`UpgradeDialog`](../upgrade-prompt/README.md).

## Import

```tsx
import { PlanCard, PlanGrid, type PlanCardProps, type PlanFeature } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Button, PlanCard, PlanGrid, Price } from "@fadymondy/nasaq/web";

export function Pricing() {
  return (
    <PlanGrid>
      <PlanCard
        name="Solo"
        description="For one person."
        price={<Price amount={0} size="lg" />}
        features={["1 project", "Community support"]}
        action={<Button variant="secondary">Start free</Button>}
      />
      <PlanCard
        highlighted
        name="Team"
        description="For small teams."
        price={<Price amount={12} period="seat-month" size="lg" />}
        priceNote="Billed yearly"
        featuresTitle="Everything in Solo, plus"
        features={["Unlimited projects", { label: "SSO", included: false }]}
        footnote="No card required"
        badge="Most popular"
        action={<Button variant="primary">Start trial</Button>}
      />
    </PlanGrid>
  );
}
```

## Anatomy

```
PlanGrid                      data-slot="plan-grid", @container wrapper + grid
└─ PlanCard                   data-slot="plan-card", data-highlighted, data-current   <article>
   ├─ badge pill              data-slot="plan-card-badge", on the top edge
   ├─ name                    <h3>, labels the article
   ├─ description
   ├─ price + priceNote
   ├─ action + footnote
   └─ featuresTitle + features  <ul>, check (included) or dash (not included, sr-only "Not included")
```

## API

### `PlanCard`

`PlanCardProps extends Omit<ComponentProps<"article">, "title">`. Remaining props go to the `<article>`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `name` | `ReactNode` | required | Plan name: "Team". |
| `description?` | `ReactNode` | none | Who it is for, one line. |
| `price` | `ReactNode` | required | Usually `<Price size="lg" />`. |
| `priceNote?` | `ReactNode` | none | A line under the price: "Billed yearly", "Up to 3 people". |
| `features?` | `(ReactNode \| PlanFeature)[]` | none | What the plan includes. A bare node is included; a `PlanFeature` can be `included: false` (a muted dash) or carry a `hint` tooltip. |
| `featuresTitle?` | `ReactNode` | none | A heading over the features: "Everything in Solo, plus". |
| `action?` | `ReactNode` | none | The plan's button. Only the highlighted plan's button should be primary. |
| `footnote?` | `ReactNode` | none | Fine print under the button: "No card required". |
| `highlighted?` | `boolean` | `false` | The recommended plan: brand-tinted, lifted surface with a brand ring. Use on at most one plan. Sets `data-highlighted`. |
| `current?` | `boolean` | `false` | The account's plan: a neutral ring and a "Current plan" pill (unless `badge` is set). Sets `data-current`. |
| `badge?` | `ReactNode` | none | "Most popular". A pill on the card's top edge; solid brand on the highlighted plan. |

### `PlanFeature`

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `label` | `ReactNode` | required | The feature. |
| `included?` | `boolean` | `true` | `false` shows a dash and a hidden "Not included", so people see what a bigger plan adds. |
| `hint?` | `string` | none | A short explanation in a tooltip on the label. |
| `className?` | `string` | none | Merged onto the article. |

### `PlanGrid`

`ComponentProps<"div">`. Lays `PlanCard`s side by side from 48rem of container width (one column per card), stacked below it.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `children?` | `ReactNode` | none | The `PlanCard`s. |
| `className?` | `string` | none | Merged onto the inner grid. |

## Examples

### Three plans, Arabic

```tsx
import { Button, PlanCard, PlanGrid, Price } from "@fadymondy/nasaq/web";

export function ArabicPricing() {
  return (
    <div dir="rtl">
      <PlanGrid>
        <PlanCard
          name="فردي"
          description="لشخص واحد."
          price={<Price amount={0} size="lg" />}
          features={["مشروع واحد", "دعم المجتمع"]}
          action={<Button variant="secondary">ابدأ مجانًا</Button>}
        />
        <PlanCard
          highlighted
          name="فريق"
          description="للفرق الصغيرة."
          price={<Price amount={12} period="seat-month" size="lg" />}
          priceNote="تُدفع سنويًا"
          badge="الأكثر شيوعًا"
          features={["كل ما في الفردي، بالإضافة إلى", "مشاريع غير محدودة"]}
          action={<Button variant="primary">ابدأ التجربة</Button>}
        />
        <PlanCard
          name="مؤسسة"
          description="للمؤسسات الكبيرة."
          price="حسب الطلب"
          features={["تسجيل دخول موحد", "اتفاقية مستوى خدمة"]}
          action={<Button variant="secondary">تواصل معنا</Button>}
        />
      </PlanGrid>
    </div>
  );
}
```

### A single card with a struck-through price

```tsx
import { Button, PlanCard, Price } from "@fadymondy/nasaq/web";

export function Launch() {
  return (
    <PlanCard
      highlighted
      name="Pro"
      price={<Price amount={8} compareAt={12} period="month" size="lg" />}
      priceNote="Launch offer"
      action={<Button variant="primary">Upgrade</Button>}
    />
  );
}
```

## Accessibility

- Each card is an `<article>` labelled by its name (`aria-labelledby`, an `<h3>`), so plans are navigable as named articles. Place the grid under an `h2`.
- The check and dash icons are `aria-hidden`; a not-included feature carries a visually hidden "(Not included)" so it is not read as included.
- A feature `hint` label is focusable and opens its tooltip on focus.
- "Highlighted" is visual (a tint and `data-highlighted`). Say it in text too: use `badge` ("Most popular").
- No keyboard interaction of its own; the `action` button is a normal tab stop.

| Key | Action |
| --- | --- |
| `Tab` | Moves to each plan's `action` in DOM order. |
| `Enter` / `Space` | Activates the focused button. |

The caller localises name, description, notes, features and badge. The built-in "Current plan" and "Not included" follow the Nasaq locale.

## RTL & i18n

- The grid flows in the inline direction: in RTL the first plan is on the right.
- Check icons sit on the inline start; the badge pill sits on the inline start of the top edge.
- `Price` formats the amount for the active locale with the Nasaq digit set and isolates it in Arabic text. Prefer it over hand-formatted strings.
- Built-in strings: "Current plan" / "خطتك الحالية", "Not included" / "غير مشمول".

## Styling & tokens

- Tokens: `bg-nq-surface`, `--nq-brand` (highlight: 9% tint, `shadow-lg`, a `ring-nq-brand/50` ring, check icons), `bg-primary` (highlighted pill), `ring-nq-line-strong` (current), `text-h3`, `text-body-sm`, `text-caption`, `text-muted-foreground`, `rounded-card`.
- Target with `[data-slot=plan-card]`, `[data-highlighted]`, `[data-current]`, `[data-slot=plan-card-badge]`, `[data-slot=plan-grid]`.
- The grid switches by container width (`@3xl`), not viewport. Extend with `className`; do not use raw hex.

## Do / Don't

- **Do** highlight at most one plan, and give only that plan a `primary` button.
- **Do** use `secondary` buttons on the other plans.
- **Do** put "Everything in the smaller plan, plus" in `featuresTitle` on larger plans.
- **Do** mark the account's plan with `current` in an in-app plans page.
- **Don't** add borders to separate plans; the surface and spacing do that.
- **Don't** format prices by hand; use `Price`.
- **Don't** put more than four plans in one `PlanGrid`.

## Related

- [PricingTable](../pricing-table/README.md) · [UpgradeDialog](../upgrade-prompt/README.md) · [Price](../price/README.md) · [Button](../button/README.md) · [Badge](../badge/README.md) · [FeatureStory](../feature-story/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-pricing-plan-card--docs
