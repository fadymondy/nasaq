---
name: states
title: EmptyState
category: feedback
status: stable
summary: Empty, error and loading states for a region (dashed frame with icon, title, description and actions; skeleton rows), plus the Skeleton primitive.
exports: [StateProps, EmptyState, ErrorState, LoadingState, LoadingStateProps, Skeleton]
related: [spinner, table, card, status]
story: components-loading-states-states
base-ui: []
keywords: [empty, error, loading, skeleton, placeholder, no data, zero state, failure]
---

# States

Four exports for the three states every data region has:

- **`EmptyState`**: nothing to show yet.
- **`ErrorState`**: loading failed. Carries an icon and words, never colour alone.
- **`LoadingState`**: skeleton rows that preview the layout that is coming.
- **`Skeleton`**: the single placeholder block used by `LoadingState`, for custom loading layouts.

`EmptyState` and `ErrorState` share one frame: a dashed, card-radius box with an optional icon tile, a title,
a description and an action row.

## When to use

- A list, table or panel has no data: `EmptyState`, with the action that fixes it.
- A request failed and the user can retry: `ErrorState`.
- A region is loading and you know roughly its shape: `LoadingState` or `Skeleton`.

## When not to use

- Inline pending work (a button saving, a refresh): use [`Spinner`](../spinner/README.md).
- A transient message or confirmation: use a toast.
- A status of one item: use [`Status`](../status/README.md) or [`Badge`](../badge/README.md).
- Decorative empty art on populated screens: leave an empty cell instead.

## Import

```tsx
import {
  EmptyState, ErrorState, LoadingState, Skeleton, type LoadingStateProps,
} from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Button, EmptyState } from "@fadymondy/nasaq/web";

export function NoIssues() {
  return (
    <EmptyState
      title="لا توجد مهام بعد"
      description="تظهر هنا المهام التي تنشئها أو تُسند إليك."
      actions={<Button variant="primary">مهمة جديدة</Button>}
    />
  );
}
```

## Anatomy

```
EmptyState        data-slot="empty-state"      dashed frame, role none
ErrorState        data-slot="error-state"      role="alert"
├─ icon tile      40px, rounded-control, lucide icon (aria-hidden); red text in ErrorState
├─ title          <p class="text-label">
├─ description    <p class="text-body-sm text-muted-foreground">   (max-w-sm column)
├─ children       anything extra
└─ actions        wrapping, centred row

LoadingState      data-slot="loading-state"    role="status", aria-live="polite"
├─ sr-only label
└─ skeleton row × rows  (or spinner + label when rows is 0)

Skeleton          data-slot="skeleton"         aria-hidden
```

## API

### `EmptyState` and `ErrorState`

Both accept the same props (the exported `StateProps` interface):
`Omit<ComponentProps<"div">, "title">` plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `title` | `ReactNode` | required | Headline. |
| `icon?` | `LucideIcon` | `Inbox` (`EmptyState`), `CircleAlert` (`ErrorState`) | Glyph in the icon tile. |
| `description?` | `ReactNode` | none | Supporting text under the title. |
| `actions?` | `ReactNode` | none | Usually one primary `Button` and at most one secondary. |
| `hatch?` | `boolean` | `false` | Hatched ground (grid expression); off automatically in the native expression. |
| `children?` | `ReactNode` | none | Extra content between the text and the actions. |
| `className?` | `string` | none | Merged onto the frame. |

`ErrorState` also sets `role="alert"`.

### `LoadingState`

`LoadingStateProps extends ComponentProps<"div">`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `label?` | `string` | `"Loading…"` / `"جارٍ التحميل…"` by provider locale | Announced to assistive tech; also shown next to the spinner when `rows` is `0`. |
| `rows?` | `number` | `3` | Number of skeleton rows. With `0`, a centred spinner and label are shown instead. |
| `className?` | `string` | none | Merged onto the wrapper. |

### `Skeleton`

