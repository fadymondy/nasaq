---
name: lang-tag
title: LangTag
category: data-display
status: beta
summary: "The language of a piece of content (not of the interface): a small coloured code tag beside a title, message or document, read aloud as the language's full name."
exports: [LangTag, LangTagProps, languageName]
related: [badge, switchers]
story: components-data-display-lang-tag
base-ui: []
keywords: [language, locale, tag, code, translation, multilingual, ar, en, content language]
---

# LangTag

Shows which language a piece of content is written in, as a short code (`AR`, `EN`, `FR`) in a tag with a fixed
colour per language. Screen readers hear "Content language: Arabic" instead of the letters.

## When to use

- Lists that mix languages: articles, messages, translations, documents, search results.
- A translation editor, next to each version.

## When not to use

- Choosing the interface language: use `LocaleSwitcher`.
- Content whose language is obvious from the page.

## Import

```tsx
import { LangTag } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<p className="flex items-center gap-2">
  <LangTag lang={post.lang} /> {post.title}
</p>
```

## Anatomy

```
LangTag          data-slot="lang-tag" data-lang="ar"   (a Badge, variant="tag", dir="ltr")
├─ code          aria-hidden, uppercase
└─ sr-only name  "Content language: Arabic" / "لغة المحتوى: العربية"
```

## API

`LangTagProps extends Omit<ComponentProps<"span">, "children" | "lang">`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `lang` | `string \| null` | none | `ar`, `en`, `en-GB`, `pt_BR`. Nothing renders when empty. |
| `region?` | `boolean` | `false` | Show the full code (`EN-GB`) instead of the base (`EN`). |
| `hue?` | `TagHue` | by language | Override the colour. Built in: ar amber, en blue, fr violet, es orange, de teal, tr red, ur green, fa pink, others gray. |
| `className?` | `string` | none | Merged onto the badge. |

**Helper**: `languageName(code, locale)` returns the language's name in `locale` via `Intl.DisplayNames`, or the
code when the runtime does not know it.

## Accessibility

- The visible code is hidden from assistive tech; an `sr-only` span gives the full language name in the reader's
  language. The `title` shows the same name on hover.
- Colour is never the only cue: the code is always visible.

## RTL & i18n

The code is a Latin token and is set `dir="ltr"`, so it reads the same in an Arabic layout. The spoken name
follows the Nasaq locale.

## Styling & tokens

A `tag` badge in a monospace, uppercase, tracked style. Hues come from the badge tag palette.

## Do / Don't

- Do keep the colour table consistent across a product; override `hue` app-wide, not per row.
- Don't use flags: a language is not a country.

## Related

- [Badge](../badge/README.md)
- [Switchers](../switchers/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-data-display-lang-tag--docs
