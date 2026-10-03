---
name: client-portal
title: ClientPortal
category: crm
status: beta
summary: What a customer sees of their project. A progress ring and hours against the budget, a read-only board, requests with a form, hours per week, sent invoices and an activity feed.
exports: [ClientPortal, ClientPortalProps, ClientPortalLabels, ClientPortalTab, PortalActivity, PortalProject]
related: [invoice-list, timeline, stat-card, kanban-board, project-view]
story: components-crm-client-portal
base-ui: [tabs]
keywords: [client portal, customer view, project status, requests, invoices, hours, budget, progress, read only]
---

# ClientPortal

The page you share with a customer. It shows **aggregates and sent documents only**: how many tasks are done, hours used against the budget, hours per week, how many issues are open and how many requests wait. It never lists internal issues, single time entries, internal notes, or an invoice that is still a draft.

Six tabs: **Overview** (progress ring, hour tiles, weekly bars), **Board** (four read-only columns), **Requests** (a form and the list), **Time** (totals and a table by week), **Invoices** (the [InvoiceList](../invoice-list/README.md) with pay and download) and **Activity** (a [Timeline](../timeline/README.md)).

## When to use

- A customer, client or stakeholder needs to follow a project without an account in your tool.

## When not to use

- Your own team's view of a project: use `ProjectView`.
- Anything with internal comments or cost rates: keep it out of the props.

## Import

```tsx
import { ClientPortal } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { ClientPortal } from "@fadymondy/nasaq/web";

export const Portal = (p: { data: PortalData }) => (
  <ClientPortal
    project={{ name: "New booking platform", client: "Tamkeen Co." }}
    tasks={p.data.tasks}
    requests={p.data.requests}
    weeks={p.data.weeks}
    budgetHours={240}
    invoices={p.data.invoices}
    currency="SAR"
    activity={p.data.activity}
    openIssues={4}
    onRequest={(r) => api.createRequest(r)}
  />
);
```

## Anatomy

```
ClientPortal                 data-slot="client-portal"
├─ header                    project, client, summary, due date (replaceable with `header`)
└─ Tabs
   ├─ Overview               Ring (data-slot="portal-ring"), StatGrid, budget Progress, weekly bars
   ├─ Board                  four sections of read-only cards  data-slot="portal-task"
   ├─ Requests               form (data-slot="portal-request-form") and list  data-slot="portal-request"
   ├─ Time                   StatGrid, budget Progress, DataTable by week
   ├─ Invoices               InvoiceList (drafts removed)
   └─ Activity               Timeline
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `project` | `PortalProject` | required | `{ name, client?, summary?, due? }`. |
| `tasks` | `PortalTask[]` | required | `{ id, title, status: "todo" \| "doing" \| "review" \| "done", assignee?, due? }`. |
| `openIssues?` | `number` | `0` | Only the count. |
| `requests` | `PortalRequest[]` | required | `{ id, title, description?, status, createdAt, by?, reply? }`. |
| `weeks` | `PortalWeek[]` | required | `{ week, hours }`. The total and the chart come from these. |
| `budgetHours?` | `number` | `0` | 0 means no budget: the budget bar is hidden. |
| `invoices` | `InvoiceSummary[]` | required | Drafts are removed before they reach the list. |
| `currency` | `string` | required | ISO 4217. |
| `activity` | `PortalActivity[]` | required | `{ id, actor?, title, description?, at }`. |
| `onRequest?` | `({ title, description }) => void \| Promise<void>` | none | Shows the request form. Reject to show the message. |
| `onOpenInvoice?` / `onPayInvoice?` / `onDownloadInvoice?` | | none | Passed to `InvoiceList`. |
| `taskActions?` / `requestActions?` / `activityActions?` | `(item) => ContextMenuAction[]` | none | Menus on context-click, long-press, Shift+F10 or the Menu key. Items with actions become focusable. |
| `weekActions?` | `(week) => DataTableRowAction[]` | none | Row menu and context menu of the weekly table. |
| `tab?` / `defaultTab?` / `onTabChange?` | `ClientPortalTab` | `"overview"` | |
| `chartWeeks?` | `number` | `8` | Weeks drawn on Overview. |
| `header?` | `ReactNode` | project header | For a logo or sign-out. |
| `locale?` / `labels?` | | provider locale | Every string in Arabic and English. |

### Logic (exported, pure)

`portalProgress(tasks)`, `portalBudget(budget, used)` (warns from 80 percent, danger when over), `portalTotalHours(weeks)`, `portalWeeksNewestFirst(weeks)`, `portalPendingRequests(requests)`, `portalVisibleInvoices(invoices)`, `portalRing(percent, radius)`. Use `portalVisibleInvoices` on your server too, so drafts are never sent to the browser.

## Examples

### Menus on a card

```tsx
<ClientPortal
  {...data}
  taskActions={(task) => [{ id: "ask", label: "Ask a question", onSelect: () => ask(task.id) }]}
/>
```

### Control the tab from the URL

```tsx
<ClientPortal {...data} tab={params.tab as ClientPortalTab} onTabChange={(tab) => router.replace(`?tab=${tab}`)} />
```

## Accessibility

- The ring is an image with the percent in its name; the weekly bars are one image named "Hours in the last 8 weeks" and every number is also in the Time table.
- Board columns are named sections and lists; cards with a menu take focus so the keyboard opens it.
- Status is always a word with an icon, never colour alone. Errors on the form are text under the field.

## RTL & i18n

- All text has Arabic and English defaults, and dates and numbers follow the locale.
- Layout uses logical spacing; the tab bar scrolls sideways on narrow screens.

## Styling & tokens

Cards, tabs, status and progress use the standard tokens; the ring uses the primary token on a muted track. The board is one column on phones, two from `sm`, four from `xl`.

## Do / Don't

- **Do** build the props on the server from aggregates, and filter drafts there.
- **Do** keep replies to requests short and specific.
- **Don't** pass single time entries, internal comments or rates.

## Related

- [InvoiceList](../invoice-list/README.md) · [Timeline](../timeline/README.md) · [StatCard](../stat-card/README.md) · [KanbanBoard](../kanban-board/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-crm-client-portal--docs