`({ className, ...props }: ComponentProps<"div">)`. A `bg-secondary` block with `rounded-[4px]` that pulses
only when motion is allowed (`motion-safe:animate-pulse`). Give it a size with `className`.

## Examples

### Error with retry

```tsx
import { Button, ErrorState } from "@fadymondy/nasaq/web";

export function LoadFailed({ retry }: { retry: () => void }) {
  return (
    <ErrorState
      title="تعذّر تحميل المهام"
      description="لم يستجب الخادم."
      actions={<Button onClick={retry}>حاول مرة أخرى</Button>}
    />
  );
}
```

### Loading a list

```tsx
import { LoadingState } from "@fadymondy/nasaq/web";

export function IssuesLoading() {
  return <LoadingState rows={4} label="جارٍ التحميل…" className="max-w-md" />;
}
```

### Custom skeleton

```tsx
import { Skeleton } from "@fadymondy/nasaq/web";

export function CardSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-3 w-64" />
    </div>
  );
}
```

### Choosing the state in a data region

```tsx
import { Button, EmptyState, ErrorState, LoadingState } from "@fadymondy/nasaq/web";

type Query = { isLoading: boolean; isError: boolean; data?: string[]; refetch: () => void };

export function Issues({ q }: { q: Query }) {
  if (q.isLoading) return <LoadingState rows={4} label="جارٍ التحميل…" />;
  if (q.isError) return <ErrorState title="تعذّر التحميل" actions={<Button onClick={q.refetch}>إعادة المحاولة</Button>} />;
  if (!q.data?.length) return <EmptyState title="لا توجد مهام" actions={<Button variant="primary">مهمة جديدة</Button>} />;
  return <ul>{q.data.map((i) => <li key={i}>{i}</li>)}</ul>;
}
```

## Accessibility

None of these are focusable; keyboard access is through the `actions` you pass.

| Key | Action |
| --- | --- |
| `Tab` / `Enter` / `Space` | Reach and activate the buttons in `actions`. |

- `ErrorState` has `role="alert"`, so it is announced when it is mounted. It shows an icon and words, not colour alone.
- `LoadingState` has `role="status"` and `aria-live="polite"` with an `sr-only` label. The skeleton rows are `aria-hidden`.
- Icons are `aria-hidden`. The title and description carry the meaning.
- Localise `title`, `description`, action labels and `LoadingState`'s `label` (its default follows the provider locale).
- `Skeleton` is `aria-hidden`; pair custom skeletons with a `role="status"` label.

## RTL & i18n

- Content is centred, so it needs no mirroring. The action row wraps and follows `dir`.
- Arrows inside action buttons follow the button's own rules.
- Numbers inside copy: use `Num` from the numeric component.
- Built-in string: `LoadingState` `label` defaults to `"Loading…"`, or `"جارٍ التحميل…"` when the provider locale starts with `ar`.
- The `ErrorState` icon tile (`data-slot="state-icon"`) is coloured directly with `text-nq-danger-text`.

## Styling & tokens

- Frame: `border-dashed border-border`, `rounded-card`; icon tile `bg-card`, `rounded-control`; `ErrorState` icon `text-nq-danger-text`.
- Skeleton: `bg-secondary`. Row height `h-row`.
- Target with `[data-slot=empty-state]`, `[data-slot=error-state]`, `[data-slot=loading-state]`, `[data-slot=skeleton]`.
- Extend with `className`. Do not colour with raw hex.

## Do / Don't

- **Do** say what is missing and give the action that fixes it.
- **Do** prefer skeletons over spinners for regions; they preview the layout.
- **Do** give errors an icon and words.
- **Don't** add empty-state art or "welcome" filler on populated screens.
- **Don't** show more than one primary action.
- **Don't** rely on the default `"Loading…"` label in Arabic.

## Related

- [Spinner](../spinner/README.md) · [Table](../table/README.md) · [Card](../card/README.md) · [Status](../status/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-loading-states-states--docs
