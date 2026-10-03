---
name: icon
title: Icon
category: utilities
status: stable
summary: lucide icon wrapper that mirrors direction-bearing glyphs in RTL, plus the bidi helpers Ltr, Bdi, BidiText and isolate.
exports: [Icon, IconProps, DIRECTIONAL_ICONS, Ltr, Bdi, BidiText, isolate]
related: [text, numeric, field, product-mark]
story: foundations-icons-bidi
base-ui: []
keywords: [icon, lucide, rtl, mirror, directional, bidi, ltr, bdi, arabic, isolation]
---

# Icon

Wraps a lucide icon so it behaves correctly in right-to-left layouts. Glyphs whose meaning follows
reading direction (arrows, chevrons, undo/redo, send, panels) mirror in RTL. Everything else
(search, clock, check, play, brand marks, digits) stays put. The mirroring is CSS (`rtl:` variant), so it
follows the nearest `dir` with no JavaScript.

The same module holds the bidi helpers for mixing LTR content into Arabic text: `Ltr`, `Bdi`, `BidiText`
for markup and `isolate` for plain strings.

## When to use

- Every lucide icon in Nasaq UI, so directional ones flip in RTL and all are hidden from assistive tech.
- `Ltr` for codes, emails, URLs and invoice numbers inside Arabic sentences.
- `Bdi` for user-supplied names or titles of unknown direction.
- `BidiText` for a block of user text that should choose its direction from its first strong character.
- `isolate` where only a string is accepted: tooltip `content`, toast text, `title`, `aria-label`, `document.title`.

## When not to use

- Brand marks: use [`ProductMark`](../product-mark/README.md). Never mirror or substitute a brand mark.
- Formatted numbers: use [`Num`](../numeric/README.md), which isolates itself.
- An icon that carries meaning alone: give the button an `aria-label`; `Icon` is always decorative.

## Import

```tsx
import { Icon, Ltr, Bdi, BidiText, isolate, DIRECTIONAL_ICONS, type IconProps } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Icon } from "@fadymondy/nasaq/web";
import { ArrowRight, Search } from "lucide-react";

export function Icons() {
  return (
    <div className="flex items-center gap-4">
      <Icon icon={ArrowRight} className="size-5" /> {/* mirrors in RTL */}
      <Icon icon={Search} className="size-5" />      {/* never mirrors */}
    </div>
  );
}
```

## Anatomy

```
Icon        data-slot="icon"     (the lucide <svg>, aria-hidden="true")
Ltr         <span dir="ltr">     (unicode-bidi: isolate)
Bdi         <bdi>
BidiText    <p dir="auto">       (unicode-bidi: plaintext, text-start)
```

`Ltr`, `Bdi` and `BidiText` have no `data-slot`.

## API

### `Icon`

`IconProps extends LucideProps` (all lucide/SVG props: `size`, `strokeWidth`, `color`, `className`, ...).

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `icon` | `LucideIcon` | required | The lucide icon component to render. |
| `directional?` | `boolean` | derived | `true` forces mirroring in RTL, `false` disables it. Default: mirrors when the icon's `displayName` is in `DIRECTIONAL_ICONS`. |
| `label?` | `string` | none | Accessible name for a meaningful icon. Drops `aria-hidden` and sets `role="img"` and `aria-label`. Localise it. |
| `className?` | `string` | none | Merged with `rtl:-scale-x-100` when mirroring. |
| other lucide props | `LucideProps` | none | Forwarded. |

`aria-hidden="true"` is set before your props, so passing `aria-hidden={false}` (with a label) overrides it.

### `DIRECTIONAL_ICONS`

`Set<string>` of lucide display names that mirror: `ArrowLeft`, `ArrowRight`, `ArrowUpLeft`,
`ArrowUpRight`, `ArrowDownLeft`, `ArrowDownRight`, `ChevronLeft`, `ChevronRight`, `ChevronsLeft`,
`ChevronsRight`, `ChevronFirst`, `ChevronLast`, `CornerDownLeft`, `CornerDownRight`, `CornerUpLeft`,
`CornerUpRight`, `Undo`, `Undo2`, `Redo`, `Redo2`, `Reply`, `ReplyAll`, `Forward`, `Send`,
`SendHorizontal`, `LogIn`, `LogOut`, `ExternalLink`, `SquareArrowOutUpRight`, `PanelLeft`, `PanelRight`,
`PanelLeftClose`, `PanelLeftOpen`, `PanelRightClose`, `PanelRightOpen`, `TextAlignStart`,
`ListIndentIncrease`, `ListIndentDecrease`.

### `Ltr`

`ComponentProps<"span">`. Renders `<span dir="ltr">` with `[unicode-bidi:isolate]`. `className` merges.

### `Bdi`

`ComponentProps<"bdi">`. Renders a bare `<bdi>`.

### `BidiText`

`ComponentProps<"p">`. Renders `<p dir="auto">` with `[unicode-bidi:plaintext] text-start`. `className` merges.

### `isolate`

```ts
isolate(text: string, dir?: "ltr" | "rtl" | "auto"): string // default "auto"
```

Wraps `text` in Unicode isolate marks: LRI (U+2066), RLI (U+2067) or FSI (U+2068), closed by PDI (U+2069).
The string equivalent of `Ltr` / `Bdi`: the marks are invisible, copy cleanly and are ignored by screen readers.

## Examples

### Directional icons in a button

