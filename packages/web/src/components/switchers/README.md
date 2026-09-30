---
name: switchers
title: ThemeSwitcher
category: actions
status: stable
summary: Theme (light / dark / system) and language controls - a segmented switcher, a language dropdown, and menu-item variants for embedding in other menus.
exports: [ThemeSwitcher, ThemeSwitcherProps, ThemeMenuItems, LocaleSwitcher, LocaleSwitcherProps, LocaleMenuItems, useThemeLabels, ThemeLabels, THEME_OPTIONS]
related: [user-menu, app-shell]
story: components-actions-switchers
base-ui: [toggle, toggle-group, menu]
keywords: [theme, dark mode, light, system, language, locale, rtl, arabic, switcher, preferences]
---

# ThemeSwitcher

Standalone controls for the two global preferences. Both talk to `NasaqProvider` (`useNasaq()`), so
choosing Arabic flips the whole document to RTL and choosing a theme updates every token.

- **`ThemeSwitcher`**: a segmented Light / Dark / System control.
- **`LocaleSwitcher`**: a language dropdown, icon-only or with the current language name.
- **`ThemeMenuItems` / `LocaleMenuItems`**: the same choices as radio items for use inside your own `DropdownMenu` (this is what `UserMenu` uses).
- **`useThemeLabels`** and **`THEME_OPTIONS`**: the localised labels and option list.

## When to use

- Login, marketing or settings pages that need a visible theme or language control.
- A header where the user menu is not present.

## When not to use

- Inside the app shell's sidebar: [`UserMenu`](../user-menu/README.md) already includes both.
- Per-component appearance (density, brand): those are provider settings, not user preferences.

## Import

```tsx
import {
  ThemeSwitcher, LocaleSwitcher, ThemeMenuItems, LocaleMenuItems, useThemeLabels, THEME_OPTIONS,
} from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { LocaleSwitcher, ThemeSwitcher } from "@fadymondy/nasaq/web";

export function Preferences() {
  return (
    <div className="flex items-center gap-3">
      <ThemeSwitcher />
      <LocaleSwitcher showLabel />
    </div>
  );
}
```

Must render inside `NasaqProvider`.

## Anatomy

```
ThemeSwitcher                  data-slot="theme-switcher"  (ToggleGroup, aria-label = labels.group)
└─ Toggle × 3                  Sun / Moon / Monitor, tooltip + aria-label; data-pressed on the active one

LocaleSwitcher                 DropdownMenu
├─ trigger                     ghost Button (icon-sm, or sm with the language name)
└─ menu                        label, one radio item per locale (`DropdownMenuRadioItem`, the current one is checked and exposed to assistive tech)
```

## API

### `ThemeSwitcher`

Extends `Omit<ComponentProps<typeof ToggleGroup>, "value" | "onValueChange">` (so `className` and other group props apply).

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `labels?` | `Partial<ThemeLabels>` | EN/AR by locale | Overrides for `light`, `dark`, `system`, `group`. |

The value is read from and written to `useNasaq()` (`theme`, `setTheme`). Clicking the active option does nothing (one option is always selected).

### `LocaleSwitcher`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `showLabel?` | `boolean` | `false` | Shows the current language name beside the icon. |
| `label?` | `string` | "Language" / "اللغة" | Menu heading and, icon-only, the button's accessible name prefix (`"Language: English"`). |
| `className?` | `string` | none | Classes for the trigger button. |

Options come from `useNasaq().locales`; each is shown in its own script with `lang` and `dir` set.

### `ThemeMenuItems`

`({ labels?: Partial<ThemeLabels> }) => JSX.Element`: a `DropdownMenuRadioGroup` with Light, Dark, System. Use inside a `DropdownMenuContent` or `DropdownMenuSubContent`.

### `LocaleMenuItems`

`() => JSX.Element`: a `DropdownMenuRadioGroup` of the provider's locales.

### `useThemeLabels`

```ts
useThemeLabels(labels?: Partial<ThemeLabels>): ThemeLabels
```

Returns the built-in labels for the provider locale (Arabic for `ar*`, otherwise English), merged with `labels`.

### `ThemeLabels`

`{ light: string; dark: string; system: string; group: string }`. Defaults: EN "Light", "Dark", "System", "Theme"; AR "فاتح", "داكن", "النظام", "المظهر".

### `THEME_OPTIONS`

`readonly [{ value: "light"; icon }, { value: "dark"; icon }, { value: "system"; icon }]`, typed against `ThemePreference` from `@nasaq/tokens`.

## Examples

### In your own dropdown

```tsx
import {
  Button, DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuTrigger,
  LocaleMenuItems, ThemeMenuItems, useThemeLabels,
} from "@fadymondy/nasaq/web";

export function PrefsMenu() {
  const t = useThemeLabels();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>Preferences</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t.group}</DropdownMenuLabel>
          <ThemeMenuItems />
        </DropdownMenuGroup>
        <DropdownMenuGroup>
          <DropdownMenuLabel>Language</DropdownMenuLabel>
          <LocaleMenuItems />
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### Custom labels

```tsx
import { ThemeSwitcher } from "@fadymondy/nasaq/web";

export const Custom = () => <ThemeSwitcher labels={{ group: "Appearance", system: "Auto" }} />;
```

## Accessibility

`ThemeSwitcher` (toggle group):

| Key | Action |
| --- | --- |
| `Tab` | Focus the group. |
| `←` `→` | Move between Light / Dark / System (follows reading order in RTL). |
| `Space` / `Enter` | Select the focused option. |

`LocaleSwitcher` (menu):

| Key | Action |
| --- | --- |
| `Enter` / `Space` / `↓` on trigger | Opens the list. |
| `↑` `↓` | Move between languages. |
| `Enter` | Switches language. |
| `Esc` | Closes. |

- Each theme toggle has an `aria-label` and a tooltip; the group is named by `labels.group`.
- The icon-only `LocaleSwitcher` is named `"<label>: <current language>"`.
- Language names carry `lang` so screen readers switch voice.
- **Localise:** `labels` (built-ins cover `en` and `ar`) and `LocaleSwitcher.label`.

## RTL & i18n

- Switching to an RTL locale flips the whole document via `NasaqProvider`; these controls only call `setLocale`.
- Each language is displayed in its own script and direction (`dir` from the locale entry).
- The radio check mark and menu align with logical properties.

## Styling & tokens

- `ThemeSwitcher`: `border-border`, `bg-card`; active option `data-pressed:bg-nq-selected`, focus `nq-focus`.
- Target `[data-slot=theme-switcher]`; extend with `className`.

## Do / Don't

- **Do** offer "System" as the default preference.
- **Do** use the menu-item variants inside menus so state is exposed as radios.
- **Don't** duplicate the controls beside `UserMenu` in the same view.
- **Don't** hard-code language names; they come from the provider's locale list.

## Related

- [user-menu](../user-menu/README.md) · [app-shell](../app-shell/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-actions-switchers--docs
