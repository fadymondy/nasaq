---
name: button
title: Button
category: actions
status: stable
summary: The action button, with five variants, five sizes and a built-in loading state. Wraps Base UI Button.
exports: [Button, buttonVariants, ButtonProps]
related: [dropdown-menu, dialog, sheet, tooltip, spinner]
story: components-actions-button
base-ui: [button]
keywords: [button, action, cta, primary, danger, loading, icon button, link]
---

# Button

The one control for "do something". It wraps Base UI's `Button` and adds Nasaq's variants, sizes and a
`loading` state that shows a spinner, sets `aria-busy` and blocks clicks while the button stays focusable.
`buttonVariants` is exported so a link or another element can look like a button.

## When to use

- Any action the user triggers: save, delete, open a dialog, submit a form.
- An icon-only action (`size="icon"` / `"icon-sm"`) with an `aria-label`.
- An inline text-style action (`variant="link"`).

## When not to use

- Navigation to another page: render a link styled with `buttonVariants`, or use a sidebar item in [`AppShell`](../app-shell/README.md).
- A list of related actions: use [`DropdownMenu`](../dropdown-menu/README.md).
- A two-state setting: use [`Switch`](../switch/README.md).

## Import

```tsx
import { Button, buttonVariants, type ButtonProps } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Button } from "@fadymondy/nasaq/web";

export function SaveBar() {
  return (
    <div className="flex gap-2">
      <Button variant="ghost">Cancel</Button>
      <Button variant="primary">Save changes</Button>
    </div>
  );
}
```

## Anatomy

```
Button                      data-slot="button"   (renders a <button>)
├─ Spinner                  data-slot="spinner"  only when loading, aria-hidden
└─ children                 text and/or icons (direct svg children are sized to 16px)
```

## API

### `Button`

`ButtonProps` extends the props of Base UI `Button` (every native `<button>` attribute, plus `nativeButton`,
`render` and `focusableWhenDisabled`) and `VariantProps<typeof buttonVariants>`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `variant?` | `"primary" \| "secondary" \| "ghost" \| "danger" \| "link"` | `"secondary"` | Visual style. See below. |
| `size?` | `"sm" \| "md" \| "lg" \| "icon" \| "icon-sm"` | `"md"` | Size. See below. |
| `shape?` | `"default" \| "pill"` | `"default"` | `pill` is fully rounded with a little more padding; icon sizes become circles. Sets `data-shape="pill"`. No effect on `link`. |
| `loading?` | `boolean` | `false` | Shows a `Spinner` before the children (in place of them for `icon` / `icon-sm`), sets `aria-busy`, blocks interaction but keeps focus (`focusableWhenDisabled`). `aria-busy` and `disabled` are applied after your props, so they cannot be overridden while loading. |
| `disabled?` | `boolean` | `false` | Disabled (50% opacity, no pointer events). Also disabled while `loading`. |
| `className?` | `string` | none | Merged after the variant classes with `cn`. |
| `render?` | `ReactElement \| function` | none | Base UI render prop: render as another element (e.g. an `<a>`). Set `nativeButton={false}` when it is not a `<button>`. |
| `children?` | `ReactNode` | none | Label and/or icons. |

Variants:

| `variant` | Use |
| --- | --- |
| `primary` | The one primary action on a view (`bg-primary`, follows the product brand). |
| `secondary` | Default. Bordered, on `bg-card`. |
| `ghost` | Low emphasis, transparent until hovered. |
| `danger` | Destructive action (`bg-destructive`). |
| `link` | Underlined text, no padding, auto height (`h-auto px-0` for `sm` / `md` / `lg`, no `!important`, so `className` can override e.g. `h-8 px-2`). |

Sizes:

| `size` | Result |
| --- | --- |
| `sm` | `h-control-sm`, `px-2.5` |
| `md` | `h-control`, padding from `--nq-control-pad` |
| `lg` | control height + 8px, `px-5`, body text size |
| `icon` | square `size-control`, no padding |
| `icon-sm` | square `size-control-sm`, no padding |

