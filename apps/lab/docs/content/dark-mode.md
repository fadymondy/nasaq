# Dark mode

Dark mode is a full second set of semantic colours, not an inversion. Every surface, line, text and status token has a light and a dark value, defined in the token source and emitted by `tokens.css`. Components only use semantic tokens, so nothing in a component needs to know which theme is active.

Use the **Theme** item in this Storybook's toolbar to flip any page, including this one.

## How the theme is chosen

`NasaqProvider` resolves a preference to `light` or `dark`:

| Preference | Meaning |
| --- | --- |
| `light` | Always light |
| `dark` | Always dark |
| `system` (default) | Follow `prefers-color-scheme`, live |

It applies the result three ways on `<html>`, so whichever convention your code uses keeps working:

- `data-theme="dark"` (Nasaq's own selector, used by `tokens.css`).
- The `dark` class (what shadcn's components and Tailwind's `dark:` variant expect).
- `color-scheme: dark`, so scrollbars and native form controls match.

The choice is saved in `localStorage["nasaq-theme"]`. Add the [theme script](?page=docs-installation-project-setup) to `<head>` so the saved theme is applied before first paint, with no flash.

## Switching

`useNasaq()` gives you the current and resolved theme and a setter:

```tsx
import { useNasaq } from "@fadymondy/nasaq/web";
import { Button } from "@fadymondy/nasaq/web";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useNasaq();
  return (
    <Button variant="ghost" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
      {resolvedTheme === "dark" ? "Light" : "Dark"}
    </Button>
  );
}
```

For a ready-made control use `ThemeSwitcher` (see [Switchers](?doc=components-actions-switchers)), which offers light, dark and system.

If your app already owns the theme (for example with `next-themes`), pass it in and Nasaq follows:

```tsx
<NasaqProvider theme={theme} onThemeChange={setTheme}>
  {children}
</NasaqProvider>
```

## Writing dark-safe styles

- Use semantic tokens (`bg-nq-surface`, `text-nq-fg`, `border-nq-line`, `bg-card`, `text-muted-foreground`). They change with the theme on their own.
- Do not write `dark:` variants for colours you can express with a token. If you need one, add or reuse a token instead.
- Do not use raw hex colours in components. The repo's lint rejects them.
- Surfaces get **lighter** as they rise in dark mode (page, panel, raised, overlay), and **whiter** in light mode. A nested layer moves up exactly one level.
- Status colours (`success`, `warning`, `danger`, `info`) have their own text and soft-background tokens with contrast checked in both themes.

## Contrast

The token package has a test that computes the contrast of every text-on-surface, status and brand-action pair in both themes and fails the build when one is too low. Some brand colours collide in hue with a status colour; those exceptions are listed in the test, and the rule for each is documented in `docs/foundations/COLOR.md`.

## Images and charts

Charts read their series colours from tokens, so they re-colour with the theme. Photographs and illustrations do not change; give logos that need it a dark variant. The official brand marks are rendered by `ProductMark` from their spec and pick the right colours for the theme.
