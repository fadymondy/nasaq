---
name: pagination
title: Pagination
category: navigation
status: beta
summary: Numbered Pagination with ellipsis, CursorPager (previous/next with a "Showing X-Y" label) and LoadMore button with a loading state.
exports: [Pagination, CursorPager, LoadMore, getPaginationItems, PaginationProps, CursorPagerProps, PaginationItem]
related: [button, data-table, table]
story: components-navigation-pagination
base-ui: [button]
keywords: [pagination, pager, pages, next, previous, cursor, load more, infinite]
---

# Pagination

Three ways to move through a long list. `Pagination` shows numbered pages with ellipsis. `CursorPager` has previous and
next only and a "Showing X-Y" label, for APIs that use cursors. `LoadMore` is a button that appends the next batch.

## When to use

- `Pagination`: the total is known and users jump to a page (tables, search results).
- `CursorPager`: the API gives cursors and cannot jump.
- `LoadMore`: feeds where continuing the list matters more than position.

## When not to use

- Fewer than about 20 items: show them all.
- Steps in a flow: use a stepper.

## Import

```tsx
import { CursorPager, LoadMore, Pagination } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { useState } from "react";
import { Pagination } from "@fadymondy/nasaq/web";

export function Results() {
  const [page, setPage] = useState(1);
  return <Pagination page={page} pageCount={24} onPageChange={setPage} />;
}
```

## Anatomy

```
<Pagination>   <nav data-slot="pagination" aria-label>
└─ ul > li     previous · page buttons (aria-current="page") · ellipsis (data-slot="pagination-ellipsis") · next
<CursorPager>  <nav data-slot="cursor-pager">  summary text + previous / next buttons
<LoadMore>     data-slot="load-more"  (a Button)
```

## API

### Pagination (`PaginationProps`)

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `page` | `number` | required | Current page, 1-based. |
| `pageCount` | `number` | required | Total pages. |
| `onPageChange` | `(page: number) => void` | required | Called with the new page. |
| `siblings` | `number` | `1` | Pages each side of the current one. |
| `boundaries` | `number` | `1` | Pages always shown at each end. |
| `label` | `string` | "Pagination" / "ترقيم الصفحات" | Landmark name. |
| `previousLabel` / `nextLabel` | `string` | "Previous" / "Next" (Arabic by locale) | Chevron button names. |
| `pageLabel` | `(formatted: string) => string` | "Page N" / "الصفحة N" | Name of a page button. |

`getPaginationItems(page, pageCount, siblings?, boundaries?)` returns `(number | "start-ellipsis" | "end-ellipsis")[]`.

### CursorPager (`CursorPagerProps`)

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `from` / `to` | `number` | required | First and last item index on this page. |
| `total` | `number` | none | Total items when known. |
| `hasPrevious` / `hasNext` | `boolean` | required | Enable the buttons. |
| `onPrevious` / `onNext` | `() => void` | required | Handlers. |
| `loading` | `boolean` | `false` | Disable both while fetching. |
| `label` | `string` | "Pagination" / "ترقيم الصفحات" | Landmark name. |
| `previousLabel` / `nextLabel` | `ReactNode` | "Previous" / "Next" (Arabic by locale) | Button text. |
| `summary` | `ReactNode` | "Showing X-Y of Z" | Replaces the summary. |

### LoadMore

All `Button` props (`loading`, `variant`, `onClick`). Default variant `secondary`, default text "Load more" / "تحميل المزيد".

## Examples

Cursor pager:

```tsx
import { CursorPager } from "@fadymondy/nasaq/web";

export function Pager() {
  return (
    <CursorPager from={21} to={40} total={95} hasPrevious hasNext onPrevious={() => {}} onNext={() => {}} />
  );
}
```

Load more with loading state:

```tsx
import { useState } from "react";
import { LoadMore } from "@fadymondy/nasaq/web";

export function More() {
  const [loading, setLoading] = useState(false);
  return <LoadMore loading={loading} onClick={() => setLoading(true)} />;
}
```

## Accessibility

| Key | Action |
| --- | --- |
| Tab | Moves between buttons. |
| Enter / Space | Activates. |

- Each control is a `nav` landmark with a label; the current page has `aria-current="page"`. Page buttons are named "Page N".
- Labels default to English or Arabic from the Nasaq locale; pass your own for other languages.

## RTL & i18n

Chevrons are directional icons and mirror in RTL, so "previous" points right in Arabic. Page numbers and the "showing" range are formatted with Nasaq number formatting (Western digits) and the range is bidi-isolated.

## Styling & tokens

Buttons use `Button` variants; the current page uses `border-primary` and `bg-nq-selected`. `className` merges onto the nav.

## Do / Don't

- Do keep the current page announced with `aria-current`.
- Don't use it for fewer than a screenful of items.

## Related

[button](../button/README.md), [data-table](../data-table/README.md).

## Lab

https://docs.nasaqui.com/?path=/docs/components-navigation-pagination--docs
