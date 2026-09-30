---
name: emoji-picker
title: EmojiPicker
category: pickers
status: beta
summary: Emoji picker in a popover, with search, categories, skin tones, RTL-aware keyboard navigation and lazily loaded emoji data.
exports: [EmojiPicker, EmojiPickerPanel, resolveEmojiLocale, EmojiPickerProps, EmojiPickerPanelProps, EmojiSelection, EmojiLocale, EmojiSkinTone]
related: [popover, mention-textarea, input-group, field]
story: components-pickers-emojipicker
base-ui: [popover]
keywords: [emoji, picker, reactions, smiley, skin tone, frimousse, emojibase]
---

# EmojiPicker

A styled emoji picker built on [`frimousse`](https://frimousse.liveblocks.io) (headless, virtualised) and the Nasaq
`Popover`. It gives you a search field, category headers, a grid and a skin tone button. Choosing an emoji calls
`onEmojiSelect` and closes the popover.

## Decision and bundle weight

The issue asked to evaluate the dependency first. `frimousse@0.4.0`: 27 KB minified (9.8 KB gzip), zero
dependencies, `sideEffects: false` (tree-shakable), peer `react ^18 || ^19`, TypeScript 5.1+. It does **not** bundle
emoji data: the dataset (Emojibase) is fetched from the jsDelivr CDN the first time a picker opens and cached in
the browser, so it adds nothing to your JS payload. Building our own picker would have needed the same lazy
dataset plus virtualisation and keyboard handling, so we adopted it.

Limit: Emojibase has no Arabic dataset. In an Arabic UI the picker chrome (search placeholder, empty and loading
text, skin tone label) is Arabic, but emoji names, category names and search keywords stay English. To use another
dataset, pass `resolveEmojiData` (a frimousse option).

## When to use

- Reactions, chat composers, comment boxes, status emoji.

## When not to use

- Inserting text or mentions: use [mention-textarea](../mention-textarea/README.md).
- A fixed handful of reactions: render buttons yourself.

## Import

```tsx
import { EmojiPicker, EmojiPickerPanel } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { EmojiPicker } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function Composer() {
  const [text, setText] = useState("");
  return (
    <div className="flex items-center gap-2">
      <input value={text} onChange={(e) => setText(e.target.value)} aria-label="Message" />
      <EmojiPicker onEmojiSelect={({ emoji }) => setText((t) => t + emoji)} />
    </div>
  );
}
```

## Anatomy

```
EmojiPicker                         Popover + trigger
  PopoverContent
    EmojiPickerPanel                data-slot="emoji-picker"
      search                        data-slot="emoji-picker-search"
      skin tone button              data-slot="emoji-picker-skin-tone"
      viewport                      data-slot="emoji-picker-viewport"
        category header             data-slot="emoji-picker-category"
        row                         data-slot="emoji-picker-row"
          emoji                     data-slot="emoji-picker-emoji" (data-active on the highlighted one)
```

## API

### EmojiPicker

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `onEmojiSelect` | `(emoji: { emoji: string; label: string }) => void` | | Called with the chosen emoji. |
| `trigger` | `ReactElement` | icon `Button` with a smile | The element that opens the picker. Give it an accessible name. |
| `closeOnSelect` | `boolean` | `true` | Close after choosing. |
| `open` / `onOpenChange` | `boolean` / `(open: boolean) => void` | uncontrolled | Controlled open state. |
| `side` / `align` | Popover placement | `"bottom"` / `"start"` | Logical, mirrors in RTL. |
| `locale` | `Locale` | Nasaq locale, else `"en"` | Emoji-data locale. |
| `skinTone` | `"none" \| "light" \| "medium-light" \| "medium" \| "medium-dark" \| "dark"` | `"none"` | Initial skin tone. |
| `columns` | `number` | `8` | Emoji per row. Match it with a `className` width. |
| `labels` | `Partial<{ search; loading; empty(query); skinTone }>` | built-in en/ar | Override strings. |
| `className` | `string` | | Classes for the panel, for example `w-[22rem]`. |

The other frimousse root props (`emojiVersion`, `emojibaseUrl`, `resolveEmojiData`, `sticky`) pass through.

### EmojiPickerPanel

The same props without the popover ones (`trigger`, `open`, `closeOnSelect`, `side`, `align`). Use it inline or
inside your own `Popover`.

### resolveEmojiLocale(locale: string): Locale

Maps a UI locale to an available Emojibase locale (`"ar"` gives `"en"`, `"fr-CA"` gives `"fr"`).

## Examples

Arabic composer:

```tsx
import { EmojiPicker, Field, FieldLabel, Input } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function ArabicComposer() {
  const [text, setText] = useState("");
  return (
    <div lang="ar" dir="rtl" className="flex items-end gap-2">
      <Field className="flex-1">
        <FieldLabel>الرسالة</FieldLabel>
        <Input value={text} onChange={(e) => setText(e.target.value)} />
      </Field>
      <EmojiPicker onEmojiSelect={({ emoji }) => setText((t) => t + emoji)} />
    </div>
  );
}
```

Custom trigger and fixed skin tone:

```tsx
import { Button, EmojiPicker } from "@fadymondy/nasaq/web";

export function React() {
  return (
    <EmojiPicker skinTone="medium" trigger={<Button>React</Button>} onEmojiSelect={({ emoji }) => console.log(emoji)} />
  );
}
```

## Accessibility

| Key | Action |
| --- | --- |
| Type | Filter emoji in the search field. |
| Arrow keys | Move the highlighted emoji. In RTL, ArrowLeft moves toward the visual left, which is the next emoji. |
| Enter | Choose the highlighted emoji. |
| Escape | Close the popover. |

The trigger, search field and skin tone button carry `aria-label`s (localised en/ar; override with `labels`). Give a
custom `trigger` its own accessible name.

## RTL & i18n

- Category headers, search and layout use logical classes and follow `dir`.
- frimousse's horizontal arrows are physical ("left = previous"); the panel swaps them when its computed direction is RTL.
- Chrome strings come from the Nasaq locale (en, ar). Emoji data follows `resolveEmojiLocale`; Arabic falls back to English data (see the limit above).

## Styling & tokens

Uses `bg-popover`, `border-border`, `bg-card`, `text-muted-foreground`, `bg-nq-hover`, `outline-nq-focus`. Target
`data-slot` values from the Anatomy tree; the highlighted emoji has `data-active`. Extend with `className`.

## Do / Don't

- Do pass `onEmojiSelect` and insert at the caret in real inputs.
- Do use `locale` for non-Arabic locales to get translated names.
- Don't fetch emoji data yourself unless you supply `resolveEmojiData`.
- Don't rely on emoji alone to convey meaning; pair with text.

## Related

- [popover](../popover/README.md)
- [mention-textarea](../mention-textarea/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-pickers-emojipicker--docs
