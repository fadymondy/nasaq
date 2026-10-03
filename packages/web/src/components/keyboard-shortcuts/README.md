---
name: keyboard-shortcuts
title: KeyboardShortcuts
category: keyboard
status: stable
summary: A searchable reference of an app's keyboard shortcuts, grouped, drawn for the reader's keyboard (Command on a Mac, Ctrl elsewhere) with a Mac/Windows switch, plus a dialog that opens with the question mark key.
exports: [ShortcutsReference, ShortcutsDialog, ShortcutKeys, useShortcutApple, shortcutItemKeys, ShortcutPlatform, ShortcutItem, ShortcutGroup, KeyboardShortcutsLabels, ShortcutKeysProps, ShortcutsReferenceProps, ShortcutsDialogProps]
related: [commands, kbd, hotkey-recorder, dialog]
story: components-keyboard-commands-keyboard-shortcuts
keywords: [shortcuts, hotkeys, keyboard, cheat sheet, kbd, mac, windows, help]
---

# KeyboardShortcuts

The help sheet people open to learn the keys. Shortcuts are written once as strings ("Mod+K", "G I") and drawn per
platform: `Mod` becomes Command on a Mac and Ctrl elsewhere. A switch lets someone on Windows read the Mac keys for a
teammate, and back. Search folds Arabic letter variants, so searching for an unhamzed word finds it.

## When to use

- A help dialog or a "Keyboard shortcuts" page in account settings.
- Anywhere one shortcut should be drawn as key caps: `ShortcutKeys`.

## When not to use

- Letting people change a shortcut: use [HotkeyRecorder](../hotkey-recorder/README.md).
- Running commands from a palette: [Commands](../commands/README.md).

## Import

```tsx
import { ShortcutsDialog, ShortcutsReference, ShortcutKeys } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { ShortcutsDialog, type ShortcutGroup } from "@fadymondy/nasaq/web";

const groups: ShortcutGroup[] = [
  { id: "nav", title: "Navigation", titleAr: "التنقل", items: [
    { id: "palette", label: "Open the command palette", labelAr: "فتح لوحة الأوامر", keys: "Mod+K" },
    { id: "inbox", label: "Go to inbox", labelAr: "الانتقال إلى الوارد", keys: "G I" },
  ] },
];

export function Help() {
  return <ShortcutsDialog groups={groups} />; // press ? anywhere
}
```

## Anatomy

```
ShortcutsReference        data-slot="shortcuts-reference"
├─ header: title, description, platform switch, search
└─ section per group      <h3> + <ul>
   └─ li                  label, description, ShortcutKeys per alternative
ShortcutsDialog           a Dialog around ShortcutsReference
ShortcutKeys              data-slot="shortcut-keys"  role="img" with a spoken name
```

## API

### ShortcutsReference

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `groups` | `ShortcutGroup[]` | required | Sections. Each item has `keys` (string or alternatives), optional `apple` keys, and `labelAr`/`descriptionAr`. |
| `platform` | `"auto" \| "mac" \| "windows"` | `"auto"` | Which keyboard to draw. |
| `onPlatformChange` | `(p) => void` | none | Called by the switch. |
| `showPlatformSwitch` | `boolean` | `true` | |
| `searchable` | `boolean` | `true` | |
| `title` / `description` | `ReactNode` | localised | Pass `title={null}` to hide. |
| `locale` | `string` | ambient | |
| `labels` | `KeyboardShortcutsLabels` | none | Override any string. |

### ShortcutsDialog

Everything above plus `open`, `defaultOpen`, `onOpenChange`, and `hotkey` (default `"?"`, `null` turns it off).
The hotkey is ignored while a text field, select or editable region has focus.

### ShortcutKeys

`shortcut` (string), `platform`, `thenLabel`, `className`. `useShortcutApple(platform)` tells you if keys are drawn for a Mac.

## Accessibility

- Each shortcut is one `role="img"` with a spoken label ("Command Shift K"), not a run of separate caps.
- The dialog traps focus and closes with Escape. The switch is a toggle group with a visible label.

## RTL & i18n

- Key caps are always left to right, also in Arabic. Text around them follows the page direction.
- Strings: en and ar through the Nasaq locale, overridable with `labels`. Items carry their own `labelAr`.

## Styling & tokens

Uses `Kbd`, Dialog and muted text tokens. Extend with `className`.

## Do / Don't

- Do write `Mod+K`, not "Ctrl+K", so the Mac sees Command.
- Do give `apple` keys only when they differ by more than Cmd for Ctrl.
- Do not list shortcuts the app does not really bind.

## Related

- [HotkeyRecorder](../hotkey-recorder/README.md)
- [Commands](../commands/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-keyboard-commands-keyboard-shortcuts--docs