Shapes:

| `shape` | Use |
| --- | --- |
| `default` | Everywhere in the app: forms, toolbars, dialogs. |
| `pill` | Marketing calls to action, floating toolbars over media, and filter-like actions next to chips. Keep one shape per group. |

### `buttonVariants`

`cva` function: `buttonVariants({ variant?, size?, shape? }) => string`. Use it to style non-button elements.

```tsx
import { buttonVariants } from "@fadymondy/nasaq/web";

export function BillingLink() {
  return (
    <a href="/billing" className={buttonVariants({ variant: "secondary" })}>
      Billing
    </a>
  );
}
```

## Examples

### Variants and icons

```tsx
import { Button, Icon } from "@fadymondy/nasaq/web";
import { ArrowRight, Trash2 } from "lucide-react";

export function Variants() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="primary">
        Continue <Icon icon={ArrowRight} directional />
      </Button>
      <Button>Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">
        <Trash2 /> Delete project
      </Button>
      <Button variant="link">Learn more</Button>
    </div>
  );
}
```

### Loading on submit

```tsx
import { Button } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function SubmitButton() {
  const [saving, setSaving] = useState(false);
  return (
    <Button
      variant="primary"
      loading={saving}
      onClick={async () => {
        setSaving(true);
        await new Promise((r) => setTimeout(r, 1000));
        setSaving(false);
      }}
    >
      {saving ? "جارٍ الحفظ…" : "حفظ"}
    </Button>
  );
}
```

### Icon-only with a tooltip

```tsx
import { Button, Tooltip } from "@fadymondy/nasaq/web";
import { Plus } from "lucide-react";

export function AddButton() {
  return (
    <Tooltip content="Add issue">
      <Button size="icon" variant="ghost" aria-label="Add issue">
        <Plus />
      </Button>
    </Tooltip>
  );
}
```

## Accessibility

Base UI renders a native `<button>`, so the browser provides the keyboard behaviour.

| Key | Action |
| --- | --- |
| `Enter` / `Space` | Activates the button. |
| `Tab` | Moves focus to it. It stays in the tab order while `loading`. |

- Icon-only buttons (`icon`, `icon-sm`) **must** have an `aria-label`. Localise it.
- `loading` sets `aria-busy="true"`; with an icon size only the spinner is shown, so keep the `aria-label`.
- Disabled state is exposed through `disabled` / `data-disabled`.
- Focus ring: 2px `outline-nq-focus` on `:focus-visible`.
- The button honours `--nq-touch-min` as a minimum height on touch densities.

## RTL & i18n

- Padding and gap are symmetric, so the button needs no mirroring. Icons sit in DOM order and follow `dir`.
- Directional icons (arrows, chevrons) must be wrapped in `<Icon directional />` so they mirror in RTL.
- Button text is the caller's; there are no built-in strings.

## Styling & tokens

- Tokens: `rounded-control`, `bg-primary`, `bg-destructive`, `bg-card`, `border-border`, `bg-nq-hover`, `outline-nq-focus`, `text-label`.
- Hover on `primary` / `danger` mixes the base colour with `--nq-fg` (88/12).
- Target with `[data-slot=button]`, `[data-disabled]`, `[aria-busy=true]`.
- Extend with `className`. Do not set colours with raw hex.

## Do / Don't

- **Do** use one `primary` button per view.
- **Do** make destructive buttons say what they destroy ("Delete project"), with the danger variant and icon.
- **Don't** use `danger` for a non-destructive action.
- **Don't** signal state by colour alone; `loading` and `disabled` also change content and opacity.
- **Don't** line up many buttons where a [`DropdownMenu`](../dropdown-menu/README.md) fits.

## Related

- [DropdownMenu](../dropdown-menu/README.md) · [Dialog](../dialog/README.md) · [Sheet](../sheet/README.md)
- [Tooltip](../tooltip/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-actions-button--docs
