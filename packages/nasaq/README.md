# @fadymondy/nasaq

**Nasaq (نسق)** is one product language for every surface: React 19 components built on [Base UI](https://base-ui.com) and Tailwind CSS v4, design tokens, brand marks, a React Native kit and Electron window chrome. Arabic and RTL are first-class, not an afterthought.

- Hundreds of components: buttons, forms, data tables, charts, commerce, auth, AI, workflow, and full page blocks.
- Tokens as CSS variables (`--nq-*`), themeable per brand (`data-brand`), light and dark, three densities.
- Logical properties everywhere: the same component is correct in English and Arabic.
- Also on the shadcn registry, if you prefer to own the source (see below).

Docs and live component lab: https://nasaq-ui.fadymondy.com · Landing: https://nasaq.fadymondy.com

## Install

```sh
npm install @fadymondy/nasaq react react-dom
npm install tailwindcss @tailwindcss/postcss   # Tailwind v4 (or @tailwindcss/vite)
```

Requires React 19+ and Tailwind CSS 4. `react-native`, `react-native-svg`, `expo-haptics` and `electron` are optional peers, needed only for `/native` and `/electron`.

There is no root import. Use the subpaths listed below.

## CSS setup (required)

The components use Tailwind utility classes and `--nq-*` tokens. Tailwind does not scan `node_modules`, so tell it where the package lives. In your Tailwind entry CSS (for Next App Router, `app/globals.css`):

```css
@import "tailwindcss";
@import "@fadymondy/nasaq/tokens.css";
@import "@fadymondy/nasaq/theme.css";
@import "@fadymondy/nasaq/web/styles.css";
@source "../node_modules/@fadymondy/nasaq/dist/web";
```

The `@source` path is relative to the CSS file: adjust the `../` so it reaches your `node_modules` (in a monorepo, the hoisted `node_modules`). Without the `@source` line the components render unstyled, because their classes are never generated.

1. `tokens.css`: the `--nq-*` variables (colour, type, spacing, density, expression, brand).
2. `theme.css`: maps the tokens into Tailwind's `@theme` (so `bg-card`, `text-muted-foreground`, `rounded-card`, `h-control` work) and the `dark:` variant.
3. `web/styles.css`: base styles (fonts, scrollbars, focus).

### Provider and no-flash theme

```tsx
// app/layout.tsx (Server Component)
import { NasaqProvider, nasaqThemeScript } from "@fadymondy/nasaq/web";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: nasaqThemeScript() }} />
      </head>
      <body>
        <NasaqProvider brand="nasaq">{children}</NasaqProvider>
      </body>
    </html>
  );
}
```

Under a strict Content Security Policy an inline script needs a nonce or a hash. Two options:

```tsx
// 1. A nonce: spread the props and pass the per-request nonce (it must be in script-src).
import { nasaqThemeScriptProps } from "@fadymondy/nasaq/web";
<script {...nasaqThemeScriptProps("system", { nonce })} />

// 2. A static file, allowed by script-src 'self': no nonce, no inline code.
<script src="/nasaq-theme.js" data-default-theme="system" />
```

The static file ships as `@fadymondy/nasaq/theme-script.js`. Copy it to your public folder (or serve it from
`node_modules/@fadymondy/nasaq/dist/theme-script.js`). It reads the default theme from `data-default-theme` and must be a
classic, synchronous script in `<head>` (no `async` or `defer`) so it runs before first paint.

`NasaqProvider` sets `data-brand`, `data-theme`, `data-density`, `data-expression`, `dir` and `lang` on `<html>` and persists the theme.

### Fonts

The package ships no font files. The stacks are `Inter`, `Alexandria` and `JetBrains Mono` (all SIL OFL, so you can load them with `next/font` or `@fontsource/*`) and `Lusail`, which is proprietary and is not bundled: load your own licensed copy or leave it out and Inter takes over. Without any of them, the system fonts are used.

## A first component

```tsx
import { Button, Card, CardContent, CardHeader, CardTitle, Price } from "@fadymondy/nasaq/web";

export default function Page() {
  return (
    <Card>
      <CardHeader><CardTitle>Nasaq mug</CardTitle></CardHeader>
      <CardContent className="flex items-center gap-3">
        <Button>Add to cart</Button>
        <Price amount={49} currency="SAR" />
      </CardContent>
    </Card>
  );
}
```

Components that hold state or use hooks are marked `"use client"` in the built files, so you can render them straight from a Server Component. Props that are functions can only be passed from a Client Component (normal React rule). Hook-based APIs such as `useDataTable` need a `"use client"` file of your own:

```tsx
"use client";
import { DataTable, useDataTable, type DataTableColumn } from "@fadymondy/nasaq/web";

const columns: DataTableColumn<Row>[] = [
  { id: "name", header: "Name", cell: (r) => r.name, sortValue: (r) => r.name },
];

export function Customers({ rows }: { rows: Row[] }) {
  const table = useDataTable({ data: rows, columns, getRowId: (r) => r.id });
  return <DataTable table={table} label="Customers" />;
}
```

Every component has a manual with props, anatomy and examples in the lab and in the MCP (below).

## RTL and Arabic

Pass a locale and everything flips: direction, logical spacing, mirrored directional icons, Arabic type metrics.

```tsx
<NasaqProvider locale="ar">{children}</NasaqProvider>   // dir="rtl" lang="ar" on <html>
```

Built-in strings ship in English and Arabic; components take a `labels` prop to override. Keep code, IDs, URLs and numbers-with-units left-to-right with `dir="ltr"` or `<bdi>`.

## Theming by brand

```tsx
<NasaqProvider brand="mahaam" density="comfortable" expression="native" defaultTheme="dark">
```

Brands: `nasaq`, `fadymondy`, `mahaam`, `zekra`, `moharrik`, `seatfor`, `health-debug`, `circlexo`, `hosbah`, `orchestra`. A brand changes identity and action colour only; status colours keep their meaning. Every pair is contrast-tested. Read the manifests and draw marks from `@fadymondy/nasaq/brands`.

Not one of them? Theme Nasaq with your own colours, no registration: `<NasaqProvider brandColors={{ brand: "#C8283A", accent: "#C9A227" }}>` (each role is "#RRGGBB" or `{ light, dark }`; dark steps and on-colours are derived for contrast; `data-brand="custom"`). Pass your own `logo` to `SidebarBrand`, `AuthLayout` or `ProductMark src`. The native `NasaqProvider` takes the same `brandColors`. See Theming in the lab docs.

## Subpaths

| Import | What |
| --- | --- |
| `@fadymondy/nasaq/web` | React DOM components, `NasaqProvider`, `nasaqThemeScript`, `nasaqThemeScriptProps`, `cn`, commerce helpers |
| `@fadymondy/nasaq/theme-script.js` | The no-flash theme script as a static file, for strict CSPs |
| `@fadymondy/nasaq/tokens` | Typed token values (colour, space, type, density, contrast helpers) |
| `@fadymondy/nasaq/brands` | Brand manifests, mark specs, `markSvg()` |
| `@fadymondy/nasaq/native` | React Native kit (StyleSheet, no styling runtime): provider, `Text`, `Button`, `Screen`, `ProductMark` |
| `@fadymondy/nasaq/electron` | Renderer title bar, drag regions, `useWindowChrome()` |
| `@fadymondy/nasaq/electron/main` | Main process: `windowChrome()` window options, `updateTitleBarOverlay()` |
| `@fadymondy/nasaq/electron/preload` | Preload: `exposeChrome()` |
| `@fadymondy/nasaq/tokens.css` | Token CSS variables |
| `@fadymondy/nasaq/theme.css` | Tailwind v4 `@theme` mapping |
| `@fadymondy/nasaq/web/styles.css` | Web base styles |
| `@fadymondy/nasaq/electron/chrome.css` | Electron drag-region CSS |
| `@fadymondy/nasaq/html` | Vanilla JS for the plain-HTML layer: `start()`, `toast()`, `formatMoney()`, dialogs, menus, tabs, tooltips |
| `@fadymondy/nasaq/html.css` | Tokens + `.nq-*` component classes + base, for any stack |
| `@fadymondy/nasaq/html.unlayered.css` | The same classes without cascade layers or base, for Filament and Tailwind v3 apps |
| `@fadymondy/nasaq/alpine` | Alpine.js plugin: `nqTabs`, `nqMenu`, `nqDialog`, `$nq`, `x-nq-money` |
| `@fadymondy/nasaq/vue` | Vue 3 components (`NqButton`, `NqDialog`, …), `NasaqProvider`, `useToast` |
| `@fadymondy/nasaq/cdn/nasaq.js`, `…/cdn/nasaq-alpine.js` | Script-tag builds (`window.Nasaq`; the Alpine one registers itself) |
| `@fadymondy/nasaq/blade/*` | Laravel Blade components (`<x-nq.button>`, …) |

ESM only, with TypeScript declarations. Heavy libraries (recharts, shiki, tiptap, xyflow, dnd-kit) are regular dependencies and are loaded only when the components that use them are imported; use a bundler that tree-shakes ESM (Next, Vite, esbuild, Rspack).

## Vue, Alpine, plain HTML and Laravel

The same look without React. Each stack renders the same `.nq-*` markup, so a screen looks the same in all of them:

```html
<!-- Any page, no build step -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fadymondy/nasaq/dist/html.css">
<script src="https://cdn.jsdelivr.net/npm/@fadymondy/nasaq/dist/cdn/nasaq-alpine.global.js"></script>
<button class="nq-button" data-variant="primary">Save</button>
```

```ts
// Vue 3
import Nasaq from "@fadymondy/nasaq/vue";
import "@fadymondy/nasaq/html.css";
createApp(App).use(Nasaq).mount("#app");
```

```php
// Laravel: <x-nq.button>, <x-nq.dialog>, … in Blade, Livewire and Filament
Blade::anonymousComponentPath(base_path("node_modules/@fadymondy/nasaq/dist/blade"));
```

Guides: [plain HTML](https://github.com/fadymondy/nasaq/blob/main/docs/frameworks/html.md), [Vue](https://github.com/fadymondy/nasaq/blob/main/docs/frameworks/vue.md), [Alpine](https://github.com/fadymondy/nasaq/blob/main/docs/frameworks/alpine.md), [Laravel, Livewire, Filament and TomatoPHP](https://github.com/fadymondy/nasaq/blob/main/docs/frameworks/filament.md), and the [component kit](https://github.com/fadymondy/nasaq/blob/main/docs/frameworks/kit.md) with each component in every stack. The MCP server serves them too: `get_setup({ framework: "vue" })`, `get_component({ name: "dialog", framework: "alpine" })`.

## Prefer to own the code? Use the shadcn registry

The same components are published as a shadcn registry: files are copied into your app and depend only on Base UI, cva, clsx, tailwind-merge and lucide.

```json
// components.json
{ "registries": { "@nasaq": "https://nasaq-ui.fadymondy.com/r/{name}.json" } }
```

```sh
npx shadcn@latest add @nasaq/button
```

Index: https://nasaq-ui.fadymondy.com/registry.json

## MCP for AI assistants

`@fadymondy/nasaq-mcp` lets an assistant list components and read their manuals, source, stories and tokens.

```sh
npx -y @fadymondy/nasaq-mcp                      # stdio
# hosted (streamable HTTP): https://nasaq-mcp.fadymondy.com/mcp
```

## Links

- Docs and lab: https://nasaq-ui.fadymondy.com
- Site: https://nasaq.fadymondy.com
- Source and issues: https://github.com/fadymondy/nasaq

## Maintainers: publishing

The first publish of each package is done by hand (npm only lets you attach a trusted publisher to a package that exists); later releases are automated by `.github/workflows/release.yml` (changesets, OIDC provenance).

```sh
pnpm install --frozen-lockfile
pnpm typecheck && pnpm lint && pnpm test && pnpm check:components
pnpm check:package                 # build + publint + attw + use-client check
npm login
pnpm release                       # builds both packages, then `changeset publish` (publishes what is not on npm yet)
git push --follow-tags
```

MIT © Fady Mondy
