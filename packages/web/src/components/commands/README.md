---
name: commands
title: CommandProvider
category: utilities
status: stable
summary: The command registry behind the palette - components register commands and async sources while mounted; Nasaq ranks, renders and binds shortcuts.
exports: [CommandProvider, CommandRegistry, useCommandRegistry, useRegisteredCommands, useRegisterCommands, useRegisterCommandSource, useCommandPaletteOpen, parseShortcut, RegistrySnapshot, Command, CommandSource, CommandSection, COMMAND_SECTIONS, DEFAULT_SECTION_LABELS, normalizeForSearch, scoreCommand, sectionOrder]
related: [command-palette, app-shell, product-switcher]
story: components-utilities-commands
base-ui: []
keywords: [commands, registry, shortcuts, hotkeys, palette, actions, search, provider, plugin]
---

# CommandProvider

The registry that lets a product add commands to the [`CommandPalette`](../command-palette/README.md)
without Nasaq holding any business logic. Any mounted component calls `useRegisterCommands([...])`
with plain data and a `perform` callback; the commands exist while it is mounted and disappear when it
unmounts, so a page can contribute "This page" actions and the palette stays accurate. Async sources
(`useRegisterCommandSource`) add records as the user types. The registry also **binds keyboard shortcuts**
(`C`, `G I`) globally.

`AppShell` already renders a `CommandProvider`. Use it directly only for apps without the shell.
It has no story of its own; it is demonstrated by the Command Palette story.

## When to use

- Adding navigation, create, contextual, AI or system actions to the palette.
- Binding single-key or sequence shortcuts (`C`, `G I`) to actions.
- Searching your own data (issues, people, docs) from the palette.
- Building your own command UI on `useRegisteredCommands`.

## When not to use

- Modifier shortcuts (`⌘S`): the binder ignores `Meta`/`Ctrl`/`Alt` chords; own them with your own key handler and set `bindShortcut: false`.
- A menu of item actions in the UI (context or dropdown menus): use `DropdownMenu`.
- Rendering the palette: use [`CommandPalette`](../command-palette/README.md).

## Import

```tsx
import {
  CommandProvider, useRegisterCommands, useRegisterCommandSource, useRegisteredCommands,
  COMMAND_SECTIONS, DEFAULT_SECTION_LABELS, normalizeForSearch, scoreCommand,
  type Command, type CommandSource, type CommandSection,
} from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { type Command, useRegisterCommands } from "@fadymondy/nasaq/web";
import { FilePlus2 } from "lucide-react";
import { useMemo } from "react";

export function IssuesPage({ createIssue }: { createIssue: () => void }) {
  const commands = useMemo<Command[]>(
    () => [
      {
        id: "mahaam.issue.new",
        section: "create",
        label: "New issue",
        icon: FilePlus2,
        shortcut: "C",
        keywords: ["add", "مهمة"],
        perform: createIssue,
      },
    ],
    [createIssue],
  );
  useRegisterCommands(commands);
  return <h1>Issues</h1>;
}
```

Inside an `AppShell` with a `<CommandPalette />`, "New issue" now appears under "Create", and pressing `C`
(outside text fields) runs it.

Always pass a stable (memoised) array: the effect depends on array identity.

## Anatomy

```
CommandProvider (or AppShell)
├─ CommandRegistry              one instance; a nested provider reuses the outer one
├─ ShortcutBinder               window keydown listener for registered shortcuts
└─ your tree
   ├─ useRegisterCommands(...)          → registry.setCommands(ownerId, commands)
   ├─ useRegisterCommandSource(...)     → registry.setSource(ownerId, source)
   └─ CommandPalette                    → useRegisteredCommands()
```

## API

### `Command`

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` | Unique across the registry. Prefix with your product, e.g. `"mahaam.issue.new"`. |
| `label` | `string` | Text shown and matched. Already localised. |
| `section?` | `CommandSection \| (string & {})` | Standard section or your own id. Default (in the palette) `"context"`. |
| `sectionLabel?` | `string` | Heading for a custom section id (ignored for standard sections). |
| `sectionOrder?` | `number` | Position of a custom section; standard sections are 0-6. Default `4.5` (after "products"). |
| `icon?` | `LucideIcon \| ReactElement` | A Lucide icon component, or an element such as a `ProductMark`. |
| `keywords?` | `string[]` | Extra words that match: synonyms, the other language's name, ids. |
| `shortcut?` | `string` | Key sequence, space-separated: `"C"`, `"G I"`, `"Shift A"`. Shown as keycaps in the palette and, unless `bindShortcut` is `false`, bound globally. |
| `bindShortcut?` | `boolean` | `false` shows the shortcut but does not bind it (use when something else handles it, e.g. `"⌘ B"`). |
| `hint?` | `ReactNode` | Muted text at the inline end, e.g. `"Project"`. |
| `priority?` | `number` | Higher sorts first within its section (default 0). Applies to matches of equal score. |
| `disabled?` | `boolean` | Shown dimmed; cannot run, and its shortcut is not bound. |
| `searchOnly?` | `boolean` | Listed only once the user types (rare or destructive commands). |
| `perform?` | `() => void` | Runs on selection, or on the shortcut. Bound shortcuts require it. |
| `children?` | `Command[] \| (() => Command[])` | Opens a nested page instead of running. The function form is evaluated when the page opens. |
| `keepOpen?` | `boolean` | Keeps the palette open after `perform`. |

### `CommandSource`

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` | Source id. |
| `search` | `(query: string, signal: AbortSignal) => Promise<Command[]> \| Command[]` | Called with the trimmed query. Abort your request on `signal`. Failures are ignored. |
| `minQuery?` | `number` | Minimum trimmed query length. Default `1`. |
| `debounce?` | `number` | ms. Default `150`. The longest debounce among active sources is used. |

