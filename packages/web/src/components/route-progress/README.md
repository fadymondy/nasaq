---
name: route-progress
title: RouteProgress
category: feedback
status: beta
summary: A thin progress bar along the top edge for navigation and background jobs. It creeps while work runs, jumps to full when it ends, and a hook counts overlapping jobs.
exports: [RouteProgressTone, RouteProgressLabels, RouteProgressProps, RouteProgress, useRouteProgress]
related: [progress, spinner, toast]
story: components-feedback-route-progress
base-ui: []
keywords: [route progress, top bar, nprogress, navigation, loading bar, page transition, background job]
---

# RouteProgress

A two pixel bar on the top edge of the screen, the kind that shows a page is on its way. It does not know how long
the work takes, so it creeps forward, slows down near the end and finishes when you tell it to. It draws only. The
router, the fetch or the job queue decides when work starts and stops.

## When to use

- A route change or a data refetch that takes longer than a moment.
- Several small background jobs (saves, syncs) that should share one signal.

## When not to use

- A task with a known length or a place inside a card: use [`Progress`](../progress/README.md).
- A single button waiting: use the button's `loading` state.

## Import

```tsx
import { RouteProgress, useRouteProgress } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { RouteProgress, useRouteProgress } from "@fadymondy/nasaq/web";

export function Shell({ children }: { children: React.ReactNode }) {
  const jobs = useRouteProgress();
  return (
    <>
      <RouteProgress active={jobs.active} />
      <button onClick={() => jobs.run(fetch("/api/report"))}>Refresh</button>
      {children}
    </>
  );
}
```

With a router, call `jobs.start()` when navigation begins and the function it returns when it ends.

## Anatomy

```
RouteProgress        data-slot="route-progress" (data-state), role="progressbar"
└─ bar               data-slot="route-progress-bar", fills from the inline start
```

## API

Every `div` prop except `children`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `active` | `boolean` | `false` | Work is running. Creeps to 94%, then finishes at 100% when it turns false. |
| `value` | `number` | | Pin an exact percentage. Overrides `active`. Hidden at 0 and at 100. |
| `tone` | `"default" \| "info" \| "success" \| "warning" \| "danger"` | `"default"` | Fill colour. |
| `placement` | `"fixed" \| "absolute"` | `"fixed"` | Screen top, or the top of a `relative` parent. |
| `interval` | `number` | `250` | Milliseconds between creeps. |
| `labels` | `Partial<RouteProgressLabels>` | | Override the accessible name. |

**useRouteProgress()** returns `{ active, count, start, run }`. `start()` returns a finisher, safe to call twice.
`run(promiseOrFn)` wraps a promise and always finishes. **nextTrickle(value)** is the pure step function.

## Examples

**Pinned to a real upload**

```tsx
<RouteProgress value={(uploaded / total) * 100} tone="info" />
```

## Accessibility

- `role="progressbar"` with an accessible name and the current value. While idle it is `aria-hidden`.
- The motion is a width change only, and it is switched off under `prefers-reduced-motion`.
- The bar never carries information alone: pair it with visible content that changes, like a skeleton.

## RTL & i18n

- The fill starts at the inline start, so it grows from the right in Arabic. The accessible name is in English or Arabic by locale.

## Styling & tokens

- Uses `bg-primary` and the `nq-info`, `nq-success`, `nq-warning`, `nq-danger` fills. Target `[data-slot="route-progress"]`.

## Do / Don't

- Do mount one bar per app and count jobs with `useRouteProgress`.
- Don't start it for work under about 150 ms: show it after a short delay in your router glue.
- Don't use it as a progress meter for a known task.

## Related

- [`Progress`](../progress/README.md)
- [`Spinner`](../spinner/README.md)
- [`Toast`](../toast/README.md)
