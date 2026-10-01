---
name: accounting-ledger
title: Accounting Ledger
category: billing
status: beta
summary: A chart of accounts, a balanced journal-entry editor, a trial balance and an account statement, in exact integer money.
exports: [accountingBalances, accountingEntryProblems, accountingEntryTotals, accountingNormalSide, accountingSignedBalance, accountingStatement, accountingTree, accountingTrialBalance, AccountingAccount, AccountingAccountType, AccountingBalance, AccountingEntry, AccountingEntryLine, AccountingEntryProblem, AccountingEntryStatus, AccountingEntryTotals, AccountingSide, AccountingStatementRow, AccountingTrialBalance, AccountingTrialRow, AccountingLedgerLabels, useAccountingLedgerStrings, ChartOfAccountsProps, ChartOfAccounts, JournalEntryEditorLine, JournalEntryEditorValue, JournalEntryEditorProps, journalEntryDraft, JournalEntryEditor, TrialBalanceProps, TrialBalance, AccountStatementProps, AccountStatement]
related: [line-item-editor, data-table, currency-input, invoice-view]
story: components-billing-accounting-ledger
base-ui: [combobox]
keywords: [accounting, ledger, chart of accounts, journal entry, double entry, trial balance, debit, credit, general ledger, bookkeeping]
---

# Accounting Ledger

Four views over the same data. `ChartOfAccounts` is the tree with balances, `JournalEntryEditor` writes a balanced entry,
`TrialBalance` proves the books agree and `AccountStatement` lists one account with a running balance. Only posted entries
count. Every amount is an integer in minor units, so a balanced entry is exactly equal.

## When to use

- Bookkeeping screens: charts, manual journals, month-end checks.

## When not to use

- Customer invoices and quotes: use [`LineItemEditor`](../line-item-editor/README.md).

## Import

```tsx
import { ChartOfAccounts, JournalEntryEditor, TrialBalance, AccountStatement } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<JournalEntryEditor
  accounts={accounts}
  currency="SAR"
  number="JE-0009"
  onPost={async (entry) => api.postEntry(entry)}
/>
<TrialBalance accounts={accounts} entries={entries} currency="SAR" />
```

## API

### ChartOfAccounts

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `accounts` | `AccountingAccount[]` | required | `{ id, code, name, type, parentId?, archived? }`. |
| `entries` | `AccountingEntry[]` | `[]` | Posted ones give each row a balance; a group shows its whole branch. |
| `currency` | `string` | `"USD"` | ISO 4217 code. |
| `selectedId` | `string \| null` | none | Highlighted row. |
| `onSelectAccount` | `(account) => void` | none | Open the statement. |
| `onAddChild` | `(parent) => void` | none | Adds the "Add sub-account" action. |
| `onArchiveChange` | `(account, archived) => void` | none | Adds archive and restore. |
| `labels` | `AccountingLedgerLabels` | none | Overrides for the built-in strings. |

### JournalEntryEditor

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `accounts` | `AccountingAccount[]` | required | Only active leaf accounts can be picked. |
| `value` / `defaultValue` | `JournalEntryEditorValue` | `journalEntryDraft()` | `{ date, memo, lines }`, amounts in minor units. |
| `onValueChange` | `(value) => void` | none | Every edit. |
| `currency` | `string` | `"USD"` | ISO 4217 code. |
| `number` | `string` | none | Shown as the entry number. |
| `onPost` | `(value) => void \| Promise<void>` | none | Called only for a balanced entry. Throw to keep the editor. |
| `onSaveDraft` | `(value) => void \| Promise<void>` | none | Saves without posting. |
| `readOnly` | `boolean` | `false` | Locks the fields. |
| `labels` | `AccountingLedgerLabels` | none | String overrides. |

Typing a debit clears the credit on the same line and the other way round. "Balance with this line" fills the amount that
makes the entry equal. Post stays disabled and the reasons are listed until the entry has no problems.

### TrialBalance and AccountStatement

`TrialBalance` takes `accounts`, `entries`, `currency`, `asOf`, `includeZero`, `onSelectAccount`. `AccountStatement` takes
`account`, `entries`, `currency` and `opening` (the balance before the first row).

### Maths

`accountingNormalSide`, `accountingSignedBalance`, `accountingEntryTotals`, `accountingEntryProblems`,
`accountingBalances({ asOf, rollup })`, `accountingTrialBalance`, `accountingStatement` and `accountingTree` are exported
and pure, so you can run them on the server too. Assets and expenses grow on the debit side, the rest on the credit side.

## Examples

`asOf="2026-09-30"` cuts the trial balance at a date. `includeZero` lists idle accounts too.

## Accessibility

| Key | Action |
| --- | --- |
| Tab | Move across fields, line menus and buttons. |
| Arrow keys | Move in the account picker list. |
| Enter | Choose the highlighted account. |
| Shift+F10 / Menu | Open the row or line menu (same actions as the ⋯ button). |

- Tables use real `th` headers. The balanced state is text as well as colour.

## RTL & i18n

Built-in English and Arabic. Debit and credit columns swap sides in RTL. Numbers, codes and entry numbers stay left to
right, and each figure column is aligned on its decimals.

## Styling & tokens

Semantic tokens only. Entry lines are cards below 42rem and a grid above. Target `[data-slot="chart-of-accounts"]`,
`[data-slot="journal-entry-editor"]`, `[data-slot="trial-balance"]`, `[data-slot="account-statement"]`.

## Do / Don't

- Do post through your server and re-check the balance there: the maths is exported for that.
- Do void and re-enter a wrong entry instead of editing a posted one.
- Don't post to a group account: post to its leaves.

## Related

- [`line-item-editor`](../line-item-editor/README.md)
- [`data-table`](../data-table/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-billing-accounting-ledger--docs
