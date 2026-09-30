---
name: page-actions
title: Page Actions
category: actions
status: beta
summary: The header's action area. One visible primary action, the rest behind a "More actions" menu, and all of them in the command palette with their shortcuts bound.
exports: [PageActions, PageActionsProps, PageAction]
related: [app-shell, commands, command-palette, dropdown-menu, button]
story: components-actions-page-actions
base-ui: [menu, tooltip]
keywords: [page actions, header actions, top bar, toolbar, more menu, overflow, kebab, primary action, shortcuts, command palette]
---

# Page Actions

Keeps the top bar calm. A page declares its actions once. The primary one stays visible. The rest sit behind ⋯. Every
action is also registered in the command palette under **This page**, and its shortcut is bound globally, so
nothing is hidden from keyboard users.

## When to use

- In `AppHeader`, at the inline end, for the actions of the current page.
- On detail pages (edit, copy link, archive, delete) and list pages (new, export).

## When not to use

- Row actions in a table or list: use a `DropdownMenu` in the row.
- Form submit and cancel: those belong at the end of the form.
- Global actions that exist on every page (search, account): those belong in the shell or palette.

## Import

```tsx
import { PageActions, type PageAction } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<AppHeader>
  <SidebarTrigger />
  <Breadcrumb>…</Breadcrumb>
  <PageActions
    className="ms-auto"
    primary={{ id: "mahaam.issue.new", label: "New issue", icon: Plus, shortcut: "C", onSelect: openComposer }}
    actions={[
      { id: "mahaam.issues.export", label: "Export CSV", icon: Download, onSelect: exportCsv },
      { id: "mahaam.issue.delete", label: "Delete", icon: Trash2, danger: true, group: "danger", onSelect: confirmDelete },
    ]}
  >
    <NotificationsSheet />
  </PageActions>
</AppHeader>
```

It must be inside a `CommandProvider` for palette registration. `AppShell` provides one.

## Anatomy

```
div [data-slot=page-actions]
├─ children (always-visible extras, e.g. notifications)
├─ ⋯ "More actions" (ghost icon button + tooltip) → menu, grouped, with shortcut hints
└─ primary button (label hidden below sm when it has an icon; tooltip shows the shortcut)
```

## API

### `PageActions`

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `primary` | `PageAction` | — | The one visible action. Use at most one. |
| `actions` | `PageAction[]` | `[]` | Behind ⋯. The menu is omitted when empty. |
| `commands` | `boolean` | `true` | Register every action in the palette under "This page" and bind its shortcut. |
| `moreLabel` | `string` | "More actions" / "إجراءات أخرى" | Accessible name and tooltip of ⋯. |
| `children` | `ReactNode` | — | Rendered before ⋯. Keep it to one or two icon buttons. |

Plus any `<div>` prop.

### `PageAction`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | Unique in the command registry. Prefix with the product. |
| `label` | `string` | Localised by the host. |
| `icon` | `LucideIcon \| ReactElement` | Shown in the menu, palette and primary button. |
| `onSelect` / `href` | `() => void` / `string` | `href` renders a link and navigates from the palette. |
| `shortcut` | `string` | `"C"`, `"Mod Shift C"`, `"G S"`. Shown as ⌘/Ctrl per platform. |
| `keywords` | `string[]` | Extra palette search words. |
| `disabled` | `boolean` | Disabled in menu and palette. |
| `danger` | `boolean` | Red in the menu; palette lists it only once the user types. |
| `group` | `string` | Menu groups in first-seen order, separated by a line. |

Registration is keyed on what the palette shows (ids, labels, shortcuts, state). Passing fresh arrays or inline
callbacks on every render is fine: the latest callback always runs.

## Accessibility

- ⋯ has an accessible name and a tooltip. The menu is Base UI Menu, with arrow keys, typeahead and Esc.
- When its label is hidden on small screens, the primary button keeps its name via `aria-label`, and it has
  `aria-keyshortcuts`.
- Every action is reachable from the palette (⌘K) and by its shortcut. Plain-key shortcuts don't fire while
  typing in a field.
- The `AppShell` also renders a "Skip to content" link as the first tab stop, targeting `AppMain`.

## RTL & i18n

Labels come from the host. The ⋯ label defaults to the locale. The menu opens toward the inline end, and shortcut keys
stay LTR in both directions.

## Do / Don't

- Do keep one primary action per page. Put everything else in the menu.
- Do give frequent actions a shortcut. The menu and tooltip teach it.
- Don't put more than two extras in `children`. The point is a quiet top bar.
- Don't make a destructive action primary.

## Related

`app-shell`, `commands`, `command-palette`, `dropdown-menu`, `button`.

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-actions-page-actions--docs