Results without a `section` land in `"search"`. Sources run only on the root page.

### `CommandProvider`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `children` | `ReactNode` | required | |
| `registry?` | `CommandRegistry` | new instance | Bring your own registry. Ignored when an outer provider exists: nested providers reuse the outer registry so every command lands in one palette. |

### `CommandRegistry` (class)

| Member | Signature | Description |
| --- | --- | --- |
| `subscribe` | `(listener: () => void) => () => void` | External-store subscription. |
| `getSnapshot` | `() => RegistrySnapshot` | `{ commands, sources, paletteOpen }`: current flattened lists and the shared palette state. |
| `setPaletteOpen` | `(open: boolean) => void` | Opens or closes the one palette (bound arrow; safe to pass around). |
| `setCommands` | `(owner: string, commands: Command[] \| null) => void` | Set or clear one owner's commands. |
| `setSource` | `(owner: string, source: CommandSource \| null) => void` | Set or clear one owner's source. |

### Hooks

| Hook | Signature | Description |
| --- | --- | --- |
| `useRegisterCommands` | `(commands: Command[] \| null \| undefined) => void` | Registers while the component is mounted; clears on unmount. `null` clears. |
| `useRegisterCommandSource` | `(source: CommandSource \| null \| undefined) => void` | Same, for an async source. Memoise the object. |
| `useRegisteredCommands` | `() => { commands: Command[]; sources: CommandSource[] }` | Everything registered now; re-renders on change. Empty outside a provider. |
| `useCommandRegistry` | `() => CommandRegistry \| null` | The registry, or `null` outside a provider (register hooks then do nothing). |
| `useCommandPaletteOpen` | `() => [boolean, (open: boolean) => void]` | The shared palette open state. `SearchTrigger` and `CommandPalette` use it, with or without AppShell. |

### Constants and helpers

| Export | Description |
| --- | --- |
| `COMMAND_SECTIONS` | `["context", "search", "create", "navigation", "products", "ai", "system"]`, in display order. |
| `CommandSection` | Union type of the above. |
| `DEFAULT_SECTION_LABELS` | `Record<CommandSection, { en; ar }>`: "This page/هذه الصفحة", "Results/النتائج", "Create/إنشاء", "Go to/انتقال", "Switch product/تبديل المنتج", "Ask AI/الذكاء الاصطناعي", "System/النظام". |
| `normalizeForSearch(text)` | `(text: string) => string`. Lower-cases, NFKD-normalises, strips diacritics and tatweel, folds `أإآٱ → ا`, `ى → ي`, `ة → ه`, trims. |
| `scoreCommand(command, query)` | `(command: Command, query: string) => number`. `0` no match; label prefix `4`; word prefix `3`; substring `2`; keyword prefix `1.5`; keyword substring `1`; empty query `1`. Pass a query already run through `normalizeForSearch`. |
| `parseShortcut(shortcut)` | `(shortcut: string) => string[]`. Steps as canonical chords: `"Mod Shift P"` → `["meta+shift+p"]` on Apple, `["ctrl+shift+p"]` elsewhere; `"G I"` → `["g", "i"]`. |
| `RegistrySnapshot` | Type: `{ commands: Command[]; sources: CommandSource[]; paletteOpen: boolean }`. |
| `sectionOrder(command)` | `(command: Command) => number`. Index in `COMMAND_SECTIONS`, else `command.sectionOrder ?? 4.5`. |

### Ranking

Sections in `sectionOrder`, then match score, then `priority`, then registration order. With no query, `searchOnly` commands are hidden.

### Shortcut binding

