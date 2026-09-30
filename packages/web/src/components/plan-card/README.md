---
name: plan-card
title: PlanCard
category: commerce
status: beta
summary: One pricing plan on a quiet surface, with the recommended plan brand-tinted; PlanGrid lays plans side by side.
exports: [PlanCard, PlanGrid, PlanCardProps]
related: [price, button, badge]
story: components-commerce-plan-card
base-ui: []
keywords: [pricing, plan, tier, subscription, price, features, highlighted, grid]
---

# PlanCard

One pricing plan: name, description, price, an action and a feature list. Plans are separated by space and a quiet surface, not borders. The recommended plan is tinted with the product's brand colour. `PlanGrid` lays several out.

## When to use

- A pricing page or upgrade dialog with two to four plans.

## When not to use

- A single price with no comparison: use [`Price`](../price/README.md).
- A product listing: use [`ProductCard`](../product-card/README.md).
- A feature comparison table with many rows: use a table.

## Import

```tsx
import { PlanCard, PlanGrid, type PlanCardProps } from "@fadymondy/nasaq/web";
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
        features={["Everything in Solo, plus", "Unlimited projects"]}
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
└─ PlanCard                   data-slot="plan-card", data-highlighted   <article>
   ├─ header
   │  ├─ name                 <h3>, labels the article
   │  ├─ badge                beside the name
   │  └─ description
   ├─ price + priceNote
   ├─ action
   └─ features                <ul>, check icon (aria-hidden) + text
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
| `features?` | `ReactNode[]` | none | What the plan includes. Start with "Everything in Solo, plus" when it builds on a smaller plan. |
| `action?` | `ReactNode` | none | The plan's button. Only the highlighted plan's button should be primary. |
| `highlighted?` | `boolean` | `false` | The recommended plan: brand-tinted surface. Use on at most one plan. Sets `data-highlighted`. |
| `badge?` | `ReactNode` | none | "Most popular". Shown beside the name. |
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
import { Badge, Button, PlanCard, PlanGrid, Price } from "@fadymondy/nasaq/web";

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
          badge={<Badge variant="brand">الأكثر شيوعًا</Badge>}
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
- The check icons are `aria-hidden`; features are a plain list.
- "Highlighted" is visual (a tint and `data-highlighted`). Say it in text too: use `badge` ("Most popular").
- No keyboard interaction of its own; the `action` button is a normal tab stop.

| Key | Action |
| --- | --- |
| `Tab` | Moves to each plan's `action` in DOM order. |
| `Enter` / `Space` | Activates the focused button. |

The caller localises name, description, notes, features and badge.

## RTL & i18n

- The grid flows in the inline direction: in RTL the first plan is on the right.
- Check icons sit on the inline start; the badge sits at the inline end of the name row.
- `Price` formats the amount for the active locale with the Nasaq digit set and isolates it in Arabic text. Prefer it over hand-formatted strings.
- No built-in strings.

## Styling & tokens

- Tokens: `bg-nq-surface`, `--nq-brand` (highlight: 10% tint plus a `ring-nq-brand/40` ring, check icons), `text-h3`, `text-body-sm`, `text-caption`, `text-muted-foreground`, `rounded-card`.
- Target with `[data-slot=plan-card]`, `[data-highlighted]`, `[data-slot=plan-grid]`.
- The grid switches by container width (`@3xl`), not viewport. Extend with `className`; do not use raw hex.

## Do / Don't

- **Do** highlight at most one plan, and give only that plan a `primary` button.
- **Do** use `secondary` buttons on the other plans.
- **Do** start a larger plan's features with "Everything in the smaller plan, plus".
- **Don't** add borders to separate plans; the surface and spacing do that.
- **Don't** format prices by hand; use `Price`.
- **Don't** put more than four plans in one `PlanGrid`.

## Related

- [Price](../price/README.md) · [Button](../button/README.md) · [Badge](../badge/README.md) · [FeatureStory](../feature-story/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-commerce-plan-card--docs
