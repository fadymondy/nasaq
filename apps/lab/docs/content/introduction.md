# What Nasaq is

Nasaq (نسق, Arabic for "order" or "system") is a design system for product interfaces: {{components}} React components, a token system, ten brand themes and full-page templates. It is built on Base UI and Tailwind CSS v4, follows shadcn's anatomy and prop names, and treats Arabic and right-to-left layouts as a first-class case, not an afterthought.

This site is the documentation. Every component has a live story and a manual; the sidebar below the docs is the catalogue.

## Who it is for

- Teams that build application UIs (dashboards, admin tools, stores, settings, editors) and want a coherent set of parts that already work together.
- Products that ship in English and Arabic. Layout uses logical properties only (`ms-*`, `pe-*`, `text-start`), Arabic type metrics are their own token set, and components with built-in text ship Arabic strings.
- People who like shadcn's model of owning the source, and people who would rather take a versioned dependency. Nasaq offers both.

## Two ways to install

| | shadcn registry | npm package |
| --- | --- | --- |
| Command | `npx shadcn@latest add @nasaq/button` | `pnpm add @fadymondy/nasaq` |
| You get | The component's source in your repo | A prebuilt, versioned dependency |
| Best for | Apps that want to edit or restyle the code | Apps that want updates by version bump |
| Tokens and brands | The `nasaq` preset item and one `theme-*` item per brand | CSS files and a `/tokens` and `/brands` entry point |

Start with [Install with the shadcn CLI](?page=docs-installation-shadcn-cli) or [Install from npm](?page=docs-installation-npm-package), then read [Project setup](?page=docs-installation-project-setup) for the Tailwind and provider wiring.

## What is in the box

- **Components.** Forms, tables, charts, overlays, navigation, editors, AI and commerce parts. The [component catalogue](?page=docs-catalogue-components) lists all {{components}} by category.
- **Page templates.** Complete screens built only from Nasaq components: an app shell, settings, billing, admin, analytics and a whole storefront (the commerce kit). See [Page templates](?page=docs-catalogue-page-templates).
- **Tokens.** Colour, spacing, type, density and radius as `--nq-*` CSS variables, generated from DTCG JSON. See [The token system](?page=docs-guides-tokens).
- **Brands.** {{brands}} brand themes that swap the brand and action colours and the mark, without touching components. See [Theming and brands](?page=docs-guides-theming-and-brands).
- **Platforms.** A React Native kit (`@fadymondy/nasaq/native`) and Electron window chrome (`@fadymondy/nasaq/electron`) share the same tokens.
- **An MCP server.** Lets Claude, Cursor and other AI tools search components and read their manuals. See [The MCP server](?page=docs-guides-mcp-server).

## How to read this site

- Use the toolbar above the canvas to switch **brand**, **theme** (light, dark, system), **locale** (English, العربية), **direction**, **density** and **expression** on any story, including these pages.
- Every component has a **Docs** tab with its manual (when to use it, API, accessibility, RTL notes) followed by its stories.
- Snippets have a copy button.

## Status

Nasaq is at version **0.1.0**. The components are in daily use in the author's own products, but the API is not yet frozen: expect changes between 0.x releases, recorded in the [changelog](?page=docs-project-changelog-and-versioning). Each component's manual carries a `status` (`stable`, `beta` or `experimental`).

## Licence

MIT, © 2026 Fady Mondy. Fonts and third-party logos are not part of the package; see [Project setup](?page=docs-installation-project-setup#fonts).
