# RTL and Arabic

Nasaq is built for products that ship in English and Arabic. Right-to-left is a first-class layout, tested in the same stories as left-to-right, not a separate theme.

Use the **Locale** item in this Storybook's toolbar (English, العربية) to see any component in Arabic. The toolbar sets the language and reading direction together.

## Set the locale

`NasaqProvider` takes a `locale`. Arabic (and Hebrew, Persian and Urdu) switch the document to `dir="rtl"` and `lang="ar"`, and the provider passes the direction to Base UI so popovers, menus, sliders and tabs place and navigate correctly.

```tsx
<NasaqProvider locale="ar">{children}</NasaqProvider>

// or let users choose, and keep your own i18n in step
<NasaqProvider locale={locale} onLocaleChange={setLocale}>
  {children}
</NasaqProvider>
```

`useNasaq()` returns `direction`, `isRtl`, `locale` and `setLocale`. The default list of locales is English and Arabic; pass `locales` to add others with their direction. `LocaleSwitcher` is the drop-in control.

## Logical properties only

Components never use physical directions. Write `ms-2` not `ml-2`, `pe-4` not `pr-4`, `text-start` not `text-left`, `start-0` not `left-0`, `border-s` not `border-l`. They flip on their own. The repo's lint rejects the physical forms, and you can use the same rule in your project through the tooling package's ESLint plugin.

Motion and offsets follow the same rule: use `translate-x` with the `rtl:` variant only where a value genuinely must flip.

## Icons

Wrap lucide icons in `Icon`. Glyphs that carry direction (arrows, chevrons, undo and redo, send, reply, panels) mirror in RTL; search, clock, check and play do not. Brand marks, digits and code never mirror.

```tsx
import { ArrowRight } from "lucide-react";
import { Icon } from "@fadymondy/nasaq/web";

<Icon icon={ArrowRight} label="Next" />;
```

## Mixed-direction text

Arabic sentences often contain Latin text: codes, emails, URLs, invoice numbers, product names. Isolate them so the bidi algorithm does not scramble punctuation.

| Helper | Use |
| --- | --- |
| `Ltr` | An inline run that must stay left-to-right (an order number inside Arabic prose) |
| `Bdi` | A user-supplied name or title of unknown direction |
| `BidiText` | A block of user text that takes its direction from its first strong character |
| `isolate(text)` | The same for plain strings: tooltips, toasts, `aria-label`, `document.title` |

```tsx
import { Bdi, Ltr } from "@fadymondy/nasaq/web";

<p>
  طلبك رقم <Ltr>#INV-2048</Ltr> من <Bdi>{customer.name}</Bdi> جاهز.
</p>;
```

## Typography

Arabic has its own type tokens: taller line heights (body 1.85 instead of 1.5), no letter-spacing, no uppercase transform, and weights that suit the script. They are applied automatically under `[lang|="ar"]`, so a component looks right in Arabic with no extra code. The Arabic font stack starts with an optional licensed face and falls back to Alexandria; see [Project setup](?page=docs-installation-project-setup).

Numerals are Latin digits by default, which suits UI data; pass the locale to `Num` where a product wants Arabic-Indic digits. `Num` and `DateTime` (see the numeric component) format with a fixed digit set, tabular figures and bidi isolation.

Inter's contextual alternates are switched off in the base styles, because they turn "3x1" into "3×1" in emails and URLs.

## Built-in strings

Components with built-in text (for example date pickers, empty states and the cookie banner) ship English and Arabic strings and read the locale from the provider. Text you pass in is yours to translate; each component's manual lists which labels a caller must localise.

## Libraries that do not follow `dir`

A few third-party surfaces have no RTL mode. Nasaq adapts what it can (chart axes flip, toast position and direction follow the locale) and pins the rest to left-to-right, namely code blocks, node graphs (`@xyflow`) and terminals. The manual for each component says so under "RTL & i18n".

## Test both

Every story in this lab can be flipped with the toolbar. Check your own screens in Arabic before release: long strings, mixed-direction rows, tables with numeric columns, and icons next to text are where most bugs live.