```tsx
import { Icon } from "@fadymondy/nasaq/web";
import { ArrowRight } from "lucide-react";

export function Next() {
  return (
    <button type="button" className="inline-flex items-center gap-2">
      Continue
      <Icon icon={ArrowRight} className="size-4" />
    </button>
  );
}
```

### Forcing or preventing a flip

```tsx
import { Icon } from "@fadymondy/nasaq/web";
import { Gauge, MoveRight } from "lucide-react";

export function Overrides() {
  return (
    <div className="flex gap-3">
      <Icon icon={MoveRight} directional className="size-4" />
      <Icon icon={Gauge} directional={false} className="size-4" />
    </div>
  );
}
```

### Icon with a meaning: label the control, not the icon

```tsx
import { Icon } from "@fadymondy/nasaq/web";
import { Search } from "lucide-react";

export function SearchButton() {
  return (
    <button type="button" aria-label="بحث">
      <Icon icon={Search} className="size-4" />
    </button>
  );
}
```

### LTR run and user text inside Arabic

```tsx
import { Bdi, BidiText, Ltr } from "@fadymondy/nasaq/web";

export function Invoice({ name }: { name: string }) {
  return (
    <div className="flex max-w-md flex-col gap-3" lang="ar" dir="rtl">
      <BidiText>
        رقم الفاتورة <Ltr>INV-2026-0042</Ltr> بتاريخ <Ltr>2026-09-29</Ltr>
      </BidiText>
      <p>
        أُنشئت بواسطة <Bdi>{name}</Bdi>
      </p>
    </div>
  );
}
```

### Keys, tags and names

```tsx
import { Bdi, Kbd, Ltr, Tooltip, isolate } from "@fadymondy/nasaq/web";

export function Hints({ owner }: { owner: string }) {
  return (
    <div className="flex flex-col gap-2" dir="rtl" lang="ar">
      {/* One Ltr around the whole chord: two bare Kbds read "K Ctrl" in RTL. */}
      <p>
        اضغط{" "}
        <Ltr className="inline-flex gap-1">
          <Kbd>Ctrl</Kbd>
          <Kbd>K</Kbd>
        </Ltr>{" "}
        للبحث.
      </p>
      {/* The Arabic comma is a number separator, so bare tags fuse into one LTR run and read backwards. */}
      <p>
        الوسوم: <Ltr>C++</Ltr>، <Ltr>.NET</Ltr>، <Ltr>#nasaq</Ltr>
      </p>
      <Tooltip content={`البحث ${isolate("⌘K", "ltr")}`}>
        <button type="button">بحث</button>
      </Tooltip>
      <p dir="ltr" lang="en">
        Assigned to <Bdi>{owner}</Bdi> 3 tasks
      </p>
    </div>
  );
}
```

## Accessibility

- `Icon` is `aria-hidden="true"` unless you pass `label`, in which case it is `role="img"` with `aria-label`. For an
  icon inside a button or link, prefer labelling the parent. The caller must localise the name.
- `Ltr` / `Bdi` / `BidiText` do not change semantics; they only fix visual ordering so screen-reader and
  visual order agree.
- No keyboard behaviour.

## RTL & i18n

- Mirroring uses `rtl:-scale-x-100`, driven by the nearest `dir`. No provider needed.
- Only icons whose meaning is directional flip: "back", "next", "undo", "send", "sidebar left". Clocks,
  checks, media play, search, and brand marks never flip.
- The list matches lucide display names (arrows, chevrons, `ArrowLeftToLine`/`ArrowRightToLine`, `Indent`, `IndentIncrease`, `IndentDecrease`, `Outdent`, list indent, sidebar and panel icons). If an icon is missing from `DIRECTIONAL_ICONS`, pass `directional`; it always wins over the list.
- `Ltr`, `Bdi` and `BidiText` carry `data-slot="ltr"`, `"bdi"` and `"bidi-text"`.
- `Ltr` for codes, IDs, emails, URLs and numbers with units. `Bdi` for names. `BidiText` for a block
  that follows its own script. `isolate` for the same inside a plain string.
- Measured in Chromium (lab: Foundations / Arabic & bidi). In an Arabic sentence these break as plain text:
  `-4.1%` (renders `%4.1-`), `$48,210` (`48,210$`), `⌘K` (`K⌘`), two adjacent `Kbd`s (`K Ctrl`), tag lists
  joined with `،`, and an Arabic name followed by a number in English text. These hold: `MH-728`, `412h`,
  English product names, `Mahaam (3)`. Isolate identifiers anyway: in a `dir="auto"` block a leading Latin
  letter flips the whole line.
- Use Unicode isolates (`Ltr`, `Bdi`, `isolate`), not LRM/RLM marks, CSS `direction` hacks or reversed strings.

## Styling & tokens

- Size and colour come from the parent: `className="size-4"`, `text-muted-foreground`, and so on. Icons use
  `currentColor`.
- Target `[data-slot=icon]`. Do not tint with raw hex.

## Do / Don't

- **Do** use `Icon` for all lucide icons so RTL is handled in one place.
- **Do** wrap LTR fragments in Arabic prose with `Ltr`, and use `isolate` in strings.
- **Don't** reverse strings or insert LRM/RLM by hand to fix an order.
- **Don't** mirror a brand mark, a clock, a checkmark or a play triangle.
- **Don't** rely on an icon alone to convey meaning; label it.

## Related

- [Text](../text/README.md) · [Num, DateTime](../numeric/README.md) · [Field](../field/README.md) · [ProductMark](../product-mark/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/foundations-icons-bidi--docs
