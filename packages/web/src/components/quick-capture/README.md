---
name: quick-capture
title: QuickCapture
category: productivity
status: beta
summary: A capture window opened by a global shortcut to jot a note or clip a page, with tags, a destination and save with Ctrl or Cmd plus Enter.
exports: [QuickCaptureLabels, QuickCaptureDestination, QuickCapturePage, QuickCaptureProps, QuickCapture]
related: [dialog, command-palette, notes, chrome-extension-install]
story: components-productivity-quick-capture
base-ui: [dialog]
keywords: [quick capture, clipper, web clipper, inbox, shortcut, global hotkey, note, jot]
---

# QuickCapture

Get a thought or a page into the inbox in seconds. A keyboard shortcut opens a small dialog with a focused text box; Ctrl or Cmd plus Enter saves and Escape closes. Pass a `page` and it becomes the web-clipper popup, showing the page and saving it with your note. Pass `presentation="panel"` to render only the form, for a floating window, side panel or extension popup.

## When to use

- A notes or task app where capturing must be faster than opening the app and finding the right place.
- A browser extension popup that saves the current page.
- A desktop app's floating capture window (render the panel in it).

## When not to use

- Writing a full document: use the editor ([rich-text-editor](../rich-text-editor/README.md)).
- A general command list: use [command-palette](../command-palette/README.md).
- A form with many fields: use [dialog](../dialog/README.md) with a form.

## Import

```tsx
import { QuickCapture } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { QuickCapture } from "@fadymondy/nasaq/web";

export function Capture() {
  return (
    <QuickCapture
      shortcut="Mod+Shift+K"
      suggestedTags={["idea", "todo"]}
      onCapture={async (capture) => {
        await api.inbox.add(capture);
      }}
    />
  );
}
```

Press Ctrl+Shift+K (Cmd+Shift+K on a Mac) anywhere in the page to open it.

## Anatomy

```
QuickCapture              data-slot="quick-capture"  data-presentation="dialog" | "panel"
├─ header                 title and description
├─ page card              data-slot="quick-capture-page"  (when `page` is set)
├─ text box               autofocused, dir="auto"
├─ tags                   #tags found in the text, suggested tag toggles
├─ destinations           radio group (when there are two or more)
├─ status                 "Saved to Inbox" (panel) 
└─ footer                 key hints, Cancel, Save
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `onCapture` | `(capture: CaptureValue) => void \| { error?: string } \| Promise<...>` | required | Save the capture. Return `{ error }` or throw to keep the text. The dialog closes, or the panel clears, only after it resolves. |
| `open`, `defaultOpen`, `onOpenChange` | `boolean`, `boolean`, `(boolean) => void` | uncontrolled, closed | Dialog state. The shortcut toggles it. |
| `presentation` | `"dialog" \| "panel"` | `"dialog"` | A dialog over the page, or the bare form. The panel has no shortcut. |
| `shortcut` | `string \| null` | `"Mod+Shift+K"` | Global toggle. `Mod` is Cmd on Apple and Ctrl elsewhere. A modifier is required. `null` turns it off. |
| `shortcutEnabled` | `boolean` | `true` | Turn the shortcut off without unmounting. |
| `page` | `{ title?, url, selection? }` | none | The page being clipped. The capture becomes a `clip`. |
| `destinations`, `defaultDestinationId` | `{ id, label, icon? }[]`, `string` | none | Where captures go. A picker appears for two or more. |
| `suggestedTags` | `string[]` | none | Tags shown as toggles. |
| `initialText`, `placeholder` | `string` | `""` | Starting text and placeholder. |
| `showHints` | `boolean` | `true` | The key hints in the footer. |
| `labels` | `QuickCaptureLabels` | English or Arabic | String overrides. |

`CaptureValue` is `{ kind: "note" \| "link" \| "clip", text, title, url?, pageTitle?, selection?, tags, destinationId?, capturedAt }`. Tags come from the toggles and from `#tags` typed in the text (Latin or Arabic).

### Helpers

`parseCaptureShortcut`, `matchesCaptureShortcut`, `captureShortcutKeys`, `isCaptureSaveKey`, `buildCapture`, `canSaveCapture`, `extractCaptureTags`, `extractCaptureUrl`. All are pure.

## Examples

Web clipper popup:

```tsx
<QuickCapture
  presentation="panel"
  page={{ title: document.title, url: location.href, selection: String(getSelection()) }}
  destinations={[{ id: "inbox", label: "Inbox" }, { id: "read", label: "Read later" }]}
  onCapture={save}
  onOpenChange={(open) => !open && window.close()}
/>
```

Controlled, with another trigger:

```tsx
const [open, setOpen] = useState(false);
<QuickCapture open={open} onOpenChange={setOpen} shortcut={null} onCapture={save} />;
```

Arabic copy:

```tsx
<QuickCapture onCapture={save} labels={{ title: "التقاط سريع", placeholder: "ما الذي يدور في ذهنك؟" }} />
```

## Accessibility

| Key | Action |
| --- | --- |
| Shortcut (default Ctrl or Cmd + Shift + K) | Open or close the dialog from anywhere. |
| Ctrl or Cmd + Enter | Save. |
| Escape | Close the dialog, or call `onOpenChange(false)` in the panel. |
| Tab | Move between the text, tags, destinations and buttons. |

- The dialog is a modal with a title and description; focus starts in the text box and returns to where it was on close.
- Errors are `role="alert"` and tied to the text box; the saved message in the panel is a polite status.
- The shortcut matches the physical key (`event.code`), so it works on Arabic keyboards. Choose one that does not clash with the browser.

## RTL & i18n

- The text box uses `dir="auto"`. URLs and page addresses are shown left-to-right.
- Tags accept Arabic letters (`#عمل`). Key hints stay left-to-right.
- The dialog and footer mirror with the page direction.

## Styling & tokens

Uses the dialog, control and `--nq-*` selected and focus tokens. Target `data-slot="quick-capture"` and `data-presentation`. Pass `className` to change the width.

## Do / Don't

- Do keep the shortcut listener tied to the mounted component. It is removed on unmount, so it never leaks between pages.
- Do keep the text when saving fails so nothing typed is lost.
- Don't take a bare letter as the shortcut. A modifier is required.
- Don't ask for a title or a folder before saving. Sort later.

## Related

- [dialog](../dialog/README.md), [command-palette](../command-palette/README.md), [notes](../notes/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-productivity-quick-capture--docs
