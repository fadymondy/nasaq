---
name: data-state
title: DataState
category: feedback
status: beta
summary: One wrapper for the states of a data view, in a fixed order of loading, signed out, service unavailable, error with retry, empty with an action, then the content.
exports: [DataState, DataStateProps, ServiceUnavailable, ServiceUnavailableProps, DataStateLabels]
related: [states, error-pages, table]
story: components-loading-states-data-state
base-ui: [button]
keywords: [loading, empty, error, retry, unauthorized, offline, unavailable, fetch, query, state]
---

# DataState

Wraps a list, table or chart that loads data and picks the right state for you. Pass what your fetch knows
(`loading`, `error`, `empty`…) and the content as children; only one thing renders.

## When to use

- Any view that fetches: a table page, a dashboard card, a side panel list.
- When the same view can be signed out (401), down (503) or failing for another reason.

## When not to use

- A whole failed page or route: use [`ErrorPages`](../error-pages/README.md).
- A single state on its own: use `LoadingState`, `EmptyState` or `ErrorState` from [`States`](../states/README.md).

## Import

```tsx
import { DataState, ServiceUnavailable } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Button, DataState } from "@fadymondy/nasaq/web";

declare const query: { isLoading: boolean; error: Error | null; data: { id: string; name: string }[]; refetch(): void };

export function Projects() {
  return (
    <DataState
      loading={query.isLoading}
      error={query.error}
      onRetry={query.refetch}
      empty={query.data.length === 0}
      labels={{ emptyTitle: "No projects yet" }}
      emptyAction={<Button variant="primary">New project</Button>}
    >
      <ul>{query.data.map((p) => <li key={p.id}>{p.name}</li>)}</ul>
    </DataState>
  );
}
```

## Anatomy

```
DataState                       data-slot="data-state" on the state shown
├─ loading       → loadingFallback, or LoadingState with skeleton rows
├─ unauthorized  → EmptyState with a sign-in button
├─ unavailable   → ServiceUnavailable with retry
├─ error         → ErrorState with the message and retry
├─ empty         → EmptyState with emptyAction
└─ children      when none of the above
```

The first true state wins, in that order.

## API

**DataState**

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `loading` | `boolean` | | Show the loading state. |
| `loadingFallback` | `ReactNode` | | Your own skeleton instead of the default. |
| `loadingRows` | `number` | `LoadingState`'s default | Rows of the default skeleton. |
| `unauthorized` | `boolean` | | Signed out or session expired. |
| `onSignIn` / `signInHref` | `() => void` / `string` | | The sign-in button's action or link. |
| `unavailable` | `boolean` | | The service is down (503, offline). |
| `error` | `unknown` | | An `Error`, a string or any truthy value. Its message is shown. |
| `onRetry` | `() => void` | | Adds a retry button to the error and unavailable states. |
| `empty` | `boolean` | | No rows. |
| `emptyIcon` | `LucideIcon` | | Icon of the empty state. |
| `emptyAction` | `ReactNode` | | A call to action, usually "Create…". |
| `labels` | `Partial<DataStateLabels>` | | Override any string, including the empty state's `emptyTitle` and `emptyBody`. |
| `className` | `string` | | On the state shown. |
| `children` | `ReactNode` | | The content. |

**ServiceUnavailable**: the `EmptyState` props plus `onRetry`, an optional `title` and `labels`. The "can't reach the service" state on its own.

## Accessibility

- Loading is announced through `LoadingState` (`role="status"`). Errors use `role="alert"`.
- Retry and sign-in are real buttons or links with visible text.

## RTL & i18n

- English and Arabic strings follow the Nasaq locale. The states are centred, so they read the same in both directions.

## Styling & tokens

- Built on `States` and `Button`. Target `[data-slot="data-state"]`.

## Do / Don't

- Do pass `onRetry` whenever the request can be repeated.
- Do keep `empty` for "no rows" and `error` for "request failed"; don't show an empty table after a failure.
- Don't nest DataState inside DataState for the same request.

## Related

- [`States`](../states/README.md)
- [`ErrorPages`](../error-pages/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-loading-states-data-state--docs
