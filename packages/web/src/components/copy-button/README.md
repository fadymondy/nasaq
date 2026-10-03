---
name: copy-button
title: CopyButton
category: actions
status: stable
summary: Icon button that copies text to the clipboard and shows a check for 1.5 seconds, with a screen-reader announcement and a fallback; CopyField pairs it with a read-only, always left-to-right input for keys and URLs.
exports: [CopyButton, CopyField, copyText, CopyButtonProps, CopyFieldProps]
related: [button, input-group, field, toast]
story: components-actions-copy-button
base-ui: [button]
keywords: [copy, clipboard, api key, url, share, snippet]
---

# CopyButton

A small button that puts a string on the clipboard and confirms it. The icon turns into a check for about
1.5 seconds and a polite live region announces the result, so the confirmation is not visual only.
`CopyField` wraps it with a read-only input for values people copy: API keys, invite links, URLs.

## When to use

- A value the user will paste elsewhere: a key, a link, a command.
- `CopyField` when the value should be visible and selectable next to its label.

## When not to use

- Sharing to other apps: use the Web Share API from a normal [`Button`](../button/README.md).
- Long confirmations or undo: fire a [toast](../toast/README.md) from `onCopy`.

## Import

```tsx
import { CopyButton, CopyField } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { CopyButton, CopyField, Field, FieldLabel } from "@fadymondy/nasaq/web";

export function Example() {
  return (
    <>
      <CopyButton value="npm i @fadymondy/nasaq" />
      <Field>
        <FieldLabel>API key</FieldLabel>
        <CopyField value="nq_live_4f9c2b7a1d8e" label="API key" />
      </Field>
    </>
  );
}
```

## Anatomy

```
CopyButton                      data-slot="copy-button"  (data-copied)
└─ span role="status"           data-slot="copy-button-status"  (sr-only)

CopyField                       data-slot="copy-field"  (an InputGroup)
├─ InputGroupInput              readOnly, dir="ltr"
└─ InputGroupAddon (end)
   └─ CopyButton
```

## API

### CopyButton

Also accepts every `Button` prop except `onClick`, `onCopy`, `value` and `children`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `string \| (() => string)` | required | Text to copy, or a function called at click time. |
| `label` | `string` | "Copy" / "نسخ" | Accessible name when icon-only. |
| `copiedLabel` | `string` | "Copied to clipboard" / "تم النسخ إلى الحافظة" | Announced after a copy. |
| `failedLabel` | `string` | "Could not copy" / "تعذر النسخ" | Announced when copying fails. |
| `resetAfter` | `number` | `1500` | Milliseconds the check stays. |
| `onCopy` | `(text: string) => void` | none | After a successful copy. |
| `onCopyError` | `() => void` | none | When both the Clipboard API and the fallback fail. |
| `children` | `ReactNode` | none | Visible text. Omit for an icon-only button. |
| `variant` | `ButtonProps["variant"]` | `"ghost"` | |
| `size` | `ButtonProps["size"]` | `"icon-sm"` icon-only, else `"sm"` | |

### CopyField

Also accepts `InputGroup` props (except `onCopy`).

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `string` | required | Shown and copied. |
| `label` | `string` | none | `aria-label` of the input. Skip it when a `FieldLabel` names the input. |
| `copyLabel` | `string` | "Copy" / "نسخ" | The button's accessible name. |
| `copiedLabel` | `string` | localised | Announcement text. |
| `onCopy` | `(text: string) => void` | none | |
| `inputProps` | input props | none | Extra props for the input, for example `id`. |

### copyText

`copyText(text: string): Promise<boolean>`: the Clipboard API, then a hidden-textarea `execCommand("copy")` fallback. Resolves `false` when both fail.

## Examples

Visible label and a toast:

```tsx
import { CopyButton } from "@fadymondy/nasaq/web";

export function InviteLink({ url }: { url: string }) {
  return (
    <CopyButton value={url} variant="secondary" onCopy={() => console.log("copied")}>
      Copy link
    </CopyButton>
  );
}
```

Arabic:

```tsx
import { CopyField } from "@fadymondy/nasaq/web";

export function ArabicKey() {
  return <CopyField value="nq_live_4f9c2b7a1d8e" label="مفتاح API" copiedLabel="تم نسخ المفتاح" />;
}
```

## Accessibility

| Key | Action |
| --- | --- |
| Enter, Space | Copies. |
| Focus in CopyField | Selects the whole value. |

- Icon-only buttons are named by `label`.
- The result is spoken through `role="status"` (polite). The button label does not change.
- Localise `label`, `copiedLabel` and `failedLabel` when you pass your own; defaults follow the Nasaq locale.

## RTL & i18n

- `CopyField` forces `dir="ltr"` and `text-start` on the value: keys and URLs must not reorder in Arabic.
- The button sits at the inline end, so it appears on the left in RTL.

## Styling & tokens

Uses Button tokens and `text-nq-success-text` while `[data-copied]`. Extend with `className`.

## Do / Don't

- Do put the copy button next to the value it copies.
- Do not copy secrets you have not shown; the user should see what they copied.
- Do not rely on the icon change alone to confirm; keep the live region.

## Related

- [Button](../button/README.md)
- [InputGroup](../input-group/README.md)
- [Field](../field/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-actions-copy-button--docs
