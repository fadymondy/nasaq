---
name: command-palette
title: CommandPalette
category: keyboard
status: stable
summary: Spotlight-style ⌘K palette that ranks and renders every command registered in the app, with nested pages, async results and a SearchTrigger field.
exports: [CommandPalette, CommandPaletteProps, SearchTrigger, SearchTriggerProps, CommandItem, CommandGroup]
related: [commands, app-shell, product-switcher, workspace-switcher]
story: components-keyboard-commands-command-palette
base-ui: [autocomplete, dialog]
keywords: [command palette, cmdk, spotlight, search, shortcuts, quick actions, raycast, linear]
---

# CommandPalette

The UI half of Nasaq's command system. It holds **no commands of its own**: it reads what components
registered through the [commands registry](../commands/README.md) (`useRegisterCommands`,
`useRegisterCommandSource`), ranks them against the query, groups them by section and renders them.
This is how a product adds navigation, creation, contextual and AI actions without Nasaq knowing any
business logic: the product passes plain data plus a `perform` callback.

- Opens with `⌘K` / `Ctrl+K` (or `SearchTrigger`).
- Diacritic- and letter-variant-insensitive Arabic search.
- Commands with `children` open a nested page; `Backspace` on an empty field goes back.
- Async sources add results as the user types (debounced, abortable).
- Also exports `SearchTrigger`, the "Search… ⌘K" field for the sidebar.

## When to use

- Global search and quick actions in a product with many destinations and commands.
- Exposing keyboard shortcuts (`G I`, `C`) with a discoverable list.

## When not to use

- Filtering one list or table: use that component's own search field.
- A picker inside a form: use a select or combobox field.
- Storing business logic in Nasaq: register commands from the product instead.

## Import

```tsx
import { CommandPalette, SearchTrigger, type Command, type CommandPaletteProps } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

Inside `AppShell` (which supplies the registry and shared open state):

```tsx
import { AppShell, CommandPalette, SearchTrigger, Sidebar, SidebarHeader, useRegisterCommands, type Command } from "@fadymondy/nasaq/web";
import { FilePlus2, Inbox } from "lucide-react";
import { useMemo } from "react";

function Palette() {
  const commands = useMemo<Command[]>(
    () => [
      { id: "app.go.inbox", section: "navigation", label: "Inbox", icon: Inbox, shortcut: "G I", perform: () => location.assign("/inbox") },
      { id: "app.new.issue", section: "create", label: "New issue", icon: FilePlus2, shortcut: "C", perform: () => console.log("new issue") },
    ],
    [],
  );
  useRegisterCommands(commands);
  return <CommandPalette />;
}

export function Root({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      sidebar={
        <Sidebar>
          <SidebarHeader>
            <SearchTrigger />
          </SidebarHeader>
        </Sidebar>
      }
    >
      {children}
      <Palette />
    </AppShell>
  );
}
```

Memoise the array you pass to `useRegisterCommands`; a new array each render re-registers every render.

Without `AppShell`, wrap in `CommandProvider` and control the palette with `open` / `onOpenChange`
(see Examples). `SearchTrigger` can only open a palette through the shell; outside it, give it an `onClick`.

## Anatomy

```
CommandPalette                       Dialog, data-slot="command-palette" (aria-label = labels.title)
├─ input row
│  ├─ search icon                    spinner while async sources are running
│  ├─ page chips                     one per nested page; click to jump back
│  ├─ input                          Autocomplete input
│  └─ "Esc" close button
├─ results                           Autocomplete list, scrolls
│  ├─ empty state                    emptyLabel / searching
│  └─ group × n                      heading = section label (screen-reader-only on a nested page)
│     └─ item × n                    icon, label, hint, shortcut keys, chevron when it has children
└─ hint bar                          ↑↓ navigate · ↵ open · ⌫ back (only on a nested page)

