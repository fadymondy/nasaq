---
name: finops-cost
title: FinOps Cost
category: server-tools
status: beta
summary: A cost page for servers with KPI tiles against last month, a budget meter, per-server price and CPU, memory and disk use with rightsizing hints, cost by category, and manual line items you can add and remove.
exports: [FinopsCostLabels, FinopsCostResult, CostServer, CostItem, CostItemInput, FinopsCostProps, FinopsCost, budgetState, finopsTotals, monthlyEquivalent, parseAmount, rightsize, roundMoney, validateLineItem]
related: [metric-tiles, breakdown-table, time-series-panel, usage-meter, data-table, ai-usage-cost]
story: components-server-tools-finops-cost
base-ui: [alert-dialog, dialog, meter, select]
keywords: [finops, cost, billing, budget, rightsizing, servers, savings, infrastructure]
---

# FinOps Cost

The money side of a server fleet. It has no backend: pass the servers, extra items and (optionally) a daily history, and handle the add, remove and plan-change callbacks.

- KPI tiles (`MetricTiles`): monthly total against last month, servers, extra items, possible savings.
- A budget meter that warns from 90 percent and turns danger over the budget.
- A server table with price and CPU, memory and disk use (`Meter`) and a rightsizing hint. Both CPU and memory under 25 percent suggests a smaller plan. CPU or memory above 85 percent, or disk above 90, suggests a bigger one. The row menu offers the plan switch when `onChangePlan` is passed.
- Cost by category (`BreakdownTable`) and an optional daily chart (`TimeSeriesPanel`).
- Manual line items with an add dialog and a remove confirmation. Yearly items count as one twelfth, one time items are listed but not counted.

## When to use

- The cost page of a hosting or ops console, or a server detail cost tab.

## When not to use

- AI token spend: use `AiUsageCost`.
- Invoices and payments: this is a run-rate view.

## Import

```tsx
import { FinopsCost } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { FinopsCost, type CostServer } from "@fadymondy/nasaq/web";

declare const servers: CostServer[];

export function Costs() {
  return <FinopsCost servers={servers} currency="USD" budget={400} previousTotal={310} />;
}
```

## API

`FinopsCost` takes the `div` props except `children` and `title`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `servers` | `CostServer[]` | required | `{ id, name, plan, region?, monthlyPrice, usage: { cpu, memory, disk }, smallerPlan?, largerPlan? }`. Usage is 0 to 100. Plans are `{ name, monthlyPrice }`. |
| `items` | `CostItem[]` | `[]` | `{ id, name, category?, amount, period }`. Period: `monthly`, `yearly`, `once`. |
| `currency` | `string` | `USD` | ISO 4217 code. |
| `previousTotal` | `number` | | Adds the change against last month. |
| `budget` | `number` | | Monthly budget. |
| `history` | `TimeSeriesPoint[]` | | `{ date, cost }` per day. |
| `onAddItem` | `(input) => Promise<void \| { error? }>` | | Shows the add button. |
| `onRemoveItem` | `(id) => Promise<void \| { error? }>` | | Adds Remove to the row menu. |
| `onChangePlan` | `(serverId, plan) => Promise<void \| { error? }>` | | Adds the plan switch to the row menu. |
| `loading`, `error`, `onRetry`, `labels` | | | States and string overrides. |

## Accessibility

Each meter is named with the metric and server. Hints are text, not only colour. The remove action asks first.

## RTL and languages

English and Arabic. Money is formatted for the locale with Latin digits. Server and plan names stay left to right.
