# Install with the shadcn CLI

Nasaq is published as a [shadcn registry](https://ui.shadcn.com/docs/registry). The CLI copies a component's source into your project, adds its dependencies and rewrites its imports to your aliases, so the code is yours to read and edit. Registry items are plain JSON at `https://docs.nasaqui.com/r/{name}.json`; the full index is `https://docs.nasaqui.com/registry.json`.

You need a React 19 project with Tailwind CSS v4 and a `components.json` (run `npx shadcn@latest init` if you do not have one). Next.js, Vite and any other framework the shadcn CLI supports will do.

## 1. Add the `@nasaq` namespace

Add the registry to `components.json` once. The CLI fills in the `{name}` placeholder.

```json
{
  "registries": {
    "@nasaq": "https://docs.nasaqui.com/r/{name}.json"
  }
}
```

Without the namespace you can still install by URL, for example `npx shadcn@latest add https://docs.nasaqui.com/r/button.json`. Every command below works both ways.

## 2. Add the `nasaq` preset

The `nasaq` item is a `registry:style`. It carries the tokens and everything shared by all components. Every component item depends on it, so the CLI installs it the first time you add anything; add it explicitly to see what it does.

```bash
npx shadcn@latest add @nasaq/nasaq
```

It does four things:

- Writes the `--nq-*` tokens (light, dark, all eleven brands, three densities, two expressions) and the shadcn bridge variables (`--background`, `--primary`, `--border` and the rest) into your global CSS. shadcn's own components keep working and pick up Nasaq's colours.
- Adds `lib/utils.ts` (`cn`), `lib/nasaq/tokens.ts`, `lib/nasaq/brands.ts` (brand data and the official marks) and `lib/nasaq/hotkey.ts`.
- Adds `components/nasaq/nasaq-provider.tsx` and `theme-script.ts`.
- Adds the npm packages those files need.

Then wrap your app in the provider and load the fonts. See [Project setup](?page=docs-installation-project-setup).

## 3. Add a component

```bash
npx shadcn@latest add @nasaq/button
npx shadcn@latest add @nasaq/data-table @nasaq/command-palette
```

The item name is the component's folder name, shown on every component's docs page and in the [catalogue](?page=docs-catalogue-components). The CLI resolves `registryDependencies` for you: adding `data-table` also adds `table`, `button`, `checkbox`, `context-menu` and the rest of what it imports, each written to `components/ui/`.

```tsx
import { Button } from "@/components/ui/button";

export function Save() {
  return <Button>Save changes</Button>;
}
```

Useful flags: `--overwrite` to replace files that exist, `--dry-run` to print what would change, `--diff` to compare with your copy.

## 4. Add a brand theme

There is one `registry:theme` item per brand: `theme-nasaq`, `theme-fadymondy`, `theme-mahaam`, `theme-zekra`, `theme-moharrik`, `theme-seatfor`, `theme-health-debug`, `theme-circlexo`, `theme-hosbah` and `theme-orchestra`. A theme item sets that brand's colours as the default in `:root`.

```bash
npx shadcn@latest add @nasaq/theme-mahaam
```

To switch brands at runtime instead, keep the preset and pass `brand="mahaam"` to `NasaqProvider`. See [Theming and brands](?page=docs-guides-theming-and-brands).

## Explore from the terminal

```bash
npx shadcn@latest search @nasaq -q "date"
npx shadcn@latest view @nasaq/button
```

An AI assistant can browse the same registry through the shadcn MCP server, or through [the Nasaq MCP server](?page=docs-guides-mcp-server), which also serves the manuals.

## Notes

- Registry items never depend on the `@fadymondy/nasaq` npm package. Pick one route per project, because mixing them gives two copies of every component.
- The registry is static JSON, so it can be hosted anywhere, and browsers may fetch it cross-origin (`Access-Control-Allow-Origin: *`).
- Font files are not part of any item. See [Project setup](?page=docs-installation-project-setup).
