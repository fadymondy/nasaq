---
name: collapsible
title: Collapsible
category: layout
status: stable
summary: Show/hide disclosure with an animated height-and-opacity panel. Wraps Base UI Collapsible.
exports: [Collapsible, CollapsibleTrigger, CollapsiblePanel]
related: [app-shell, button, sidebar-layout]
story: components-layout-collapsible
base-ui: [collapsible]
keywords: [collapsible, disclosure, expand, collapse, accordion, show more]
---

# Collapsible

A trigger that shows or hides a panel. The panel animates height and opacity over 200ms, which is one of
the few places Nasaq moves. `Collapsible` and `CollapsibleTrigger` are Base UI's, unchanged;
`CollapsiblePanel` adds the animation classes. The sidebar's collapsible groups use the same Base UI part.

This component has no story of its own in the lab. The closest demonstration is the collapsible sidebar groups in
`apps/lab/stories/app-shell.stories.tsx` (`SidebarGroup collapsible`).

## When to use

- Optional or advanced content the user can reveal ("Advanced settings", "Show more").
- A single independent disclosure.

## When not to use

- A set of sections where only one is open: use an accordion built for that.
- Transient overlays: use [`DropdownMenu`](../dropdown-menu/README.md) or [`Dialog`](../dialog/README.md).
- Sidebar groups: `SidebarGroup collapsible` in [`AppShell`](../app-shell/README.md) already handles it.

## Import

```tsx
import { Collapsible, CollapsibleTrigger, CollapsiblePanel } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Button, Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@fadymondy/nasaq/web";

export function Advanced() {
  return (
    <Collapsible>
      <CollapsibleTrigger render={<Button variant="ghost" />}>Advanced settings</CollapsibleTrigger>
      <CollapsiblePanel>
        <p className="py-2 text-body-sm">Only shown when open.</p>
      </CollapsiblePanel>
    </Collapsible>
  );
}
```

## Anatomy

```
Collapsible                  Base UI Collapsible.Root (a div)
├─ CollapsibleTrigger        Base UI Collapsible.Trigger (a button; use render={<Button />})
└─ CollapsiblePanel          data-slot="collapsible-panel"
```

## API

### `Collapsible`

Alias of Base UI `Collapsible.Root`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `open?` | `boolean` | none | Controlled open state. |
| `defaultOpen?` | `boolean` | `false` | Initial state when uncontrolled. |
| `onOpenChange?` | `(open: boolean, details) => void` | none | Called when toggled. |
| `disabled?` | `boolean` | `false` | Disables the trigger. |

### `CollapsibleTrigger`

Alias of Base UI `Collapsible.Trigger`. Accepts `render` and native button attributes. Has `data-panel-open` when open.

### `CollapsiblePanel`

Base UI `Collapsible.Panel` props with Nasaq classes: `h-(--collapsible-panel-height)`, `overflow-hidden`,
`transition-[height,opacity] duration-200 ease-nq motion-reduce:transition-none`, and `h-0 opacity-0` on `data-starting-style` / `data-ending-style`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `keepMounted?` | `boolean` | `false` | Keep the panel in the DOM while closed. |
| `hiddenUntilFound?` | `boolean` | `false` | Use `hidden="until-found"` so browser find can open it. |
| `className?` | `string` | none | Merged onto the panel. |

## Examples

### Controlled, with a rotating chevron

```tsx
import { Button, Collapsible, CollapsiblePanel, CollapsibleTrigger, Icon } from "@fadymondy/nasaq/web";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

export function Details() {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger render={<Button variant="ghost" />}>
        Details
        <Icon icon={ChevronDown} className={open ? "rotate-180" : ""} />
      </CollapsibleTrigger>
      <CollapsiblePanel>
        <p className="py-2 text-body-sm text-muted-foreground">Created 3 days ago by Fady.</p>
      </CollapsiblePanel>
    </Collapsible>
  );
}
```

### Arabic

```tsx
import { Button, Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@fadymondy/nasaq/web";

export function AdvancedAr() {
  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger render={<Button variant="ghost" />}>إعدادات متقدمة</CollapsibleTrigger>
      <CollapsiblePanel>
        <p className="py-2 text-body-sm">تظهر عند الفتح فقط.</p>
      </CollapsiblePanel>
    </Collapsible>
  );
}
```

## Accessibility

Base UI sets `aria-expanded` and `aria-controls` on the trigger, and hides the panel when closed.

| Key | Action |
| --- | --- |
| `Enter` / `Space` | Toggles the panel when the trigger is focused. |
| `Tab` | Moves through the trigger, then the panel's focusable content when open. |

- Closed panel content is removed from the accessibility tree (unless `keepMounted`).
- The trigger needs a text label. Localise it.
- Under `prefers-reduced-motion` the panel opens and closes instantly (`motion-reduce:transition-none`).

## RTL & i18n

- The panel animates height only, so it is direction-neutral.
- Any chevron you add must be a vertical one, or be wrapped in `<Icon directional />` if it points sideways.
- No built-in strings.

## Styling & tokens

- Motion token: `ease-nq`, 200ms.
- State attributes: `data-open`, `data-panel-open` (trigger), `data-starting-style`, `data-ending-style` (panel).
- Target `[data-slot=collapsible-panel]`. Add padding on inner content, not on the panel (padding breaks the height animation).

## Do / Don't

- **Do** put padding inside the panel's child, not on `CollapsiblePanel`.
- **Do** show an open/closed indicator (chevron) so state is not conveyed by position alone.
- **Don't** hide required form fields inside a closed panel.
- **Don't** animate other properties on the panel.

## Related

- [AppShell](../app-shell/README.md) · [Button](../button/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-layout-collapsible--docs
