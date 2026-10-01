---
name: loyalty-promo
title: Loyalty and Promo
category: gamification
status: beta
summary: A loyalty card with tiers and expiring points, a points ledger, promo-code entry and management, and a customer visit history.
exports: [LoyaltyPromoLabels, LoyaltyTier, LoyaltyReward, LoyaltyCardProps, LoyaltyCard, PointsEntryKind, PointsEntry, PointsHistoryProps, PointsHistory, PromoApplied, PromoCodeFieldProps, PromoCodeField, PromoCode, PromoCodeInput, PromoCodeManagerProps, PromoCodeManager, VisitStatus, Visit, VisitHistoryProps, VisitHistory]
related: [gamification, qr-code, data-table, stat-card, price]
story: components-gamification-loyalty-and-promo
base-ui: [dialog, progress, select, switch]
keywords: [loyalty, points, tier, promo code, coupon, discount, visits, rewards]
---

# Loyalty and Promo

Everything for a returning customer: a card with points, tier progress, points about to expire, a member QR and rewards to redeem;
the points ledger; a promo-code box for checkout; an admin list of promo codes; and the visit history with totals. Money is integer
minor units and promo rules run in a pure function you can also use on your server.

## When to use

- Restaurants, salons, clinics and shops with points, tiers and discount codes.

## When not to use

- Game-style XP and badges: use `gamification`.

## Import

```tsx
import { LoyaltyCard, PromoCodeField, PromoCodeManager, PointsHistory, VisitHistory } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<LoyaltyCard name="Sara" balance={1840} tiers={tiers} memberCode="NSQ-4821" rewards={rewards} onRedeem={async (r) => api.redeem(r.id)} />
<PromoCodeField applied={applied} currency="EGP" onApply={async (code) => api.applyPromo(code)} onRemove={clear} />
```

## Anatomy

```
LoyaltyCard         data-slot="loyalty-card"        name, tier, balance, progress to next tier, expiry note, QR, rewards
PointsHistory       data-slot="points-history"      signed entries with a kind label and the balance after
PromoCodeField      data-slot="promo-code-field"    input and Apply, or the applied code with its saving
PromoCodeManager    data-slot="promo-code-manager"  DataTable, create and edit dialog
VisitHistory        data-slot="visit-history"       stat cards and a DataTable
```

## API

Read the exported prop types in `loyalty-promo.tsx` for the exact fields. In short:

- `LoyaltyCard`: `name`, `balance`, optional `lifetimePoints`, `tiers`, `lots` (points with expiry), `expiryWarningDays`, `memberCode`, `rewards`, `onRedeem`, `loading`, `labels`.
- `PointsHistory`: `entries` (`kind` is `earn`, `redeem`, `expire` or `adjust`, with signed `points`), `loading`, `labels`.
- `PromoCodeField`: `currency`, optional `applied`, `onApply(code)` (resolve `{ error }` to show why), `onRemove`, `labels`.
- `PromoCodeManager`: `promos`, `currency`, `onSave(input, id?)`, optional `onSetActive`, `onDelete`, `loading`, `labels`. Percent values are basis points, fixed values are minor units. Row actions also open on context-click.
- `VisitHistory`: `visits`, `currency`, optional `rowActions`, `loading`, `labels`.

Pure helpers: `loyaltyTier`, `pointsEarned`, `pointsValue`, `maxRedeemablePoints`, `expiringPoints`, `spendablePoints`, `evaluatePromo`,
`normalizePromoCode`, `isPromoCodeFormat`, `promoLive`.

Async callbacks return `Promise<void | { error?: string }>`.

## Examples

### Arabic

```tsx
<NasaqProvider locale="ar"><LoyaltyCard name="سارة" balance={1840} /></NasaqProvider>
```

## Accessibility

| Key | Action |
| --- | --- |
| Tab | Move through the code field, buttons and rows. |
| Enter | Apply the code or submit the dialog. |
| Shift+F10 or Menu | Open a row's actions. |

- The tier progress bar has a label; expiry notices use `role="status"`.
- Ledger direction is a sign and a label, not colour alone.

## RTL & i18n

Built-in English and Arabic, and a `labels` prop to override. Codes, member numbers and signed points stay left to right.

## Styling & tokens

Card, surface, border and status tokens only. Target the `data-slot` values above and extend with `className`. No raw hex.

## Do / Don't

- Do check promo rules again on your server.
- Do send points as whole numbers.
- Don't compute discounts in floats.

## Related

- `gamification`, `qr-code`, `data-table`

## Lab

Storybook: Components / CRM / Loyalty and Promo.
