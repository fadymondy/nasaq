---
name: separator
title: Separator
category: layout
status: stable
summary: A 1px horizontal or vertical divider line in the border token. Wraps Base UI Separator.
exports: [Separator]
related: [app-shell, breadcrumb, dropdown-menu, card]
story: components-layout-separator
base-ui: [separator]
keywords: [divider, separator, hr, rule, line]
---

# Separator

A thin line that divides content. Horizontal by default (full width, 1px tall); vertical is 1px wide and
1rem (`h-4`) tall, centred on the cross axis so it sits between inline items such as header buttons.

There is no `separator` story of its own; it is demonstrated in `apps/lab/stories/app-shell.stories.tsx`
(vertical, between the sidebar trigger and the breadcrumbs).

## When to use

- Dividing groups of related content or toolbar items.
- Visual rhythm between sections when spacing alone is not enough.

## When not to use

- Separating levels of surface: use the surface tokens ([COLOR](../../../../../docs/foundations/COLOR.md)); borders separate siblings, not levels.
- A divider inside a menu: use `DropdownMenuSeparator` ([`DropdownMenu`](../dropdown-menu/README.md)).
- A breadcrumb chevron: use `BreadcrumbSeparator` ([`Breadcrumb`](../breadcrumb/README.md)).

## Import

```tsx
import { Separator } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Separator } from "@fadymondy/nasaq/web";

export function Sections() {
  return (
    <div className="flex flex-col gap-4">
      <p>Profile</p>
      <Separator />
      <p>Security</p>
    </div>
  );
}
```

## Anatomy

```
Separator     data-slot="separator"   role="separator", aria-orientation from Base UI
```

## API

### `Separator`

Base UI `Separator` props (`ComponentProps<typeof BaseSeparator>`).

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `orientation?` | `"horizontal" \| "vertical"` | `"horizontal"` | Direction of the line. |
| `className?` | `string` | none | Merged with `shrink-0 bg-border` and the size classes. |
| `render?` | `ReactElement \| function` | none | Base UI render prop. |

Horizontal: `h-px w-full`. Vertical: `h-4 w-px self-center`. Override the length with `className` (e.g. `h-6`), or pass `className="h-auto self-stretch"` to fill the cross axis of a flex row. The default stays `h-4` so existing headers keep their look.

## Examples

### Vertical between toolbar items

```tsx
import { Button, Separator } from "@fadymondy/nasaq/web";

export function Toolbar() {
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="ghost">Bold</Button>
      <Button size="sm" variant="ghost">Italic</Button>
      <Separator orientation="vertical" />
      <Button size="sm" variant="ghost">Link</Button>
    </div>
  );
}
```

### With labels in Arabic

```tsx
import { Separator } from "@fadymondy/nasaq/web";

export function SectionsAr() {
  return (
    <div dir="rtl" className="flex flex-col gap-4">
      <p>الملف الشخصي</p>
      <Separator />
      <p>الأمان</p>
    </div>
  );
}
```

## Accessibility

- Renders `role="separator"` with `aria-orientation`. Screen readers announce it as a divider.
- It is not focusable and has no keyboard behaviour.
- Base UI's Separator does not expose a `decorative` prop; if a line is purely decorative, consider a
  border utility on the container instead so it is not announced.

## RTL & i18n

- A line is symmetric, so it does not mirror. Vertical separators sit between items in DOM order and follow `dir`.
- Use `me-*` / `ms-*` for spacing (as the app-shell story does with `className="me-1"`), never `mr-*` / `ml-*`.
- No built-in strings.

## Styling & tokens

- Colour: `bg-border`. Change it with a token class such as `bg-nq-line`; never raw hex.
- Target `[data-slot=separator]`, `[data-orientation=vertical]`.

## Do / Don't

- **Do** use borders to separate siblings on the same surface level.
- **Do** prefer spacing over a line when the grouping is already clear.
- **Don't** use separators as decoration or to fill empty space.
- **Don't** stack a separator directly against a card border.

## Related

- [AppShell](../app-shell/README.md) · [DropdownMenu](../dropdown-menu/README.md) · [Card](../card/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-layout-separator--docs
