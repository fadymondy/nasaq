---
name: trash-bin
title: TrashBin
category: files
status: stable
summary: The trash of an app, listing deleted items with who deleted them and a retention countdown, with restore, delete forever and empty trash behind confirmations, built on EntityList.
exports: [TrashBin, TrashBinLabels, TrashResult, TrashType, TrashItem, TrashBinProps]
related: [entity-list, data-table, alert-dialog, empty-state]
story: components-files-trash-bin
keywords: [trash, recycle bin, deleted, restore, soft delete, retention, purge]
---

# TrashBin

Deleting should be forgiving. `TrashBin` lists what was deleted, shows how long each item stays (a badge that turns
amber a week before and red three days before), and lets people restore items or delete them for good. It is built on
[EntityList](../entity-list/README.md), so it has search, a type filter, table and card views, selection with bulk
actions, and a context menu on every row (context-click, long-press, Shift+F10 or the Menu key).

## When to use

- A "Trash" or "Recently deleted" screen for soft-deleted records, files or documents.

## When not to use

- Undoing the last action: a toast with an Undo button.
- Archiving (kept on purpose): a normal list with an archived filter.

## Import

```tsx
import { TrashBin, trashRetention } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { TrashBin, type TrashItem } from "@fadymondy/nasaq/web";
import { FileText } from "lucide-react";

export function Trash({ items, api }: { items: TrashItem[]; api: Api }) {
  return (
    <TrashBin
      items={items}
      types={[{ id: "doc", label: "Document", labelAr: "مستند", icon: FileText }]}
      retentionDays={30}
      onRestore={(ids) => api.restore(ids)}
      onDelete={(ids) => api.purge(ids)}
      onEmpty={() => api.emptyTrash()}
    />
  );
}
```

The list is yours: when a callback resolves, remove those items from `items`.

## Anatomy

```
TrashBin                 data-slot="trash-bin"
├─ h2                    title
├─ Alert                 how long items stay
├─ Alert (danger)        a failed restore
├─ EntityList            table or cards, search, type filter, bulk bar
│  ├─ columns            name, type, deleted, deleted by, time left
│  └─ row menu           Restore, Delete forever
└─ AlertDialog           confirm deleting for good, or emptying
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `items` | `TrashItem[]` | required | `id`, `name`, `type`, `detail`, `deletedAt`, `deletedBy`, `purgeAt`. |
| `types` | `TrashType[]` | none | Kinds with `label`, `labelAr` and an icon. Adds a filter. |
| `retentionDays` | `number \| null` | `30` | Days before an item is deleted for good. `0` or `null` keep items until emptied. |
| `onRestore` | `(ids) => Promise<void \| { error? }>` | none | Restore. Runs at once, no confirmation. |
| `onDelete` | `(ids) => Promise<...>` | none | Delete for good, after a confirmation. |
| `onEmpty` | `() => Promise<...>` | none | Delete everything, after a confirmation. Hides the button when omitted. |
| `onNotify` | `(message) => void` | none | Message for a toast after a successful action. |
| `now` | `Date \| number \| string` | current time | The clock, for stable screenshots and tests. |
| `loading`, `error`, `onRetry` | | | Passed to EntityList. |
| `title` | `ReactNode \| null` | localised | `null` hides it. |
| `locale`, `labels`, `className` | | | Strings are en and ar and overridable. |

### Retention helpers (no React)

`trashRetention(deletedAt, { retentionDays, purgeAt, now })` returns `{ purgeAt, daysLeft, hoursLeft, expired, urgency, elapsed }`.
`daysLeft` rounds up, so 20 hours left reads "1 day". `trashExpiredIds` and `trashSortByPurge` work on lists.

## Accessibility

- The list is named "Deleted items". Every row action is also reachable from the row menu and the context menu.
- Time left is words in a badge ("3 days left"), and the colour only backs it up.
- Delete for good and Empty trash use an alert dialog: focus goes to Cancel, Escape closes it.

## RTL & i18n

- Item names and people's names are isolated with `bdi dir="auto"`, so a Latin file name in an Arabic list keeps its order.
- Dates use `DateTime` and Latin digits like the rest of Nasaq. Arabic uses the correct dual and plural forms for days.

## Styling & tokens

Badge variants `neutral`, `warning`, `danger` and `outline`; EntityList tokens. Extend with `className`.

## Do / Don't

- Do show the list newest-expiring first (the default sort) so people see what is about to go.
- Do return `{ error }` from a callback instead of throwing when you can name the problem.
- Do not skip the confirmation for deleting for good.

## Related

- [EntityList](../entity-list/README.md)
- [DataTable](../data-table/README.md)
- [AlertDialog](../alert-dialog/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-files-trash-bin--docs