SearchTrigger                        data-slot="search-trigger" (button)
```

## API

### `CommandPalette`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `commands?` | `Command[]` | none | Extra commands on top of the registry. |
| `groups?` | `CommandGroup[]` | none | **Deprecated** static groups; they render as their own sections before the registry's. |
| `sectionLabels?` | `Partial<Record<CommandSection \| (string & {}), string>>` | none | Override section headings, e.g. `{ navigation: "Jump to" }`. Standard sections are already localised. |
| `open?` | `boolean` | shell state, else local | Controlled open state. Inside `AppShell` it defaults to the shell's, shared with `SearchTrigger`. |
| `onOpenChange?` | `(open: boolean) => void` | none | Called on every open/close. |
| `hotkey?` | `boolean` | `true` | Registers `⌘K` / `Ctrl+K`. Render only one palette (or set `false` on the others). |
| `placeholder?` | `string` | "Search or run a command…" / "ابحث أو نفّذ أمرًا…" | Input placeholder (root page). |
| `emptyLabel?` | `string` | "No results" / "لا نتائج" | Empty state. |
| `labels?` | `{ title?; navigate?; select?; close?; back?; searching? }` | EN/AR built in | Dialog name ("Command palette"), hint texts ("Navigate", "Open", "Back"), Esc button name ("Close"), "Searching…". |

Each open starts fresh: empty query, root page, no async results. Opening is idempotent per state.

### `CommandItem` and `CommandGroup` (deprecated)

Legacy shapes for static lists: `CommandItem { id; label; icon?: LucideIcon; keywords?; shortcut?; hint?; onSelect? }` and
`CommandGroup { id; label; items: CommandItem[] }`. They map to `Command` with `bindShortcut: false`. Prefer `Command`.

### `SearchTrigger`

Extends `ComponentProps<"button">`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `label?` | `string` | "Search…" | Field text; also the accessible name and tooltip in compact form. **Localise it.** |
| `variant?` | `"field" \| "icon"` | `"field"` | `"field"` is the sidebar box with `⌘K`; `"icon"` is a header icon button. It is always an icon on the collapsed rail. |
| `onClick?` | `MouseEventHandler` | none | Runs first; call `event.preventDefault()` to stop it opening the palette. |

Inside `AppShell` a click calls `setCommandOpen(true)`. It carries `aria-keyshortcuts="Meta+K Control+K"`.

## Examples

### Async results ("search" section)

```tsx
import { type CommandSource, useRegisterCommandSource } from "@fadymondy/nasaq/web";
import { FileText } from "lucide-react";
import { useMemo } from "react";

export function IssueSearch({ open }: { open: (key: string) => void }) {
  const source = useMemo<CommandSource>(
    () => ({
      id: "issues",
      minQuery: 2,
      debounce: 200,
      search: async (query, signal) => {
        const res = await fetch(`/api/issues?q=${encodeURIComponent(query)}`, { signal });
        const issues: { key: string; title: string }[] = await res.json();
        return issues.map((i) => ({ id: `issue.${i.key}`, label: i.title, hint: i.key, icon: FileText, perform: () => open(i.key) }));
      },
    }),
    [open],
  );
  useRegisterCommandSource(source);
  return null;
}
```

Results default to the `search` section ("Results" / "النتائج") and are not re-filtered by label, so match on the server.

### Nested page ("Change theme…")

```tsx
import { type Command, useNasaq, useRegisterCommands } from "@fadymondy/nasaq/web";
import { Monitor, Moon, Palette, Sun } from "lucide-react";
import { useMemo } from "react";

