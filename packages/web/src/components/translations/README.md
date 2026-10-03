---
name: translations
title: Translations
category: utilities
status: beta
summary: "App strings for the Nasaq locale: TranslationsProvider and useT() give t(key, vars) over your dictionaries, with nested and namespaced keys, interpolation, CLDR plurals, locale fallback, a remembered choice and seedLocale for server defaults."
exports: [TranslationsProviderProps, TranslationsValue, TranslationsProvider, useT, useOptionalT]
related: [switchers, lang-tag]
story: components-utilities-translations
base-ui: []
keywords: [i18n, translations, t, locale, language, plural, interpolation, dictionary, messages, arabic, rtl]
---

# Translations

A small i18n layer for your own strings that shares one locale with Nasaq. `TranslationsProvider` reads and
drives `NasaqProvider`'s locale, so switching language also flips direction and the built-in component strings.
`useT()` returns `t(key, vars)` over dictionaries you pass in. No i18n library is needed.

## When to use

- An app built on Nasaq that needs its own strings in English, Arabic or more.
- When the server suggests a language (an account setting, `Accept-Language`) that should apply only until the
  reader picks one: `seedLocale`.

## When not to use

- Nasaq components' own strings: they already follow the locale; pass `labels` to change them.
- An app already on i18next or FormatJS: keep it, and sync its language with `useNasaq().setLocale`.

## Import

```tsx
import { TranslationsProvider, useT } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
const messages = {
  en: { nav: { home: "Home" }, inbox_one: "{count} message", inbox_other: "{count} messages" },
  ar: { nav: { home: "الرئيسية" }, inbox_zero: "لا رسائل", inbox_one: "رسالة واحدة", inbox_two: "رسالتان", inbox_few: "{count} رسائل", inbox_many: "{count} رسالة", inbox_other: "{count} رسالة" },
};

<NasaqProvider>
  <TranslationsProvider messages={messages}>
    <App />
  </TranslationsProvider>
</NasaqProvider>;

function Nav({ unread }: { unread: number }) {
  const { t, setLocale } = useT();
  return (
    <>
      <a href="/">{t("nav.home")}</a> · {t("inbox", { count: unread })}
      <button onClick={() => setLocale("ar")}>العربية</button>
    </>
  );
}
```

## Anatomy

```
TranslationsProvider   context only, renders no element
└─ useT()              { t, locale, setLocale, seedLocale, hasStoredLocale }
```

## API

### `TranslationsProvider`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `messages` | `MessageBundle` | required | `{ [locale]: Messages }`. Nested objects or flat `"a.b"` keys. |
| `fallbackLocale?` | `string` | `"en"` | Searched when a key is missing. |
| `storageKey?` | `string \| null` | `"nasaq-locale"` | Where the reader's choice is kept in `localStorage`; restored on mount. `null` turns it off. |
| `locale?` | `string` | `"en"` | Only used without a `NasaqProvider` above. |

### `t(key, vars?)`

- **Keys**: `nav.home`, `nav:home` (namespace), or a flat key containing dots. A flat key wins.
- **Interpolation**: `{name}` and `{{name}}`. Numbers are formatted for the locale (Arabic digits in `ar`).
- **Plurals**: with a numeric `count`, `key_zero` (for 0), then the CLDR form (`_one`, `_two`, `_few`, `_many`) and
  `key_other` are tried, then `key`.
- **Fallback**: `ar-EG`, `ar`, the fallback locale, then `vars.defaultValue`, then the key itself.

### `useT()`

| Field | Description |
| --- | --- |
| `t` | The translator for the active locale. |
| `locale` | The active locale. |
| `setLocale(l)` | Switches and remembers the choice. |
| `seedLocale(l)` | Switches only if nothing is stored, and does not store it. |
| `hasStoredLocale()` | Whether the reader has made a choice. |

`useOptionalT()` returns `null` outside a provider. `createTranslator(bundle, locale, fallback)` is the same `t`
without React, for servers and tests.

## Accessibility

- `NasaqProvider` sets `lang` and `dir` from the locale, so screen readers switch voice and the layout mirrors.
- Keep whole sentences as one key so translators can reorder words.

## RTL & i18n

Arabic has six plural forms; give at least `_zero`, `_one`, `_two`, `_few`, `_many` and `_other`. Missing forms
fall back to `_other`.

## Styling & tokens

None: this is logic only.

## Do / Don't

- Do use `seedLocale` for server defaults so a reader's own choice is never overwritten.
- Don't build sentences from fragments (`t("you_have") + n + t("messages")`); use one key with `{count}`.

## Related

- [Switchers](../switchers/README.md)
- [LangTag](../lang-tag/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-utilities-translations--docs
