---
name: text
title: Text
category: typography
status: stable
summary: Typography roles (display to code) as one polymorphic component, plus the Kbd keyboard-key chip.
exports: [Text, Kbd, TextProps, TextRole]
related: [numeric, icon, field]
story: foundations-typography
base-ui: []
keywords: [typography, heading, body, label, caption, eyebrow, code, kbd, shortcut, type scale]
---

# Text

One component for every typographic role in Nasaq. `variant` picks the role (size, line height, weight,
colour); `as` picks the element. Latin and Arabic metrics resolve from the nearest `lang`, so the same
role is correct in both scripts. `Kbd` renders a keyboard key such as <kbd>⌘</kbd> <kbd>K</kbd>.

## When to use

- Headings, body copy, labels, captions and inline code, instead of hand-picking `text-*` classes.
- Showing shortcuts: `Kbd`.

## When not to use

- Formatted numbers, currency, percent: use [`Num`](../numeric/README.md) inside `Text`.
- Form labels tied to a control: use `FieldLabel` from [Field](../field/README.md).
- Isolating LTR runs inside Arabic: use `Ltr` / `Bdi` from [icon](../icon/README.md).

## Import

```tsx
import { Text, Kbd, type TextRole, type TextProps } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Text } from "@fadymondy/nasaq/web";

export function Intro() {
  return (
    <>
      <Text variant="eyebrow">Overview</Text>
      <Text variant="h1">One product language.</Text>
      <Text variant="body">Every surface, in English and Arabic.</Text>
    </>
  );
}
```

## Anatomy

```
Text     data-slot="text"     (element from `as`, else the variant's default)
Kbd      data-slot="kbd"      (<kbd dir="ltr">)
```

## API

### `Text`

```ts
Text<E extends ElementType = "span">(props: TextProps<E>): JSX.Element
type TextProps<E extends ElementType = "span"> = { variant?: TextRole; as?: E } & Omit<ComponentProps<E>, "as">
```

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `variant?` | `TextRole` | `"body"` | The typography role. |
| `as?` | `ElementType` | the variant's default element | Element or component to render. Props are typed from it. |
| `className?` | `string` | none | Merged after the role classes. |
| any element prop | from `as` | none | Forwarded (`id`, `lang`, `dir`, `onClick`, ...). |

### `TextRole`

`"display" | "h1" | "h2" | "h3" | "body" | "body-sm" | "label" | "caption" | "eyebrow" | "code"`

| Role | Default element | Classes | Use |
| --- | --- | --- | --- |
| `display` | `h1` | `text-display text-foreground` | Hero and landing headline. |
| `h1` | `h1` | `text-h1 text-foreground` | Page title. |
| `h2` | `h2` | `text-h2 text-foreground` | Section title. |
| `h3` | `h3` | `text-h3 text-foreground` | Sub-section title. |
| `body` | `p` | `text-body text-nq-fg-body` | Paragraphs. |
| `body-sm` | `p` | `text-body-sm text-nq-fg-body` | Dense UI copy. |
| `label` | `span` | `text-label text-foreground` | Control and row labels. |
| `caption` | `span` | `text-caption text-muted-foreground` | Hints, metadata. |
| `eyebrow` | `span` | `eyebrow` | Small uppercase overline (Latin only; Arabic has no case or tracking). |
| `code` | `code` | `font-mono text-code` | Inline code. |

### `Kbd`

`ComponentProps<"kbd">`. Renders a 20px-high chip with `dir="ltr"`, `font-mono`, `text-[11px]`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `aria-label?` | `string` | none | Names a glyph key (`⌘` → `"Command"`). When set, the chip gets `role="img"` so the name is announced. |
| `className?` | `string` | none | Merged onto the chip. |
| any `<kbd>` prop | | none | Forwarded. `dir` can be overridden because props spread last. |

## Examples

### Semantic element differs from visual role

```tsx
import { Text } from "@fadymondy/nasaq/web";

export function SectionTitle() {
  return (
    <Text as="h2" variant="h3">
      Billing
    </Text>
  );
}
```

### Shortcut hint

```tsx
import { Kbd, Text } from "@fadymondy/nasaq/web";

export function Hint() {
  return (
    <Text variant="body-sm">
      Open the command menu with <Kbd>⌘</Kbd> <Kbd>K</Kbd>
    </Text>
  );
}
```

### Arabic copy with an LTR shortcut and figure

```tsx
import { Kbd, Ltr, Num, Text } from "@fadymondy/nasaq/web";

export function ArabicHint() {
  return (
    <div dir="rtl" lang="ar" className="flex max-w-md flex-col gap-2">
      <Text variant="h2">لوحة الأوامر</Text>
      <Text variant="body-sm">
        افتح القائمة بالضغط على <Kbd>Ctrl</Kbd> + <Kbd>K</Kbd>، أو استخدم الرمز <Ltr>nq-cmd</Ltr>.
      </Text>
      <Text variant="caption">
        لديك <Num value={1284} /> عنصرًا.
      </Text>
    </div>
  );
}
```

### Every role

```tsx
import { Text, type TextRole } from "@fadymondy/nasaq/web";

const ROLES: TextRole[] = ["display", "h1", "h2", "h3", "body", "body-sm", "label", "caption", "eyebrow", "code"];

export function Roles() {
  return (
    <div className="flex flex-col gap-4">
      {ROLES.map((role) => (
        <Text key={role} variant={role} as="div">
          {role}: One product language.
        </Text>
      ))}
    </div>
  );
}
```

## Accessibility

- `Text` adds no ARIA. Choose `as` for document structure: `display` and `h1` default to `<h1>`, so use
  `as="h2"` (or another element) when a page already has an `h1`, and keep heading levels in order.
- `Kbd` renders a native `<kbd>`, which screen readers read as text. For glyph keys pass `aria-label`
  (`<Kbd aria-label="Command">⌘</Kbd>`); localise it.
- Contrast: `body` uses `text-nq-fg-body`, `caption` uses `text-muted-foreground`. Do not restyle them lighter.

## RTL & i18n

- Latin and Arabic type metrics resolve from the nearest `lang`; set `lang="ar"` on the Arabic container
  (`NasaqProvider` does this from the locale).
- `eyebrow` is uppercase mono at 11px for Latin. Arabic has no case, so it is set without tracking at 13px.
- `Kbd` is always `dir="ltr"` so `Ctrl` + `K` keeps its order inside Arabic text.
- For an LTR run in Arabic prose (codes, emails) use `Ltr`; for user-supplied names use `Bdi`
  ([icon](../icon/README.md)). For figures use [`Num`](../numeric/README.md).

## Styling & tokens

- Roles come from the typography tokens (`text-display`, `text-h1` ... `text-code`, `eyebrow`) and colour
  tokens `text-foreground`, `text-nq-fg-body`, `text-muted-foreground`.
- `Kbd`: `border-border`, `bg-card`, `text-muted-foreground`, `rounded-[4px]`.
- Target `[data-slot=text]` and `[data-slot=kbd]`. Extend with `className`; do not override colours with
  raw hex.

## Do / Don't

- **Do** pick the role by meaning, and the element by document structure.
- **Do** keep sizes at or above the 12px floor; use the roles rather than ad-hoc sizes.
- **Don't** use `eyebrow` for Arabic copy that needs emphasis: there is no uppercase to lean on.
- **Don't** put more than one `h1` on a page.

## Related

- [Num](../numeric/README.md) · [Icon, Ltr, Bdi](../icon/README.md) · [Field](../field/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/foundations-typography--docs
