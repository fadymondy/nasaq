---
name: appearance-pickers
title: Appearance pickers
category: pickers
status: beta
summary: Pickers for how an app looks and reads. A gallery of named themes with mini previews, reading settings for text size, line width and spacing with a live sample, and a wallpaper picker with upload and dimming. They hold the choice; you apply and save it.
exports: [AppearanceLabels, ThemeGalleryProps, ThemeGallery, ReadingSettingsProps, ReadingSettings, WallpaperPickerProps, WallpaperPicker]
related: [theme-toggle, color-picker, toggle-group, slider, settings-page]
story: components-pickers-appearance-pickers
base-ui: [radio-group, toggle-group, slider]
keywords: [theme, appearance, wallpaper, background, reading settings, font size, line width, line spacing, customise, personalise, dark mode]
---

# Appearance pickers

Three pickers for the "Appearance" page of a settings screen.

| Control | What it is |
| --- | --- |
| `ThemeGallery` | Cards, one per named theme, each with a small preview of its page, sidebar, text and accent. One is chosen at a time. |
| `ReadingSettings` | Text size, line width and line spacing as segmented controls, a reset button and a live sample paragraph. |
| `WallpaperPicker` | A grid of gradients, colours and pictures grouped by section, an optional upload tile and a dim slider. |

They only hold the choice and report it. Applying it (setting a class, a CSS variable, a background) and saving it is your code, so the same pickers work in a web app, a desktop shell and an extension.

## When to use

- A product with several named themes beyond light and dark.
- Reading-heavy products (articles, documents, notes) where comfort settings matter.
- Desktop or dashboard shells with a wallpaper.

## When not to use

- Just light, dark and system: use [`ThemeToggle`](../theme-toggle/README.md).
- Picking one colour value: use [`ColorPicker`](../color-picker/README.md).
- Language and region: use the language switcher.

## Import

```tsx
import { ThemeGallery, ReadingSettings, WallpaperPicker, readingStyleVars, wallpaperCss, parseReadingPreferences } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { ReadingSettings, ThemeGallery, readingStyleVars, type ReadingPreferences } from "@fadymondy/nasaq/web";
import { useState } from "react";

const themes = [
  { id: "paper", label: "Paper", mode: "light" as const, swatches: ["var(--nq-surface)", "var(--nq-surface-soft)", "var(--nq-fg)", "var(--nq-brand)"] },
  { id: "ink", label: "Ink", mode: "dark" as const, swatches: ["var(--nq-fg)", "var(--nq-fg-muted)", "var(--nq-surface)", "var(--nq-brand)"] },
];

export function Appearance() {
  const [theme, setTheme] = useState("paper");
  const [reading, setReading] = useState<ReadingPreferences>({ fontSize: "md", width: "normal", spacing: "normal" });
  return (
    <div className="flex flex-col gap-8">
      <ThemeGallery themes={themes} value={theme} onValueChange={setTheme} />
      <ReadingSettings value={reading} onValueChange={setReading} />
      <article style={readingStyleVars(reading)}>{/* uses var(--reading-scale) etc. */}</article>
    </div>
  );
}
```

## Anatomy

```
ThemeGallery      data-slot="theme-gallery"      heading + radio group of theme-card (preview, mode icon, name, description, check)
ReadingSettings   data-slot="reading-settings"   rows of ToggleGroups, Reset, then reading-preview (live sample)
WallpaperPicker   data-slot="wallpaper-picker"   sections of wallpaper-none / wallpaper-tile radios, upload tile, dim Slider
```

## API

### ThemeGallery

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `themes` | `readonly AppearanceTheme[]` | none | `{ id, label, description?, mode?, swatches }`. `swatches` are up to four CSS colours: page, surface, text, accent. Prefer token colours. |
| `value` / `defaultValue` | `string` | first theme | Selected theme id. |
| `onValueChange` | `(id: string) => void` | none | Choice changed. |
| `label` | `ReactNode \| false` | "Theme" | Heading; `false` hides it (then pass `aria-label`). |
| `columns` | `2 \| 3 \| 4` | `4` | Cards per row at the widest (two on phones). |
| `disabled` / `name` | | | Usual radio group props. |
| `labels` | `AppearanceLabels` | en / ar | Text overrides. |