export function ThemeCommands() {
  const { setTheme } = useNasaq();
  const commands = useMemo<Command[]>(
    () => [
      {
        id: "app.system.theme",
        section: "system",
        label: "Change theme…",
        icon: Palette,
        keywords: ["dark", "light", "مظهر"],
        children: [
          { id: "app.theme.light", label: "Light", icon: Sun, perform: () => setTheme("light") },
          { id: "app.theme.dark", label: "Dark", icon: Moon, perform: () => setTheme("dark") },
          { id: "app.theme.system", label: "System", icon: Monitor, perform: () => setTheme("system") },
        ],
      },
    ],
    [setTheme],
  );
  useRegisterCommands(commands);
  return null;
}
```

### Without AppShell (controlled)

```tsx
import { Button, CommandPalette, CommandProvider } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function Standalone() {
  const [open, setOpen] = useState(false);
  return (
    <CommandProvider>
      <Button onClick={() => setOpen(true)}>Open palette</Button>
      <CommandPalette open={open} onOpenChange={setOpen} />
    </CommandProvider>
  );
}
```

### Arabic

```tsx
import { CommandPalette } from "@fadymondy/nasaq/web";

export const Ar = () => (
  <CommandPalette
    placeholder="ابحث أو نفّذ أمرًا…"
    emptyLabel="لا نتائج"
    sectionLabels={{ navigation: "انتقال سريع" }}
    labels={{ title: "لوحة الأوامر", navigate: "تنقّل", select: "فتح", back: "رجوع", close: "إغلاق" }}
  />
);
```

## Accessibility

| Key | Action |
| --- | --- |
| `⌘K` / `Ctrl+K` | Toggle the palette (when `hotkey`). Works from anywhere, including fields. |
| `↑` `↓` | Move the highlight (first result highlighted automatically). |
| `Enter` | Run the highlighted command, or open its nested page. |
| `Backspace` (empty input) | Back one nested page. |
| `Esc` | On a nested page, go back one level; at the root, close the palette. |
| `Tab` | Reaches page chips and the Esc button. |

- The dialog is named by `labels.title`. The input is described by the hint bar; the highlighted item follows Base UI Autocomplete semantics (listbox, `aria-activedescendant`).
- Group headings label the sections; on a nested page they are screen-reader-only.
- The spinner is decorative; "Searching…" is shown in the empty state while a search has no results yet.
- Disabled commands are dimmed and cannot run.
- **Localise:** `placeholder`, `emptyLabel`, `labels`, `sectionLabels` for custom sections, `SearchTrigger.label`, and every command's `label`, `hint` and `keywords`.

## RTL & i18n

- Layout uses logical properties; the chevron on nested commands and page chips is a `directional` icon and flips.
- Shortcut keys are always LTR (`dir="ltr"`), and bound on physical keys, so `G I` works on an Arabic layout.
- Search folds case, diacritics, tatweel and `أإآٱ → ا`, `ى → ي`, `ة → ه`, so "اداره" finds "إدارة". Add the other language's name to `keywords`.
- Built-in strings switch on the provider locale. Standard section headings are localised (see `DEFAULT_SECTION_LABELS`).
- Palette opens `pt-[12dvh]` and input text is 16px on coarse pointers to avoid iOS zoom.

## Styling & tokens

- Surface: `bg-popover`, `shadow-floating`, `rounded-floating`, `border-border`; backdrop `nq-fg`/`nq-bg` overlay.
- Highlight: `data-highlighted:bg-nq-selected`. Hint bar `bg-nq-surface-soft`.
- Target `[data-slot=command-palette]`, `[data-slot=search-trigger]`. Items are Base UI Autocomplete items (`data-highlighted`, `data-disabled`).
- There is no `className` prop on the palette; `SearchTrigger` accepts one.

## Do / Don't

- **Do** register commands from the product with stable ids, prefixed (`"mahaam.issue.new"`).
- **Do** give commands a `section` and put synonyms and other-language names in `keywords`.
- **Do** put rare or destructive commands behind `searchOnly`.
- **Don't** render two palettes with `hotkey` on; `⌘K` would toggle both.
- **Don't** put business logic in Nasaq: pass `perform`.
- **Don't** rely on a shortcut as the only way to reach a command; every command is also in the palette.

## Related

- [commands](../commands/README.md): the registry, `Command` type, sections, matching, shortcut binding
- [app-shell](../app-shell/README.md) · [product-switcher](../product-switcher/README.md) (registers "Switch to…") · [workspace-switcher](../workspace-switcher/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-keyboard-commands-command-palette--docs
