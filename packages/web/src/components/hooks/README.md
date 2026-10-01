---
name: hooks
title: Hooks
category: utilities
status: beta
summary: Small client hooks used across apps; useDebounce and useDebouncedCallback for search and autosave, useMediaQuery and useIsMobile for responsive logic, and useInfiniteScroll for loading the next page near the end of a list.
exports: [useDebounce, useDebouncedCallback, useMediaQuery, useIsMobile, useInfiniteScroll, UseInfiniteScrollOptions]
related: [data-state, table, command-palette]
story: components-utilities-hooks
base-ui: []
keywords: [hooks, debounce, throttle, media query, responsive, mobile, breakpoint, infinite scroll, pagination, intersection observer]
---

# Hooks

Plain React hooks with no dependencies. They are safe to render on the server.

## When to use

- `useDebounce`: filter or search after typing stops.
- `useDebouncedCallback`: autosave, resize handlers, anything that should run once after a burst.
- `useMediaQuery` / `useIsMobile`: when the logic, not only the CSS, changes with the screen.
- `useInfiniteScroll`: feeds and long lists that load page by page.

## When not to use

- Layout changes only: use Tailwind breakpoints in CSS, not `useIsMobile`.
- Very long lists: virtualise the rows; infinite scroll alone keeps every row in the DOM.

## Import

```tsx
import { useDebounce, useDebouncedCallback, useMediaQuery, useIsMobile, useInfiniteScroll } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Button, Input, useDebounce, useInfiniteScroll } from "@fadymondy/nasaq/web";
import { useState } from "react";

declare function useSearch(q: string): { rows: string[]; hasMore: boolean; loading: boolean; loadMore(): void };

export function Search() {
  const [q, setQ] = useState("");
  const debounced = useDebounce(q, 300);
  const { rows, hasMore, loading, loadMore } = useSearch(debounced);
  const sentinel = useInfiniteScroll({ onLoadMore: loadMore, hasMore, loading });
  return (
    <>
      <Input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
      <ul>{rows.map((r) => <li key={r}>{r}</li>)}</ul>
      {hasMore ? <Button ref={sentinel} onClick={loadMore}>Load more</Button> : null}
    </>
  );
}
```

## API

| Hook | Returns | Notes |
| --- | --- | --- |
| `useDebounce(value, delay = 300)` | the value | Updates `delay` ms after the last change. |
| `useDebouncedCallback(fn, delay = 300)` | a stable function with `.cancel()` | Always calls the latest `fn`. Cancelled on unmount. |
| `useMediaQuery(query)` | `boolean` | `false` on the server and the first client render. |
| `useIsMobile(breakpoint = 768)` | `boolean` | True below the breakpoint (Tailwind `md`). |
| `useInfiniteScroll(options)` | a ref callback | Put it on an element after the last item. |

**UseInfiniteScrollOptions**

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `onLoadMore` | `() => void` | required | Not called again while `loading`. |
| `hasMore` | `boolean` | required | Stops observing when false. |
| `loading` | `boolean` | `false` | |
| `rootMargin` | `string` | `"240px"` | Start loading this far before the sentinel shows. |
| `root` | `Element \| null` | the viewport | The scrolling element, when it is not the page. |
| `disabled` | `boolean` | `false` | |

## Accessibility

- Infinite scroll is invisible to keyboard and screen-reader users: keep a "Load more" button as the sentinel,
  and announce new rows (`aria-live`) when it helps.
- `useMediaQuery("(prefers-reduced-motion: reduce)")` lets JavaScript animations respect the setting.

## RTL & i18n

- No text or direction.

## Styling & tokens

- No styles.

## Do / Don't

- Do debounce the value you query with, not the input's own value.
- Don't render different content on the server and client from `useIsMobile`; it is false on the server.

## Related

- [`DataState`](../data-state/README.md)
- [`Table`](../table/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-utilities-hooks--docs
