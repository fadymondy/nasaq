---
name: hotkey-recorder
title: HotkeyRecorder
category: keyboard
status: stable
summary: A control that records a keyboard shortcut from the keys the user presses, reads the physical key so it works on an Arabic layout, refuses shortcuts the browser or OS keeps, warns about clashes, and a settings list of bindings with reset.
exports: [HotkeyRecorder, HotkeyBindings, HotkeyRecorderBinding, HotkeyRecorderProps, HotkeyRecorderLabels, HotkeyBindingItem, HotkeyBindingsProps]
related: [keyboard-shortcuts, commands, kbd, account-settings]
story: components-keyboard-commands-hotkey-recorder
keywords: [hotkey, shortcut, record, keybinding, settings, conflict, sequence]
---

# HotkeyRecorder

Click the control, press the keys, done. The result is a string such as "Mod+Shift+K" (or a sequence "G I") that you
store and bind. Keys are read from `event.code`, so a person on an Arabic layout who presses the K key gets "K", not
the Arabic letter. Shortcuts the browser (Ctrl+W) or the OS (Alt+F4, Cmd+Q) keep are refused, and clashes with other
bindings are shown as you record. Escape cancels, Backspace clears.

## When to use

- A "Keyboard shortcuts" page in settings: `HotkeyBindings`.
- One customisable shortcut: `HotkeyRecorder`.

## When not to use

- Showing shortcuts read-only: [KeyboardShortcuts](../keyboard-shortcuts/README.md).

## Import

```tsx
import { HotkeyRecorder, HotkeyBindings, hotkeyMatches, hotkeyParse } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { HotkeyRecorder } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function Example() {
  const [value, setValue] = useState<string | null>("Mod+K");
  return <HotkeyRecorder value={value} onValueChange={setValue} requireModifier resetTo="Mod+K" label="Command palette" />;
}
```

To run a stored shortcut, use the pure helpers: `hotkeyMatches(hotkeyParse("Mod+K")![0], event, apple)`.

## Anatomy

```
HotkeyRecorder      data-slot="hotkey-recorder"  (data-recording)
├─ button           shows ShortcutKeys, or the prompt while recording
├─ clear / reset    icon buttons
├─ ul               error and clash messages (role="alert" for errors)
└─ span role="status"  polite announcements
HotkeyBindings      data-slot="hotkey-bindings": groups of rows, one recorder each, Reset all
```

## API

### HotkeyRecorder

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` / `defaultValue` | `string \| null` | `null` | The shortcut string. |
| `onValueChange` | `(value: string \| null) => void` | none | New shortcut, or `null` when cleared. |
| `sequence` | `boolean` | `false` | Allow "G I" sequences, confirmed with Enter. |
| `requireModifier` | `boolean` | `false` | Refuse a bare key that would fire while typing. |
| `bindings` / `bindingId` | `{ id, label, shortcut }[]` / `string` | none | Others, to warn about duplicates and shadowing. |
| `allowReserved` | `boolean` | `false` | Accept browser and OS shortcuts. |
| `resetTo` | `string \| null` | none | Shows Reset when the value differs. |
| `platform` | `"auto" \| "mac" \| "windows"` | `"auto"` | |
| `label` | `string` | none | Accessible name: what the shortcut does. |
| `labels` / `locale` | | | en and ar strings, overridable. |

### HotkeyBindings

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `bindings` | `HotkeyBindingItem[]` | required | `id`, `label`, `labelAr`, `group`, `shortcut`, `defaultShortcut`, `locked`. |
| `onChange` | `(id, shortcut) => void \| { error? } \| Promise<...>` | required | Store the change. Return `{ error }` to show a failure. |
| `sequence`, `requireModifier`, `platform`, `title`, `locale`, `labels` | | `requireModifier` true | |

### Logic (no React)

`hotkeyParse`, `hotkeyFormat`, `hotkeyFromEvent`, `hotkeyMatches`, `hotkeyRecordKey`, `hotkeyValidate`,
`hotkeyConflicts`, `hotkeyReservedBy`, `hotkeyKeys`, `hotkeyLabel`, `hotkeyTextMatches`, `HOTKEY_RESERVED`.

## Accessibility

| Key | Action |
| --- | --- |
| Enter, Space (idle) | Starts recording. |
| Any chord (recording) | Records it. Tab and shortcuts do not leave the control. |
| Escape | Cancels. |
| Backspace | Clears (or removes the last step of a sequence). |

- Blur stops recording. Results and errors are announced through a polite status region.
- Errors use `aria-invalid` and `aria-describedby`.

## RTL & i18n

Key caps are always left to right. Messages are en and ar. Recording uses the physical key, so layouts do not matter.

## Styling & tokens

Border, focus and danger tokens of the form controls. Extend with `className`.

## Do / Don't

- Do set `requireModifier` for app-wide shortcuts.
- Do store the string, not the caps.
- Do not allow reserved shortcuts unless the app runs as a desktop app.

## Related

- [KeyboardShortcuts](../keyboard-shortcuts/README.md)
- [Commands](../commands/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-keyboard-commands-hotkey-recorder--docs
