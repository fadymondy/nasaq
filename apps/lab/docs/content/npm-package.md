# Install from npm

If you would rather take a versioned dependency than copy source, install the package. Everything ships as one package, `@fadymondy/nasaq`, with sub-path entry points.

> **Status.** The package is being prepared for its first release (0.1.0) and its own README is still a placeholder. Until it is on the npm registry, use the [shadcn CLI](?page=docs-installation-shadcn-cli) route. The entry points below are the ones the package declares in its `exports`.

```bash
pnpm add @fadymondy/nasaq
# or: npm install @fadymondy/nasaq / yarn add @fadymondy/nasaq / bun add @fadymondy/nasaq
```

Peer dependencies: `react` and `react-dom` 19 or newer for the web kit. `react-native`, `react-native-svg`, `expo-haptics` and `electron` are optional and only needed for their entry points. The package is ESM only.

## Entry points

| Import | What it is |
| --- | --- |
| `@fadymondy/nasaq/web` | All web components, `NasaqProvider`, `useNasaq`, `cn` |
| `@fadymondy/nasaq/web/styles.css` | Base styles and component CSS |
| `@fadymondy/nasaq/tokens.css` | The `--nq-*` custom properties |
| `@fadymondy/nasaq/theme.css` | Tailwind v4 `@theme` mapping, so `bg-nq-surface`, `text-nq-fg` and friends exist |
| `@fadymondy/nasaq/tokens` | The same tokens as typed JavaScript |
| `@fadymondy/nasaq/brands` | Brand manifests and the official marks |
| `@fadymondy/nasaq/native` | React Native kit, same tokens |
| `@fadymondy/nasaq/electron` | Electron window chrome (`/main`, `/preload` and `/chrome.css` too) |

## Wire up the styles

In your Tailwind entry CSS:

```css
@import "tailwindcss";
@import "@fadymondy/nasaq/tokens.css";
@import "@fadymondy/nasaq/theme.css";
@import "@fadymondy/nasaq/web/styles.css";
@source "../node_modules/@fadymondy/nasaq/dist/web";
```

The `@source` line tells Tailwind to scan the package for class names. The path is relative to the CSS file; in a monorepo, point it at wherever the package is installed.

## Use it

```tsx
import { Button, NasaqProvider } from "@fadymondy/nasaq/web";

export function App() {
  return (
    <NasaqProvider brand="nasaq">
      <Button>Hello</Button>
    </NasaqProvider>
  );
}
```

Continue with [Project setup](?page=docs-installation-project-setup) for fonts and the theme script.

## Versioning

Nasaq follows semantic versioning with the usual 0.x caveat: minor releases may change APIs, and every change is recorded in the [changelog](?page=docs-project-changelog-and-versioning).
