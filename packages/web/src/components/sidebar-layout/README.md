---
name: sidebar-layout
title: SidebarCustomize
category: navigation
status: beta
summary: Lets users reorder and hide sidebar items - a persisted layout hook, drag-to-reorder in the sidebar, and an accessible customize dialog.
exports: [useSidebarLayout, SidebarLayoutOptions, SidebarSortable, SidebarSortableItem, SidebarCustomize, SidebarLayout, SidebarSortableProps, SidebarCustomizeItem, SidebarCustomizeSection, SidebarCustomizeProps]
related: [app-shell, workspace-switcher, user-menu]
story: components-navigation-sidebar-customize
base-ui: []
keywords: [sidebar, customize, reorder, drag, hide, personalise, dnd, layout, persist]
---

# SidebarCustomize

Personalisation for the sidebar. Three pieces share one `SidebarLayout` object per list of items:

- **`useSidebarLayout(storageKey, ids, { defaultHidden? })`**: order and hidden ids, persisted in `localStorage`. A saved value of the wrong shape, or blocked storage, falls back to the defaults. `defaultHidden` lists ids that start switched off but stay available in Customize (for example, products the user hasn't pinned). Ids added later start hidden if they are in it.
- **`SidebarSortable` / `SidebarSortableItem`**: drag items into a new order right in the sidebar.
- **`SidebarCustomize`**: a dialog with a drag handle and a show/hide switch per item. This is the accessible path: the handle also reorders with the keyboard.

Nasaq does not know your routes. You describe items (`id`, `label`, `icon`), keep the render function
for each, and let the layout decide order and visibility.

## When to use

- Products with many nav items where users want their own order or want to hide rarely used ones.
- A "Favourites"/"Pinned" group the user arranges.

## When not to use

- A fixed sidebar with few items: render `SidebarItem`s directly in [`AppShell`](../app-shell/README.md).
- Reordering arbitrary content lists (boards, tables): this is scoped to the sidebar's vertical lists.
- Switching products or workspaces: use [`ProductSwitcher`](../product-switcher/README.md) or [`WorkspaceSwitcher`](../workspace-switcher/README.md).

## Import

```tsx
import {
  useSidebarLayout, SidebarSortable, SidebarSortableItem, SidebarCustomize,
  type SidebarLayout, type SidebarCustomizeSection,
} from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import {
  AppShell, Sidebar, SidebarContent, SidebarGroup, SidebarItem, SidebarFooter, Button,
  SidebarCustomize, SidebarSortable, SidebarSortableItem, useSidebarLayout,
} from "@fadymondy/nasaq/web";
import { Inbox, LayoutDashboard, ListTodo } from "lucide-react";
import { type ReactNode, useState } from "react";

type Entry = { id: string; label: string; icon: ReactNode; required?: boolean; href: string };

const ENTRIES: Entry[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard />, required: true, href: "/" },
  { id: "inbox", label: "Inbox", icon: <Inbox />, href: "/inbox" },
  { id: "issues", label: "My issues", icon: <ListTodo />, href: "/issues" },
];

function AppSidebar() {
  const [customizing, setCustomizing] = useState(false);
  const layout = useSidebarLayout("my-app-nav", ENTRIES.map((e) => e.id));
  const byId = new Map(ENTRIES.map((e) => [e.id, e]));

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarSortable ids={layout.visible} onMove={layout.move}>
            {layout.visible.map((id) => {
              const entry = byId.get(id)!;
              return (
                <SidebarSortableItem key={id} id={id}>
                  <SidebarItem href={entry.href} icon={entry.icon}>{entry.label}</SidebarItem>
                </SidebarSortableItem>
              );
            })}
          </SidebarSortable>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <Button variant="ghost" size="sm" onClick={() => setCustomizing(true)}>Customize sidebar</Button>
      </SidebarFooter>
      <SidebarCustomize
        open={customizing}
        onOpenChange={setCustomizing}
        sections={[{ id: "main", items: ENTRIES, layout }]}
      />
    </Sidebar>
  );
}

export const Root = ({ children }: { children: ReactNode }) => <AppShell sidebar={<AppSidebar />}>{children}</AppShell>;
```

## Anatomy

```
SidebarSortable                    (DndContext + SortableContext, vertical)
└─ SidebarSortableItem × n         data-slot="sidebar-sortable-item", data-dragging

SidebarCustomize                   Dialog (max-w-md)
├─ header                          title + description
├─ section × n                     <section aria-label={section.label}>, optional <h3>
│  └─ row × n                      <li>: drag handle <button>, icon, label, Switch
├─ live region                     aria-live="polite", sr-only: keyboard-move announcement
└─ footer                          "Reset to default" (ghost) · "Done" (primary)
```

## API

### `useSidebarLayout`

```ts
useSidebarLayout(storageKey: string, ids: readonly string[]): SidebarLayout
```

Pass the default order. Saved state is read after mount (so SSR and the first client render match) and
normalised: ids you removed are dropped, ids you added are appended. Changing `storageKey` or the set of
`ids` reloads.

### `SidebarLayout`

| Field | Type | Description |
| --- | --- | --- |
| `order` | `string[]` | Every id in the user's order. |
| `hidden` | `string[]` | Ids the user switched off. |
| `visible` | `string[]` | `order` without hidden ids: what to render. |
| `move` | `(activeId: string, overId: string) => void` | Moves `activeId` to the position of `overId`. Ignores unknown ids. |
| `setVisible` | `(id: string, visible: boolean) => void` | Show or hide one item. |
| `reset` | `() => void` | Clears storage and restores the default order. |
| `isDefault` | `boolean` | `true` when nothing is hidden and the order matches `ids`. |

### `SidebarSortable`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `ids` | `string[]` | required | The visible ids in order (`layout.visible`). |
| `onMove` | `(activeId: string, overId: string) => void` | required | Pass `layout.move`. |
| `children` | `ReactNode` | required | `SidebarSortableItem`s. |

Mouse drags start after 4px; touch drags after a 250ms press (so the list still scrolls). The click that
ends a drag is suppressed for 100ms so it does not open the link under the pointer. It has no keyboard
sensor by design: keyboard reordering lives in `SidebarCustomize`.

### `SidebarSortableItem`

Extends `ComponentProps<"div">`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `id` | `string` | required | Must match an entry in `SidebarSortable`'s `ids`. |

### `SidebarCustomizeItem`

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` | Same id as in the layout. |
| `label` | `string` | Row text and the switch's accessible name. |
| `icon?` | `ReactNode` | Shown before the label. |
| `required?` | `boolean` | Can be reordered but not hidden (its switch is disabled). |

### `SidebarCustomizeSection`

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` | Unique section key. |
| `label?` | `string` | Heading and the section's `aria-label`. |
| `items` | `SidebarCustomizeItem[]` | Descriptions for the layout's ids. Ids with no matching item are skipped. |
| `layout` | `SidebarLayout` | The hook result for this list. |

### `SidebarCustomize`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `open` | `boolean` | required | Dialog state. |
| `onOpenChange` | `(open: boolean) => void` | required | |
| `sections` | `SidebarCustomizeSection[]` | required | One per list. "Reset to default" resets all and is disabled when all are default. |
| `labels?` | `{ title?; description?; reset?; done?; reorder?(label); moved?(label, position, total); close? }` | EN/AR by provider locale | See below. |

Default labels follow the provider locale (English, or Arabic for `ar*`; pass `labels` to override). English: title "Customize sidebar", description
"Drag to reorder. Switch items off to hide them.", reset "Reset to default", done "Done", reorder
`Reorder ${label}`, moved `${label}, position ${position} of ${total}`. `close` goes to the dialog's close button.

## Examples

### Two lists in one dialog, Arabic copy

```tsx
import { SidebarCustomize, useSidebarLayout } from "@fadymondy/nasaq/web";

const MAIN = [{ id: "home", label: "الرئيسية", required: true }, { id: "inbox", label: "الوارد" }];
const TOOLS = [{ id: "time", label: "تتبع الوقت" }, { id: "teams", label: "الفرق" }];

export function Customize({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const main = useSidebarLayout("app-nav-main", MAIN.map((i) => i.id));
  const tools = useSidebarLayout("app-nav-tools", TOOLS.map((i) => i.id));
  return (
    <SidebarCustomize
      open={open}
      onOpenChange={onOpenChange}
      sections={[
        { id: "main", items: MAIN, layout: main },
        { id: "tools", label: "الأدوات", items: TOOLS, layout: tools },
      ]}
      labels={{
        title: "تخصيص الشريط الجانبي",
        description: "اسحب لإعادة الترتيب، وأوقف العناصر لإخفائها.",
        reset: "استعادة الافتراضي",
        done: "تم",
        close: "إغلاق",
        reorder: (label) => `إعادة ترتيب ${label}`,
        moved: (label, n, total) => `${label}، الموضع ${n} من ${total}`,
      }}
    />
  );
}
```

### Open it from the user menu

```tsx
import { DropdownMenuItem, UserMenu } from "@fadymondy/nasaq/web";
import { SlidersHorizontal } from "lucide-react";

export const Menu = ({ onCustomize }: { onCustomize: () => void }) => (
  <UserMenu user={{ name: "Fady Mondy", email: "hello@example.com" }}>
    <DropdownMenuItem onClick={onCustomize}>
      <SlidersHorizontal />
      Customize sidebar
    </DropdownMenuItem>
  </UserMenu>
);
```

## Accessibility

Keys on a row's drag handle in `SidebarCustomize` (the handle has `aria-keyshortcuts="ArrowUp ArrowDown Home End"`):

| Key | Action |
| --- | --- |
| `↑` / `↓` | Move the item one place up / down. |
| `Home` / `End` | Move to the first / last position. |
| `Tab` | Handle, then the item's Switch. |
| `Space` on the Switch | Show / hide the item. |
| `Esc` | Close the dialog. |

- After a keyboard move the new place is announced in an `aria-live="polite"` region (`labels.moved`) and focus stays on the handle.
- Each handle is named by `labels.reorder(label)`; each Switch by the item's `label`.
- Drag-to-reorder in the sidebar itself is pointer/touch only. The dialog is the keyboard and screen-reader route, so always offer it.
- Required items keep a disabled switch.

## RTL & i18n

- Rows and dialog use logical spacing; the handle sits at the inline start.
- Keyboard moves are vertical, so they are direction-independent.
- Every string is a prop; nothing is localised for you. Localise all `labels` and every `SidebarCustomizeItem.label`.

## Styling & tokens

- Row: `bg-popover`, `rounded-control`, dragging adds `shadow-floating` (`data-dragging`).
- Sidebar items being dragged get `bg-nq-surface-overlay` and `shadow-floating`.
- Target `[data-slot=sidebar-sortable-item][data-dragging]`. Extend with `className` on `SidebarSortableItem`.

## Do / Don't

- **Do** give every item a stable `id`; ids persist in storage. Prefix `storageKey` with your product (`"mahaam-nav-main"`).
- **Do** mark the home/dashboard item `required`.
- **Do** put the dialog trigger in the user menu, not in the sidebar body.
- **Don't** use display labels as ids (they change with locale).
- **Don't** add or remove ids per render; derive them from a stable list.

## Related

- [app-shell](../app-shell/README.md) · [user-menu](../user-menu/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-navigation-sidebar-customize--docs
