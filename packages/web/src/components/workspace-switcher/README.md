---
name: workspace-switcher
title: WorkspaceSwitcher
category: navigation
status: stable
summary: Organisation / team switcher for the top of the sidebar, with logo, plan line, an optional "Add workspace" item and room for extra menu items.
exports: [WorkspaceSwitcher, WorkspaceSwitcherProps, Workspace]
related: [app-shell, user-menu, product-switcher, command-palette]
story: components-navigation-workspace-switcher
base-ui: [menu]
keywords: [workspace, organisation, team, tenant, account, switcher, sidebar, dropdown]
---

# WorkspaceSwitcher

Switches between organisations, teams or tenants inside one product. It sits first in the sidebar
header: a bordered control showing the active workspace's logo, name and plan, opening a menu of all
workspaces. On the collapsed rail it becomes a logo-only button and the menu opens to the side.

## When to use

- Users belong to more than one workspace, org or team.
- You want "Add workspace" and workspace-level links (Settings, Invite members) in the same menu.

## When not to use

- Moving between different products: use [`ProductSwitcher`](../product-switcher/README.md).
- Account, theme and sign-out: use [`UserMenu`](../user-menu/README.md).
- A plain select in a form: use a select field.

## Import

```tsx
import { WorkspaceSwitcher, type Workspace } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Sidebar, SidebarHeader, WorkspaceSwitcher, type Workspace } from "@fadymondy/nasaq/web";
import { useState } from "react";

const workspaces: Workspace[] = [
  { id: "3x1", name: "3x1", description: "Pro · 12 members" },
  { id: "personal", name: "Fady Mondy", description: "Personal" },
];

export function Header() {
  const [workspace, setWorkspace] = useState("3x1");
  return (
    <Sidebar>
      <SidebarHeader>
        <WorkspaceSwitcher workspaces={workspaces} value={workspace} onValueChange={setWorkspace} />
      </SidebarHeader>
    </Sidebar>
  );
}
```

It reads the rail state from [`AppShell`](../app-shell/README.md) and the locale from `NasaqProvider`.
Render it inside the shell's sidebar.

## Anatomy

```
WorkspaceSwitcher
├─ trigger                     data-slot="workspace-switcher"  (DropdownMenuTrigger; data-popup-open)
│  ├─ logo                     Avatar (square) from name/logoSrc, or your `logo`
│  ├─ name + description       hidden on the rail
│  └─ chevrons-up-down         decorative, hidden on the rail
└─ menu (DropdownMenuContent)
   ├─ label                    labels.heading
   ├─ item × n                 logo + name, check mark and aria-current on the active one
   ├─ separator                only with children or onCreate
   ├─ children                 your extra DropdownMenuItems
   └─ "Add workspace"          only with onCreate
```

## API

### `Workspace`

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` | Stable id. Compared with `value`. |
| `name` | `string` | Display name, already localised. |
| `description?` | `string` | Plan or role, e.g. "Pro" or "Owner". Shown under the name in the trigger. |
| `logo?` | `ReactNode` | A `ProductMark`, image… Shown in a bordered tile. Defaults to the initials avatar. |
| `logoSrc?` | `string` | Image for the default avatar when `logo` is not given. |

### `WorkspaceSwitcher`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `workspaces` | `Workspace[]` | required | Options. Renders nothing when empty. |
| `value` | `string` | required | Id of the active workspace. An unknown id falls back to the first workspace. |
| `onValueChange` | `(id: string) => void` | required | Called when the user picks one. |
| `onCreate?` | `() => void` | none | Adds an "Add workspace" item. |
| `className?` | `string` | none | Classes for the trigger. |
| `labels?` | `{ heading?: string; create?: string }` | EN/AR built in | Menu heading ("Workspaces" / "مساحات العمل") and create item ("Add workspace" / "إضافة مساحة عمل"). |
| `children?` | `ReactNode` | none | Extra `DropdownMenuItem`s under the list (Settings, Invite members…). |

## Examples

### With a brand mark, create and extra items

```tsx
import { DropdownMenuItem, ProductMark, WorkspaceSwitcher, type Workspace } from "@fadymondy/nasaq/web";
import { Settings, UserPlus } from "lucide-react";
import { useState } from "react";

const workspaces: Workspace[] = [
  { id: "mahaam", name: "Mahaam", description: "Team · 5 members", logo: <ProductMark brand="mahaam" size={18} title="" /> },
  { id: "personal", name: "Fady Mondy", description: "Personal" },
];

export function Switcher() {
  const [value, setValue] = useState("mahaam");
  return (
    <WorkspaceSwitcher workspaces={workspaces} value={value} onValueChange={setValue} onCreate={() => console.log("create")}>
      <DropdownMenuItem><Settings />Workspace settings</DropdownMenuItem>
      <DropdownMenuItem><UserPlus />Invite members</DropdownMenuItem>
    </WorkspaceSwitcher>
  );
}
```

### Arabic

```tsx
import { WorkspaceSwitcher } from "@fadymondy/nasaq/web";

export const Ar = () => (
  <WorkspaceSwitcher
    workspaces={[{ id: "a", name: "ثلاثة في واحد", description: "احترافي · 12 عضوًا" }]}
    value="a"
    onValueChange={() => {}}
    labels={{ heading: "مساحات العمل", create: "إضافة مساحة عمل" }}
  />
);
```

## Accessibility

| Key | Action |
| --- | --- |
| `Enter` / `Space` / `↓` on trigger | Opens the menu. |
| `↑` `↓` | Move between workspaces and actions. |
| `Home` / `End` | First / last item. |
| `Enter` / `Space` | Choose the highlighted workspace or action. |
| `Esc` | Closes and returns focus to the trigger. |

- The trigger is a menu button. Expanded, its name comes from its text (name and description); on the rail it gets `aria-label` = the active workspace's name.
- The active item has `aria-current="true"`, medium weight and a check icon. Items show no shortcut hints (`Ctrl 1`…`9` clash with browser tab switching); to bind your own, use [`useRegisterCommands`](../commands/README.md).
- Logos are decorative beside the visible name.
- **Localise:** `labels`, workspace names and descriptions.

## RTL & i18n

- The trigger, list and create tile use logical properties and mirror. The menu opens from the inline start.
- On the rail the menu opens to `inline-end`, so it appears on the left in RTL.
- Built-in strings switch on the provider locale (`ar*` gets Arabic).
- The check mark sits at the inline end and is not mirrored.

## Styling & tokens

- Trigger: `border-border`, `bg-background/60`, hover `bg-nq-hover`, open `bg-nq-selected`, focus `nq-focus`. Menu uses the popover surface.
- Target `[data-slot=workspace-switcher]` and its `data-popup-open` attribute. Extend the trigger with `className`.

## Do / Don't

- **Do** put it first in `SidebarHeader`.
- **Do** show plan or role in `description`; it disambiguates similarly named workspaces.
- **Don't** use it to move between products (that is the product switcher).
- **Don't** put business logic here: `onValueChange` and `onCreate` are yours.

## Related

- [app-shell](../app-shell/README.md) · [user-menu](../user-menu/README.md)
- [product-switcher](../product-switcher/README.md) · [command-palette](../command-palette/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-navigation-workspace-switcher--docs
