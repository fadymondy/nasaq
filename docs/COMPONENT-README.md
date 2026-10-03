# Component README spec

Every component folder in `packages/web/src/components/<name>/` has a `README.md`. It is the
component's manual, written so that a person **or an AI agent** can use the component correctly
without reading its source. The Nasaq MCP server (`packages/mcp`) serves these files, and
`pnpm check:components` fails when a component has no README, invalid frontmatter, or no story.

Write for someone who has never seen Nasaq: say what the component is for, what not to use it for, and
show code that works as pasted. Everything must match the source; if the code and the README disagree,
the README is wrong.

## Frontmatter (required, YAML)

```yaml
---
name: product-switcher            # the folder name
title: ProductSwitcher            # the main export, as imported
category: navigation              # one of the categories below
status: stable                    # stable | beta | experimental
summary: App launcher grid showing each installed product's official mark; registers "Switch to…" commands.
exports: [ProductSwitcher, SidebarProducts, ProductIcon, useProductCommands, Product]
related: [command-palette, workspace-switcher, app-shell]
story: components-product-switcher   # Storybook id prefix (title lower-kebab)
base-ui: [popover]                # Base UI modules used; [] if none
keywords: [apps, launcher, products, brand, grid]
---
```

Categories: `layout`, `navigation`, `actions`, `forms`, `data-display`, `feedback`, `overlays`,
`brand`, `typography`, `utilities`.

## Sections (this order; omit a section only when it truly does not apply)

1. `# <Title>`: one paragraph on what it is and the problem it solves.
2. `## When to use` / `## When not to use`: bullets. Name the component to use instead.
3. `## Import`: `import { … } from "@fadymondy/nasaq/web";` (inside this repo: `@nasaq/web`).
4. `## Quick start`: the smallest complete, working example.
5. `## Anatomy`: the parts and how they nest (a small tree), with each part's `data-slot`.
6. `## API`: one table per export: `Prop | Type | Default | Description`. Include hooks
   (signature and return value) and exported types.
7. `## Examples`: 2–5 realistic examples (variants, composition, controlled state, Arabic copy).
8. `## Accessibility`: a keyboard table (`Key | Action`) and ARIA roles/labels. Say which
   labels the caller must localise.
9. `## RTL & i18n`: mirroring, bidi isolation, numerals, built-in Arabic strings.
10. `## Styling & tokens`: the tokens it uses, `data-*` state attributes to target, and how to extend
    it with `className`. Never tell people to override colours with raw hex.
11. `## Do / Don't`: short bullets taken from the design rules (docs/foundations).
12. `## Related`: links to sibling READMEs (`../command-palette/README.md`).
13. `## Lab`: `https://docs.nasaqui.com/?path=/docs/<story>--docs`.

## Style

- Plain, direct sentences. No marketing language.
- Code blocks are `tsx` and complete: imports included, no `...` inside JSX that would stop them
  compiling.
- Name real props only. Types are copied from the source.
- Bilingual where copy appears: show English, and Arabic where direction matters.
