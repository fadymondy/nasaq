---
name: mention-textarea
title: MentionTextarea
category: collaboration
status: beta
summary: Textarea that suggests people at the caret when you type @ (or another trigger) and reports the text plus a mentions array.
exports: [MentionTextarea, MentionTextareaProps, MentionOption, Mention]
related: [profile-card, field, combobox, tag-input, avatar]
story: components-collaboration-mention-textarea
base-ui: [field]
keywords: [mention, at, autocomplete, textarea, comment, tag people, suggestions]
---

# MentionTextarea

A `Textarea` that opens a list of suggestions at the caret when the user types a trigger character (`@` by default). Choosing
an entry inserts `@name`. `onValueChange` returns the text and a `mentions` array with the id and the range of each mention, so
the server can notify the right people.

## When to use

- Comments, notes and messages where people are referenced.

## When not to use

- Picking a value from a list in a single-line control: use `combobox`.
- Free tags: use `tag-input`.

## Import

```tsx
import { MentionTextarea } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { Field, FieldLabel, type Mention, MentionTextarea } from "@fadymondy/nasaq/web";
import { useState } from "react";

const people = [
  { id: "u1", name: "Sara Ali", description: "Design lead" },
  { id: "u2", name: "Omar Nasser", description: "Engineer" },
];

export function Comment() {
  const [mentions, setMentions] = useState<Mention[]>([]);
  return (
    <Field>
      <FieldLabel>Comment</FieldLabel>
      <MentionTextarea
        rows={4}
        suggestions={people}
        placeholder="Type @ to mention someone"
        onValueChange={(text, next) => setMentions(next)}
      />
      <output>{mentions.length} mentioned</output>
    </Field>
  );
}
```

## Anatomy

```
div                 data-slot="mention-textarea"   (relative wrapper)
  textarea          data-slot="textarea"           (role="combobox")
  ul                data-slot="mention-list"       (role="listbox", at the caret)
    li              data-slot="mention-option"     (role="option", data-active)
  div               data-slot="mention-empty"      (when nothing matches)
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `suggestions` | `MentionOption[]` | required | `{ id, name, description?, avatar?, kind?, handle?, presence?, keywords? }`. `kind` is `person` (default), `team` or `group`: the list is sectioned by kind, teams and groups show an icon, people a presence dot. `handle` and `keywords` are searchable. |
| `value` / `defaultValue` | `string` | `""` | Controlled or initial text. |
| `onValueChange` | `(value: string, mentions: Mention[]) => void` | | Text and every mention still in it, in text order. |
| `defaultMentions` | `Mention[]` | `[]` | Mentions that are already in `value`/`defaultValue`. Entries whose text no longer reads `@name` are dropped. |
| `trigger` | `string` | `"@"` | The character (or string) that opens the list. Must start a word. |
| `maxSuggestions` | `number` | `8` | Most rows shown. |
| `listLabel` | `string` | "Mentions" / "الإشارات" | Listbox name. |
| `emptyLabel` | `string` | "No matches" / "لا نتائج" | Shown when the query matches nobody. |
| `wrapperClassName` | `string` | | Class of the wrapper. `className` goes on the textarea. |

Other props go to the textarea (`rows`, `placeholder`, `disabled`, ...).

`Mention = { id: string; name: string; start: number; end: number }`; `text.slice(start, end)` is `@name`. Ranges follow the
text as the user edits before them, and a mention is dropped when the user edits inside it.

## Examples

Arabic, with a hash trigger:

```tsx
import { MentionTextarea } from "@fadymondy/nasaq/web";

export function Arabic() {
  return (
    <MentionTextarea
      rows={3}
      trigger="#"
      suggestions={[
        { id: "t1", name: "التصميم" },
        { id: "t2", name: "الفوترة" },
      ]}
      placeholder="اكتب # لإضافة وسم"
    />
  );
}
```

## Accessibility

The textarea is an ARIA combobox (`aria-autocomplete="list"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`); the
list is a `listbox` of `option`s. Focus never leaves the textarea. A polite status region announces the number of suggestions.

| Key | Action |
| --- | --- |
| Arrow Down / Up | Moves the highlight (wraps). |
| Enter / Tab | Inserts the highlighted mention. |
| Escape | Closes the list until the next trigger. |
| Any other key | Types; the list filters as you type. |

Without a match, or after Escape, Enter and Tab behave as in a normal textarea.

## RTL & i18n

Filtering uses `normalizeForSearch`, so case, Arabic diacritics, tatweel and alef/yeh/teh-marbuta variants are ignored. The
list opens at the trigger's position, measured from the textarea's own direction, so it works right-to-left. A space is inserted
after the name (not part of the mention). Default strings are in English and Arabic; localise `listLabel` and `emptyLabel` for other languages.

## Styling & tokens

Uses `bg-popover`, `border-border`, `shadow-floating`, `bg-nq-selected` (highlighted row), `text-muted-foreground`. Target
`data-active` on options. The list is positioned inside the wrapper; it does not flip above the field near the bottom of the
viewport.

## Do / Don't

- Do keep `suggestions` short or filter them on the server and pass the result.
- Do send `mentions` (ids) to the server rather than parsing the text.
- Don't rely on the range for anything after the user edits without your `onValueChange` seeing it.

## Related

- [field](../field/README.md)
- [combobox](../combobox/README.md)
- [tag-input](../tag-input/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-collaboration-mention-textarea--docs
