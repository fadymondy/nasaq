---
name: resizable
title: ResizablePanelGroup
category: layout
status: beta
summary: Split panes with drag handles and keyboard resize, built on react-resizable-panels, with RTL handled for horizontal groups.
exports: [ResizablePanelGroup, ResizablePanel, ResizableHandle, ResizablePanelGroupProps, ResizablePanelProps, ResizableHandleProps]
related: [scroll-area, sidebar-layout, app-shell]
story: components-layout-resizable
base-ui: []
keywords: [resizable, split, panes, panels, splitter, handle, drag, layout]
---

# ResizablePanelGroup

A row or column of panels separated by draggable handles. Users resize the panels with the pointer or the keyboard. It wraps
`react-resizable-panels` and adds Nasaq styling, a focus ring, an optional grip, a localised handle name and RTL support.

## When to use

- Editor, inbox or file-browser layouts where the user decides how much room each area gets.

## When not to use

- A fixed sidebar: use `sidebar-layout`.
- Scrolling content: use `scroll-area`.

## Import

```tsx
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@fadymondy/nasaq/web";

export function Split() {
  return (
    <div className="h-72 w-full">
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel id="nav" defaultSize="30%" minSize="15%">Navigation</ResizablePanel>
        <ResizableHandle withGrip />
        <ResizablePanel id="main" defaultSize="70%">Content</ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
```

The group fills its parent (`size-full`), so the parent needs a height.

## Anatomy

```
ResizablePanelGroup   data-slot="resizable-group"
  ResizablePanel      data-slot="resizable-panel"
  ResizableHandle     data-slot="resizable-handle"   (role="separator")
    grip              data-slot="resizable-grip"     (when withGrip)
  ResizablePanel
```

## API

### ResizablePanelGroup

Accepts the `Group` props of `react-resizable-panels` (`defaultLayout`, `onLayoutChange`, `onLayoutChanged`, `disabled`, ...).

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `orientation` | `"horizontal" \| "vertical"` | `"horizontal"` | Side by side, or stacked. |
| `dir` | `"ltr" \| "rtl"` | from the Nasaq provider | Overrides the direction. Only horizontal groups are affected. |

### ResizablePanel

The `Panel` props of the library: `id`, `defaultSize`, `minSize`, `maxSize`, `collapsible`, `collapsedSize`, `onResize`, `panelRef`.
Sizes are numbers (pixels) or strings with a unit (`"30%"`, `"20rem"`). Give panels an `id` when you save the layout.

### ResizableHandle

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `withGrip` | `boolean` | `false` | Show a small grip in the middle of the handle. |
| `label` | `string` | "Resize panels" / "تغيير حجم اللوحات" | Accessible name. |
| `disabled` | `boolean` | `false` | Blocks resizing through this handle. |

## Examples

Nested groups and a collapsible panel:

```tsx
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@fadymondy/nasaq/web";

export function Editor() {
  return (
    <div className="h-96">
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel id="files" defaultSize="30%" collapsible collapsedSize="0%">الملفات</ResizablePanel>
        <ResizableHandle withGrip />
        <ResizablePanel id="work" defaultSize="70%">
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel id="editor" defaultSize="65%">المحرر</ResizablePanel>
            <ResizableHandle withGrip />
            <ResizablePanel id="terminal" defaultSize="35%">الطرفية</ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
```

## Accessibility

The handle is a focusable `role="separator"` with `aria-valuenow`, `aria-valuemin` and `aria-valuemax`.

| Key | Action |
| --- | --- |
| Arrow Left / Right | Moves a horizontal handle 5% (physical direction, also in RTL). |
| Arrow Up / Down | Moves a vertical handle 5%. |
| Home / End | Moves the handle to the limit. |
| Enter | Collapses or expands the panel before a collapsible handle. |

Localise `label` if you name the handles more specifically ("Resize sidebar").

## RTL & i18n

`react-resizable-panels` reads the pointer and the arrow keys in physical coordinates and does not know about `dir`. A
mirrored flex row would therefore drag the wrong way. In a horizontal group inside an RTL provider (or with `dir="rtl"`),
Nasaq lays the group out `ltr` with its children in reverse order and restores `dir="rtl"` on every panel. Result: the first
panel sits on the right, text is right-to-left, and dragging or pressing an arrow moves the handle the way the pointer or key
points. Consequences: the DOM (and tab) order of an RTL horizontal group is reversed, and the children of the group must be
direct `ResizablePanel` / `ResizableHandle` elements (no wrapper components that hide them behind fragments).
Vertical groups need no change.

## Styling & tokens

Uses `bg-border`, `bg-nq-focus`, `outline-nq-focus`, `bg-card`, `text-muted-foreground`. Handle state is on `data-separator`:
`inactive`, `hover`, `active`, `focus`, `disabled`. Add `className` to any part.

## Do / Don't

- Do set `minSize` so a panel cannot vanish; use `collapsible` when it may.
- Do give the group a parent with a height.
- Don't override colours with raw hex.

## Related

- [scroll-area](../scroll-area/README.md)
- [sidebar-layout](../sidebar-layout/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-layout-resizable--docs
