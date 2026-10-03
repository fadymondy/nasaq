---
name: avatar
title: Avatar
category: data-display
status: stable
summary: Person or workspace image with an initials fallback, in four sizes and circle or square shapes.
exports: [Avatar, AvatarImage, AvatarFallback, avatarVariants, initials, AvatarProps]
related: [notification-item, table, badge]
story: components-data-display-avatar
base-ui: [avatar]
keywords: [avatar, profile, user, picture, initials, workspace, photo]
---

# Avatar

An image with an initials fallback, built on Base UI's `Avatar`. Give it a `name` and an optional `src`. When
there is no `src`, or the image fails to load, it shows up to two initials taken from the name. People are
round (`circle`); workspaces and organisations are square (`square`, control radius).

## When to use

- Showing a person (assignee, author, actor) or a workspace/organisation.
- Rows in tables, lists and notifications.

## When not to use

- A product or brand logo: use `ProductMark` / `ProductLogo`; never recolour a mark into an avatar.
- A status dot or count: use [`Badge`](../badge/README.md) or [`Status`](../status/README.md).
- A generic icon tile: use a lucide icon in your own tile; an avatar always represents a named entity.

## Import

```tsx
import { Avatar, avatarVariants, initials, type AvatarProps } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Avatar } from "@fadymondy/nasaq/web";

export function Owner() {
  return <Avatar name="نور عادل" src="/people/nour.jpg" />;
}
```

## Anatomy

```
Avatar                data-slot="avatar"    Base UI Avatar.Root, <span>
├─ Avatar.Image       only when `src` is set; alt = name, object-cover
└─ Avatar.Fallback    initials(name); delayed 400ms when `src` is set, aria-hidden then
```

## API

### `Avatar`

`AvatarProps extends Omit<ComponentProps<typeof BaseAvatar.Root>, "children">, VariantProps<typeof avatarVariants>`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `name?` | `string` | none | Alt text for the image and the source of the initials. Optional when you pass `fallback` or `children`. |
| `fallback?` | `ReactNode` | initials | Content shown when there is no image. |
| `children?` | `ReactNode` | none | Compose with `AvatarImage` and `AvatarFallback`; replaces the `src` image and the default fallback. |
| `src?` | `string` | none | Image URL. Without it the initials are shown at once. |
| `size?` | `"xs" \| "sm" \| "md" \| "lg"` | `"md"` | `xs` 20px (9px text), `sm` 24px (10px), `md` 32px (caption), `lg` 40px (label). |
| `shape?` | `"circle" \| "square"` | `"circle"` | `circle` is `rounded-full` (people). `square` is `rounded-control` (workspaces, organisations). |
| `className?` | `string \| ((state) => string)` | none | Merged after the variant classes. A Base UI state function is supported. |
| `...props` | Base UI `Avatar.Root` props minus `children` | none | Forwarded to the root. |

### `AvatarImage` and `AvatarFallback`

```tsx
<Avatar><AvatarImage src={url} alt="Fady" /><AvatarFallback>FM</AvatarFallback></Avatar>
```

`AvatarImage` renders nothing until the image has loaded, so the fallback shows meanwhile and on error
(`data-slot="avatar-image"`, `"avatar-fallback"`).

### `avatarVariants`

`cva(...)` class generator with variants `size` (`xs`, `sm`, `md`, `lg`) and `shape` (`circle`, `square`),
defaults `{ size: "md", shape: "circle" }`. Base classes: `inline-flex shrink-0 select-none items-center
justify-center overflow-hidden bg-secondary align-middle font-medium text-secondary-foreground`.

### `initials`

```ts
initials(name: string): string
```

Returns up to two characters: the first character of the first word and, when there are two or more words,
the first character of the last word, upper-cased. `"Fady Mondy"` gives `"FM"`. `"نور عادل"` gives `"نع"`.
`"Mahaam"` gives `"M"`. An empty name gives `""`.

## Examples

### Sizes

```tsx
import { Avatar } from "@fadymondy/nasaq/web";

export function Sizes() {
  return (
    <div className="flex items-end gap-3">
      {(["xs", "sm", "md", "lg"] as const).map((s) => (
        <Avatar key={s} name="Fady Mondy" size={s} />
      ))}
    </div>
  );
}
```

### Fallbacks and shapes

```tsx
import { Avatar } from "@fadymondy/nasaq/web";

export function Fallbacks() {
  return (
    <div className="flex items-center gap-3">
      <Avatar name="Fady Mondy" />
      <Avatar name="نور عادل" />
      <Avatar name="Mahaam" shape="square" />
      <Avatar name="Broken image" src="/does-not-exist.png" />
    </div>
  );
}
```

### Avatar with a name in a table cell

```tsx
import { Avatar } from "@fadymondy/nasaq/web";

export function Assignee({ name }: { name: string }) {
  return (
    <span className="flex items-center gap-2">
      <Avatar name={name} size="xs" />
      {name}
    </span>
  );
}
```

## Accessibility

An avatar is not focusable and has no keyboard behaviour.

- With `src`, the image has `alt={name}`. The fallback is `aria-hidden`.
- Without `src`, the initials fallback has `role="img"` and `aria-label={name}`, so the person's name is exposed
  even when the avatar stands alone.
- `initials()` takes the first grapheme of the first and last word, so emoji and other surrogate pairs are never split.
- Next to a visible name, the image `alt` repeats it. Pass `aria-hidden` on the avatar if that is noisy.
- Pass real names; they are your alt text. Localise them.

## RTL & i18n

- Initials work for Arabic names: the first letters of the first and last word (Arabic has no case).
- Avatars are not mirrored. In a flex row, the avatar sits on the inline start.
- Initials use `.toUpperCase()`, so Latin names are upper-cased and Arabic is unchanged.
- No built-in strings.

## Styling & tokens

- Background `bg-secondary`, text `text-secondary-foreground`, square radius `rounded-control`.
- Target with `[data-slot=avatar]`. Extend with `className` (for example a ring), never with raw hex.
- For other elements needing the same look, use `avatarVariants({ size, shape })`.

## Do / Don't

- **Do** use `circle` for people and `square` for workspaces and organisations.
- **Do** always pass `name`; the fallback and alt text depend on it.
- **Do** use `xs` in table rows and `md` in headers and notifications.
- **Don't** use an avatar for a product logo; use `ProductMark`.
- **Don't** stack an avatar inside another avatar-like tile.

## Related

- [NotificationItem](../notification-item/README.md) · [Table](../table/README.md) · [Badge](../badge/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-data-display-avatar--docs
