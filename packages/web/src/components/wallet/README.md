---
name: wallet
title: Wallet
category: billing
status: beta
summary: A balance card with top-up and withdraw dialogs and a grouped transaction list, all amounts through Intl.
exports: [WalletLabels, WalletTransactionType, WalletTransactionStatus, WalletTransaction, WalletAccount, TopUpDialogProps, TopUpDialog, PayoutDialogProps, PayoutDialog, WalletBalanceProps, WalletBalance, WalletTransactionsProps, WalletTransactions, WalletProps, Wallet]
related: [invoice-list, price, checkout-steps, chart]
story: components-billing-wallet
base-ui: [dialog, radio-group, toggle-group]
keywords: [wallet, balance, top-up, payout, withdraw, transactions, credit, funds]
---

# Wallet

A prepaid balance in one piece: the balance with a 30-day trend, Add funds and Withdraw dialogs that validate the amount
against limits, and a transaction list grouped by day with a money in / money out filter. It never moves money itself: your
async callbacks do, and the dialogs show their busy and error states.

## When to use

- Prepaid credit, marketplace balances, payouts to a bank.

## When not to use

- Recurring subscription payment: use [`CheckoutSteps`](../checkout-steps/README.md).
- Invoice history: use [`InvoiceList`](../invoice-list/README.md).

## Import

```tsx
import { Wallet, type WalletTransaction } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Wallet } from "@fadymondy/nasaq/web";

export function MyWallet() {
  return (
    <Wallet
      balance={1250.5}
      pending={100}
      currency="USD"
      sources={[{ id: "visa", label: "Visa ending 4242" }]}
      destinations={[{ id: "bank", label: "Al Rajhi Bank", description: "SA03 **** 1234" }]}
      transactions={[{ id: "t1", type: "topup", amount: 200, status: "completed", date: new Date(), description: "Top-up" }]}
      onTopUp={async ({ amount, sourceId }) => api.topUp(amount, sourceId)}
      onPayout={async ({ amount, destinationId }) => api.payout(amount, destinationId)}
    />
  );
}
```

## Anatomy

```
Wallet                           data-slot="wallet"
├─ WalletBalance                 balance (hide/show), pending, Sparkline trend, Add funds, Withdraw
├─ WalletTransactions            filter ToggleGroup, day groups, rows with status
├─ TopUpDialog                   presets, amount field, source RadioCard list
└─ PayoutDialog                  amount, "Withdraw all", destination list
```

## API

### `Wallet`

`WalletProps extends Omit<ComponentProps<"div">, "children">`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `balance` | `number` | required | Available balance. |
| `pending?` | `number` | none | Money on its way in or out. |
| `currency` | `string` | required | ISO 4217 code. |
| `trend?` | `readonly number[]` | none | Balance for the last days, oldest first. |
| `transactions` | `readonly WalletTransaction[]` | required | Activity. |
| `sources?` | `readonly WalletAccount[]` | none | Top-up sources. |
| `destinations?` | `readonly WalletAccount[]` | none | Withdrawal accounts. |
| `onTopUp?` | `(input: { amount: number; sourceId: string }) => Promise<Result>` | none | Omitted: Add funds is hidden. Resolve `{ error }` or reject to keep the dialog open. |
| `onPayout?` | `(input: { amount: number; destinationId: string }) => Promise<Result>` | none | Omitted: Withdraw is hidden. |
| `topUpMin?` | `number` | `0.01` | Smallest top-up. |
| `topUpPresets?` | `readonly number[]` | `[50, 100, 250, 500]` | One-tap amounts. |
| `payoutMin?` | `number` | `0.01` | Smallest withdrawal. The maximum is the balance. |
| `feeNote?` | `ReactNode` | none | Fee note under the top-up amount. |
| `loading?` | `boolean` | `false` | Skeletons. |
| `labels?` | `WalletLabels` | built-in en/ar | String overrides. |

`Result` is `void | { error?: string }`.

### `WalletBalance`

`WalletBalanceProps extends Omit<ComponentProps<typeof Card>, "children">`: `balance`, `pending?`, `currency`, `trend?`,
`onTopUp?`, `onPayout?` (buttons with no arguments), `loading?`, `labels?`.

### `WalletTransactions`

`WalletTransactionsProps extends Omit<ComponentProps<"section">, "children">`: `transactions`, `currency`, `loading?`, `labels?`.
`WalletTransaction`: `id`, `type` (`"topup" | "payout" | "payment" | "refund" | "fee"`), signed `amount`, `status`
(`"completed" | "pending" | "failed"`), `date`, `description`, `reference?`.

### `TopUpDialog` / `PayoutDialog`

| Prop | Type | Description |
| --- | --- | --- |
| `open`, `onOpenChange` | `boolean`, `(open: boolean) => void` | Controlled state. |
| `currency` | `string` | ISO 4217 code. |
| `sources` / `destinations` | `readonly WalletAccount[]` | Accounts (`id`, `label`, `description?`). |
| `presets?`, `min?`, `max?`, `feeNote?` | top-up only | One-tap amounts, limits and a fee note. |
| `available` | `number` | Payout only: the maximum withdrawal. |
| `onTopUp` / `onPayout` | async callbacks | As above. |
| `labels?` | `WalletLabels` | String overrides. |

## Examples

### Balance only

```tsx
<WalletBalance balance={80} currency="USD" onTopUp={() => setOpen(true)} />
```

### Failing top-up

```tsx
<Wallet balance={0} currency="USD" transactions={[]} sources={sources} onTopUp={async () => ({ error: "Card declined." })} />
```

### Arabic

```tsx
<NasaqProvider locale="ar">
  <Wallet balance={1250.5} currency="SAR" transactions={[]} />
</NasaqProvider>
```

## Accessibility

| Key | Action |
| --- | --- |
| Tab | Move through buttons, filter, amount and accounts. |
| Arrow keys | Change the filter and pick an account. |
| Enter | Submit the open dialog. |
| Escape | Close the dialog (not while busy). |

- The balance can be hidden; the hidden state is announced by label.
- Amount errors use `FieldError` and are announced.
- Direction is shown with an icon and a sign, not colour alone.

## RTL & i18n

Built-in English and Arabic. Amounts use `Intl` with `currency`, Latin digits by default, isolated left to right. Typed amounts
accept Arabic-Indic digits and the Arabic decimal mark. References stay left to right.

## Styling & tokens

Uses card, border and text tokens plus the success and danger text tokens for direction. Target `[data-slot="wallet"]`; extend with
`className`. No raw hex.

## Do / Don't

- Do validate again on your server; the dialog checks are for feedback.
- Do send the signed `amount` in transactions (negative for money out).
- Don't show the balance to people who should not see it.

## Related

- [`invoice-list`](../invoice-list/README.md)
- [`checkout-steps`](../checkout-steps/README.md)
- [`chart`](../chart/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-billing-wallet--docs
