---
name: theme-presets
title: Theme presets
category: brand
status: beta
summary: "Named themes (light or dark plus brand colours): Nasaq, purple, rose and emerald, each dark and light. A picker with live previews, useThemePreset to apply and remember the choice, overrides for tenant colours, and ThemePresetScope to preview a region."
exports: [applyThemePreset, UseThemePresetOptions, useThemePreset, ThemePresetPickerProps, ThemePresetPicker, ThemePresetScopeProps, ThemePresetScope]
related: [appearance-pickers, branding-provider, switchers, color-picker]
story: components-brand-theme-presets
base-ui: [radio-group]
keywords: [theme, preset, named theme, purple, rose, emerald, dark, light, brand colour, accent, override, white label]
---

# Theme presets

A set of named themes the reader can choose from, each a light or dark mode plus brand colours. The picker is a
`ThemeGallery` with previews; `useThemePreset` applies the choice to the app, remembers it, and layers any
overrides (such as a tenant's colour) on top.

## When to use

- An appearance setting with more than light and dark: "Purple", "Rose light".
- Products that ship a few colour themes over one brand manifest.

## When not to use

- Only light, dark and system: use `ThemeToggle` from Switchers.
- Colours from a database for a white-label tenant, with no choice for the reader: use `BrandingProvider`.

## Import

```tsx
import { ThemePresetPicker, useThemePreset } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
function AppearanceSettings({ tenantBrand }: { tenantBrand?: string }) {
  const { value, setValue } = useThemePreset({ overrides: { brand: tenantBrand } });
  return <ThemePresetPicker value={value} onValueChange={setValue} overrides={{ brand: tenantBrand }} />;
}
```

## Anatomy

```
ThemePresetPicker     a ThemeGallery (data-slot="theme-gallery"), one radio card per preset
ThemePresetScope      data-slot="theme-preset-scope" data-theme=mode
└─ region             data-brand="runtime", the preset's variables inline
```

## API

### `ThemePreset`

`{ id, label, labelAr?, mode: "light" | "dark", brand?, brandDark?, accent? }`. Without colours a preset keeps
the active brand manifest (the built-in `nasaq` and `nasaq-light`).

### `ThemePresetPicker`

All `ThemeGallery` props except `themes` (`value`, `defaultValue`, `onValueChange`, `label`, `columns`,
`disabled`, `name`, `labels`, `className`), plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `presets?` | `readonly ThemePreset[]` | `THEME_PRESETS` | The choices. |
| `overrides?` | `ThemeOverrides` | none | `{ brand?, brandDark?, accent? }`, shown in every preview. |

### `useThemePreset(options)`

| Option | Default | Description |
| --- | --- | --- |
| `presets` | `THEME_PRESETS` | |
| `defaultValue` | first preset | Used when nothing is stored. |
| `storageKey` | `"nasaq-theme-preset"` | `null` turns persistence off. |
| `overrides` | none | Colours over the chosen preset. |
| `apply` | `true` | Writes the variables on `<html>` and calls `NasaqProvider`'s `setTheme(preset.mode)`. |

Returns `{ value, preset, setValue, presets }`.

### Helpers

- `applyThemePreset(root, preset, overrides)` writes the variables on any element and returns a cleanup.
- `themePresetVars(preset, overrides)` returns `--nq-brand-l/-d`, `--nq-action-l/-d`, `--nq-on-action-l/-d` and
  `--nq-accent-brand`. Invalid colours are dropped, so a bad stored value falls back to the manifest.
- `ThemePresetScope` renders children in a preset without touching the page.

## Accessibility

- The picker is a radio group with arrow-key navigation; each card is named by its label, and the sun or moon icon
  is decorative.
- Text on the action colour is ink or ivory, whichever has more contrast.

## RTL & i18n

Arabic labels come from `labelAr` when the locale is Arabic. Previews mirror with the layout.

## Styling & tokens

Presets set only the brand variables; every other role (surfaces, text, borders) comes from the light or dark
token set, so all presets keep Nasaq's contrast.

## Do / Don't

- Do keep the same family in light and dark so a reader can switch mode without losing their colour.
- Don't define surfaces or text colours in a preset; let the mode supply them.

## Related

- [Appearance pickers](../appearance-pickers/README.md)
- [BrandingProvider](../branding-provider/README.md)
- [Switchers](../switchers/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-brand-theme-presets--docs
