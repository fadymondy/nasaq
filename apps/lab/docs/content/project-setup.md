# Project setup

Both install routes end in the same steps: Tailwind CSS v4 with the Nasaq tokens, a provider around the app, and fonts.

## Requirements

- React 19 or newer.
- Tailwind CSS v4 (CSS-first configuration; there is no `tailwind.config.js`).
- Node 22 or newer for the tooling.

## Tokens and Tailwind

With the shadcn route, the `nasaq` preset writes the tokens into your global CSS. With the npm route, import them:

```css
@import "tailwindcss";
@import "@fadymondy/nasaq/tokens.css";
@import "@fadymondy/nasaq/theme.css";
@import "@fadymondy/nasaq/web/styles.css";
@source "../node_modules/@fadymondy/nasaq/dist/web";
```

`tokens.css` defines the `--nq-*` custom properties. `theme.css` exposes them to Tailwind so utilities such as `bg-nq-surface`, `text-nq-fg` and `border-nq-line` exist. The shadcn bridge variables (`--background`, `--foreground`, `--primary`, `--border`, `--ring`) are defined from the same tokens, so `bg-background` and `bg-primary` also follow the theme and the brand.

## The provider

Wrap the app once, near the root. It sets `data-brand`, `data-theme`, `data-density`, `data-expression`, `lang` and `dir` on `<html>`, and gives every component the Base UI direction context.

```tsx
import { NasaqProvider } from "@/components/nasaq/nasaq-provider"; // npm: "@fadymondy/nasaq/web"

export function Providers({ children }: { children: React.ReactNode }) {
  return <NasaqProvider brand="nasaq">{children}</NasaqProvider>;
}
```

To avoid a flash of the wrong theme on first paint, put the theme script in `<head>`. It reads the saved choice (`localStorage["nasaq-theme"]`) or the system setting and applies the theme before the page renders. In Next.js:

```tsx
import { nasaqThemeScript } from "@/components/nasaq/theme-script"; // npm: "@fadymondy/nasaq/web"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: nasaqThemeScript() }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

`suppressHydrationWarning` is needed because the script changes `<html>` before React hydrates.

## Fonts

The type tokens name font families but never load them, so you choose how:

| Token | Stack | Used for |
| --- | --- | --- |
| `--nq-font-sans` | Inter, Alexandria, system-ui | Latin UI text |
| `--nq-font-arabic` | Lusail, Inter, Alexandria, IBM Plex Sans Arabic, system-ui | UI text when `lang` is `ar` |
| `--nq-font-mono` | JetBrains Mono, Lusail, ui-monospace | Code, tabular figures |

Inter, JetBrains Mono and Alexandria are open-licensed and available from [Fontsource](https://fontsource.org). This site loads them like this:

```bash
pnpm add @fontsource/inter @fontsource/jetbrains-mono @fontsource/alexandria
```

```ts
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/alexandria/400.css";
import "@fontsource/alexandria/500.css";
```

Lusail is the Arabic face of the author's own products. It is licensed to those products and is **not** distributed with Nasaq or bundled into this site. When it is not loaded, the stack falls through to Alexandria, so nothing breaks. If you have a licence for a different Arabic face, put it first in `--nq-font-arabic`.

## Dark mode class

shadcn's components expect a `.dark` class. The provider and the theme script set it together with `data-theme`, so both kinds of selector work. If you use `next-themes` or your own switcher, keep both in step, or let `NasaqProvider` own the theme. See [Dark mode](?page=docs-guides-dark-mode).

## Check it works

```tsx
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function Page() {
  return (
    <main className="p-6">
      <Badge variant="outline">0.1.0</Badge> <Button>It works</Button>
    </main>
  );
}
```

The button takes the brand's action colour (green for the default `nasaq` brand), and the page background is warm ivory in light and deep navy in dark.
