# The token system

Every colour, space, radius, type size and control height in Nasaq is a CSS custom property named `--nq-*`. Components use these and nothing else, which is what lets one component library serve ten brands, two themes, three densities and two expressions.

## Where they come from

The source of truth is a set of [DTCG](https://design-tokens.github.io/community-group/format/) JSON files in `packages/tokens/src/dtcg`:

| File | Holds |
| --- | --- |
| `primitives.json` | Raw palettes and scales (ink, ivory, red, green, blue, spacing) |
| `theme.light.json`, `theme.dark.json` | Semantic tokens: surface, line, text, status, tags, focus |
| `brands.json` | Brand and action colours for each brand, light and dark |
| `densities.json` | Control, row and header heights, page padding |
| `expressions.json` | Radii and the hatch texture |
| `typography.json` | Type scale for Latin and Arabic |

Style Dictionary turns them into `tokens.css` (custom properties), `theme.css` (the Tailwind v4 `@theme` mapping) and a typed JavaScript module. Nothing in `dist` is edited by hand.

## Layers

1. **Primitives** (`--nq-color-ink-800`). Raw values. Components never use these.
2. **Semantic tokens** (`--nq-bg`, `--nq-surface`, `--nq-fg`, `--nq-line`, `--nq-success`). Defined for light and dark, selected by `data-theme`. This is the layer components use.
3. **Brand** (`--nq-brand`, `--nq-action`, `--nq-on-action`). Selected by `data-brand`. See [Theming and brands](?page=docs-guides-theming-and-brands).
4. **Density and expression** (`--nq-control`, `--nq-row`, `--nq-radius-card`). Selected by `data-density` and `data-expression`.
5. **shadcn bridge** (`--background`, `--primary`, `--border`). Aliases of the semantic tokens, so shadcn components and third-party code that expect those names follow the theme.

## The ones you will use

| Group | Tokens |
| --- | --- |
| Surfaces | `--nq-bg`, `--nq-surface`, `--nq-surface-raised`, `--nq-surface-overlay`, `--nq-surface-soft` |
| Text | `--nq-fg`, `--nq-fg-body`, `--nq-fg-muted` |
| Lines | `--nq-line`, `--nq-line-strong` |
| Interaction | `--nq-hover`, `--nq-selected`, `--nq-focus` |
| Roles | `--nq-brand`, `--nq-action`, `--nq-accent`, `--nq-success`, `--nq-warning`, `--nq-danger`, `--nq-info` (the four statuses each have `-text` and `-soft` variants) |
| Size | `--nq-control`, `--nq-control-sm`, `--nq-row`, `--nq-header`, `--nq-page-pad` |
| Shape | `--nq-radius-surface`, `--nq-radius-card`, `--nq-radius-control`, `--nq-radius-floating` |
| Type | `--nq-type-{display,h1,h2,h3,body,body-sm,label,caption,eyebrow,code}-{size,line,weight,tracking}`, `--nq-font-sans`, `--nq-font-arabic`, `--nq-font-mono` |

The full list, with values per theme, brand and density, is served by the [MCP server](?page=docs-guides-mcp-server) (`list_tokens`) and by the generated `tokens.css`.

## Using them

In Tailwind, through the `theme.css` mapping:

```tsx
<div className="rounded-[var(--nq-radius-card)] border border-nq-line bg-nq-surface p-4 text-nq-fg">
  <p className="text-body-sm text-muted-foreground">Uses tokens only</p>
</div>
```

In CSS, or in a style prop:

```css
.panel {
  background: var(--nq-surface);
  border: 1px solid var(--nq-line);
  padding-inline: var(--nq-page-pad);
}
```

In JavaScript (charts, canvas, native):

```ts
import { color, space, themes } from "@fadymondy/nasaq/tokens";
```

## Rules

- **Roles do not stand in for each other.** Brand is identity, action is the one primary button, accent is the gold marker, status is the state of a thing, tags are user categories.
- **No raw hex in components.** The repo lint rejects it, so a theme change reaches everything.
- **Every status has a label and its own icon.** Colour is never the only signal.
- **Contrast is tested.** A unit test computes the contrast of the token pairs in every theme and brand and fails on regressions.

The reasoning, and the surface-level and card rules, are in the repo's `docs/foundations/COLOR.md` and `LAYOUT.md`.