- Single keys (`"C"`), sequences (`"G I"`, each key within 900ms of the last), `"Shift A"` (Shift held), and modified chords: `"Mod K"`, `"⌘ Shift P"`, `"Alt N"` (`Mod`/`⌘` is ⌘ on Apple, Ctrl elsewhere; `<html data-platform>` decides when set, otherwise the browser's platform). Shift only counts for letters and digits; `"?"` already implies it.
- The longest registered sequence wins: with `"G C"` and `"C"` both bound, G then C runs only `"G C"`. A pending prefix that is also bound on its own runs when the sequence is not continued in time.
- Matched on physical keys (`KeyC` → `c`, `Digit1` → `1`), so shortcuts work on Arabic layouts. Other keys match on `event.key` lower-cased (e.g. `arrowdown`, `escape`).
- Plain keys are ignored while typing in an input, textarea, select or contenteditable, inside a dialog combobox, when the event is already `defaultPrevented`, and while a dialog or menu is open. Chords with Mod/Ctrl/Alt fire anywhere.
- A hit (or a pending prefix) calls `preventDefault()`; a hit calls `perform()`.

## Examples

### Page-scoped commands that come and go

```tsx
import { type Command, useRegisterCommands } from "@fadymondy/nasaq/web";
import { Archive } from "lucide-react";
import { useMemo } from "react";

export function ProjectPage({ archive, name }: { archive: () => void; name: string }) {
  const commands = useMemo<Command[]>(
    () => [
      {
        id: "mahaam.project.archive",
        section: "context",
        label: `Archive ${name}`,
        icon: Archive,
        hint: "Project",
        searchOnly: true,
        perform: archive,
      },
    ],
    [archive, name],
  );
  useRegisterCommands(commands);
  return null;
}
```

### Custom section and a shortcut owned elsewhere

```tsx
import { type Command, useRegisterCommands } from "@fadymondy/nasaq/web";
import { PanelLeft, Rocket } from "lucide-react";
import { useMemo } from "react";

export function Extra({ toggleSidebar }: { toggleSidebar: () => void }) {
  const commands = useMemo<Command[]>(
    () => [
      { id: "app.deploy", section: "deploy", sectionLabel: "Deploy", sectionOrder: 5, label: "Deploy to staging", icon: Rocket, perform: () => {} },
      { id: "app.sidebar", section: "system", label: "Toggle sidebar", icon: PanelLeft, shortcut: "⌘ B", bindShortcut: false, perform: toggleSidebar },
    ],
    [toggleSidebar],
  );
  useRegisterCommands(commands);
  return null;
}
```

### Provider for an app without AppShell, Arabic labels

```tsx
import { type Command, CommandPalette, CommandProvider, useRegisterCommands } from "@fadymondy/nasaq/web";
import { Home } from "lucide-react";
import { useMemo, useState } from "react";

function Registrar() {
  const commands = useMemo<Command[]>(
    () => [{ id: "app.home", section: "navigation", label: "الرئيسية", keywords: ["home"], icon: Home, shortcut: "G H", perform: () => location.assign("/") }],
    [],
  );
  useRegisterCommands(commands);
  return null;
}

export function App() {
  const [open, setOpen] = useState(false);
  return (
    <CommandProvider>
      <Registrar />
      <CommandPalette open={open} onOpenChange={setOpen} />
    </CommandProvider>
  );
}
```

### Use the matcher in your own list

```tsx
import { type Command, normalizeForSearch, scoreCommand } from "@fadymondy/nasaq/web";

export function filterCommands(all: Command[], raw: string) {
  const query = normalizeForSearch(raw);
  return all.filter((c) => scoreCommand(c, query) > 0).sort((a, b) => scoreCommand(b, query) - scoreCommand(a, query));
}
```

## Accessibility

Shortcuts are the keyboard route to commands; the palette is the discoverable route.

| Key | Action |
| --- | --- |
| Registered single key or sequence (e.g. `C`, `G I`) | Runs the command, outside text fields and open dialogs/menus. |
| `⌘K` / `Ctrl+K` | Opens the palette (owned by `CommandPalette`). |

- Shortcuts never fire while the user types, so they cannot corrupt input.
- Always give commands a visible `label`; icons are decorative.
- Every command with a shortcut should also be reachable from the palette (it is, automatically).
- **Localise:** every `label`, `hint`, `sectionLabel` and `keywords`.

## RTL & i18n

- Shortcuts use physical keys, so they are layout-independent (Arabic, AZERTY…).
- Include both languages' names in `keywords`; `normalizeForSearch` folds Arabic variants.
- Standard section labels are built in for `en` and `ar` (`DEFAULT_SECTION_LABELS`). Custom sections need `sectionLabel`.

## Styling & tokens

None: the registry renders nothing. Presentation belongs to [`CommandPalette`](../command-palette/README.md).

## Do / Don't

- **Do** memoise the arrays and sources you register (`useMemo`), and keep ids unique and prefixed.
- **Do** let the owning component register its commands, so they vanish with it.
- **Do** use `searchOnly` for destructive or rare commands.
- **Don't** put business logic in Nasaq: the product owns `perform`.
- **Don't** register the same `id` twice; duplicates are not detected and both would render.
- **Don't** bind `⌘`/`Ctrl` chords through `shortcut`; set `bindShortcut: false` and handle the key yourself.
- **Don't** nest a `CommandProvider` expecting a separate registry; it reuses the outer one.

## Related

- [command-palette](../command-palette/README.md): the UI that reads the registry
- [app-shell](../app-shell/README.md): includes a `CommandProvider`
- [product-switcher](../product-switcher/README.md): registers "Switch to…" commands through this registry

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-utilities-commands--docs