### ReadingSettings

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` / `defaultValue` | `ReadingPreferences` | `{ fontSize: "md", width: "normal", spacing: "normal" }` | `fontSize` sm / md / lg / xl, `width` narrow / normal / wide / full, `spacing` compact / normal / relaxed. |
| `onValueChange` | `(next: ReadingPreferences) => void` | none | Any part changed. |
| `controls` | `("fontSize" \| "width" \| "spacing")[]` | all | Which rows to show. |
| `showPreview` | `boolean` | `true` | Live sample under the controls. |
| `previewTitle` / `previewBody` | `ReactNode` | built in | Replace the sample text. |
| `disabled` | `boolean` | `false` | Disable all controls. |
| `labels` | `AppearanceLabels` | en / ar | Text overrides, including `sizes`, `widths`, `spacings`. |

### WallpaperPicker

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `wallpapers` | `readonly AppearanceWallpaper[]` | none | `{ id, label, background, group? }`. `background` is a CSS background or a picture URL. |
| `value` / `defaultValue` | `string \| null` | `null` | Selected id; `null` is none. |
| `onValueChange` | `(id: string \| null) => void` | none | Choice changed. |
| `dim` / `onDimChange` | `number` / `(percent) => void` | none | Dim amount 0 to 60. Passing either shows the slider. |
| `onUpload` | `(file: File) => void \| Promise<void>` | none | Shows the upload tile. Add the new wallpaper to `wallpapers` yourself. |
| `accept` | `string` | `"image/*"` | File types for the upload. |
| `allowNone` | `boolean` | `true` | A "None" tile first. |
| `label` | `ReactNode \| false` | "Wallpaper" | Heading. |

### Helpers (pure, no React)

| Function | Description |
| --- | --- |
| `readingStyleVars(prefs)` | `{ "--reading-scale", "--reading-max-width", "--reading-line-height" }` for the reading area's `style`. |
| `parseReadingPreferences(saved)` | Saved JSON or an object to valid preferences; unknown or missing fields use the defaults. |
| `stepReadingFontSize(size, delta)` / `readingFontPercent(size)` | One size up or down; "113" for large. |
| `wallpaperCss(background)` | The CSS `background` shorthand; pictures get `center / cover no-repeat url(...)`. |
| `groupWallpapers`, `clampWallpaperDim`, `themePreviewColors`, `isDefaultReading` | Small pure helpers. |

## Examples

Wallpaper with dimming and upload:

```tsx
import { WallpaperPicker, wallpaperCss } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function Desk({ wallpapers }: { wallpapers: React.ComponentProps<typeof WallpaperPicker>["wallpapers"] }) {
  const [id, setId] = useState<string | null>(null);
  const [dim, setDim] = useState(20);
  const current = wallpapers.find((w) => w.id === id);
  return (
    <div style={{ background: current ? wallpaperCss(current.background) : undefined }}>
      <WallpaperPicker wallpapers={wallpapers} value={id} onValueChange={setId} dim={dim} onDimChange={setDim} onUpload={async (file) => { /* upload, then add to wallpapers */ }} />
    </div>
  );
}
```

## Accessibility

- `ThemeGallery` and `WallpaperPicker` are radio groups: Tab enters, arrow keys move (following the reading direction), Space selects. The group is named by its heading.
- Wallpaper tiles have no visible text, so each has its `label` as its accessible name and tooltip. Use a real label, not "Wallpaper 3".
- Reading settings buttons have text or `aria-label`s ("Larger text"); the size steppers stop being available at the ends.
- The selected card shows a check as well as a border, so selection never relies on colour alone.

## RTL & i18n

- Text is English or Arabic through `labels`; pass localised theme and wallpaper names.
- The percent labels (`113%`) are isolated left-to-right; the grids and toggle groups follow the reading direction; the reset icon mirrors.
- The reading sample follows the page direction, so line width in `ch` works for Arabic too.

## Styling & tokens

Cards use `border-border`, `bg-card`, `bg-nq-selected` and `border-primary` when chosen. Theme previews take their colours from the theme's own swatches, so give token colours (`var(--nq-brand)`) rather than hex.
Target `[data-slot="theme-card"]`, `[data-slot="wallpaper-tile"]`, `[data-slot="reading-preview"]`.

## Do / Don't

- Do apply the choice at once; the preview is only a hint.
- Do keep wallpapers readable behind text: offer the dim slider.
- Don't offer more than about eight themes; a gallery is not a catalogue.
- Don't rely on `swatches` alone for meaning; every theme has a name.

## Related

- [`ThemeToggle`](../theme-toggle/README.md)
- [`ColorPicker`](../color-picker/README.md)
- [`ToggleGroup`](../toggle-group/README.md)
- [`Slider`](../slider/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-pickers-appearance-pickers--docs
