<div align="center">

<img src="packages/brands/assets/nasaq-mark.svg" alt="Nasaq" width="88" />

# Nasaq · نسق

**One product language for every surface: 392 components, design tokens and 17 brand themes, with Arabic and RTL built in.**

[![CI](https://github.com/fadymondy/nasaq/actions/workflows/ci.yml/badge.svg)](https://github.com/fadymondy/nasaq/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@fadymondy/nasaq.svg)](https://www.npmjs.com/package/@fadymondy/nasaq)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/fadymondy/nasaq?style=social)](https://github.com/fadymondy/nasaq/stargazers)

[Docs](https://docs.nasaqui.com) · [Website](https://nasaqui.com) · [Discussions](https://github.com/fadymondy/nasaq/discussions) · [Contributing](CONTRIBUTING.md)

</div>

One product language for every surface: 392 React components, a token system, 17 brand themes and full page templates, built on Base UI and Tailwind CSS v4, with Arabic and right-to-left layout treated as a first-class case. Install it as a shadcn registry (you own the source) or as the npm package `@fadymondy/nasaq`.

| | |
| --- | --- |
| Documentation and live components | https://docs.nasaqui.com |
| shadcn registry | https://docs.nasaqui.com/r/{name}.json (index: `/registry.json`) |
| MCP server (for AI tools) | https://mcp.nasaqui.com/mcp |
| Landing page | https://nasaqui.com |

![Introduction page, light](docs/screenshots/docs-introduction-light.webp)

![Component catalogue, dark](docs/screenshots/docs-catalogue-dark.webp)

![A whole storefront built from Nasaq components (Pages / Store / Journey)](docs/screenshots/store-journey.webp)

## Status

Version 1.4.0, published on npm as [`@fadymondy/nasaq`](https://www.npmjs.com/package/@fadymondy/nasaq). The components are in daily use in the author's own products. Each component's manual carries a status of stable, beta or experimental: stable APIs follow semver, beta ones may still gain props.

## Quick start: shadcn registry

Works in any project that already runs shadcn (`components.json` present).

```bash
# once: the Nasaq preset (tokens, theme, provider)
npx shadcn@latest add https://docs.nasaqui.com/r/nasaq.json

# then any component by URL
npx shadcn@latest add https://docs.nasaqui.com/r/button.json

# a brand theme (11 available, theme-<brand>)
npx shadcn@latest add https://docs.nasaqui.com/r/theme-nasaq.json
```

To use the short `@nasaq/<name>` form, add the namespace to `components.json`:

```json
{
  "registries": {
    "@nasaq": "https://docs.nasaqui.com/r/{name}.json"
  }
}
```

```bash
npx shadcn@latest add @nasaq/button
```

The registry serves plain JSON with `Access-Control-Allow-Origin: *`, so it also works from other tools.

## Quick start: npm

```bash
pnpm add @fadymondy/nasaq
```

```tsx
import { Button, NasaqProvider } from "@fadymondy/nasaq/web";
import "@fadymondy/nasaq/web/styles.css";
```

Entry points: `/web`, `/web/styles.css`, `/tokens`, `/tokens.css`, `/theme.css`, `/brands`, `/native` (React Native) and `/electron`.

## MCP server

Lets Claude, Cursor and other MCP clients search the components and read their manuals.

```bash
# hosted (streamable HTTP)
claude mcp add --transport http nasaq https://mcp.nasaqui.com/mcp

# or local over stdio
claude mcp add nasaq -- npx -y @fadymondy/nasaq-mcp
```

Tools: `get_setup`, `list_components`, `search_components`, `get_component`, `get_foundation`, `list_tokens`. The setup for Claude, Cursor and other clients is on the docs site under Docs, Guides, MCP server. The stdio package is likewise not on npm until it is released.

## Repository layout

```
apps/
  lab/          Storybook 10: the documentation site and every story; builds the static site and the registry
  site/         Next.js landing/brand site and the older registry builder
packages/
  web/          the React components (@nasaq/web, source of the registry)
  tokens/       DTCG design tokens, generated CSS and typed module
  brands/       brand manifests and marks
  icons/        icon set
  native/       React Native kit
  electron/     Electron window chrome
  feedback/     in-app feedback reporter
  mcp/          the MCP server
  nasaq/        the published package, @fadymondy/nasaq
  tooling/      lint and check tooling
scripts/        registry build and validation, component checks
docs/           architecture notes and design audits
```

## Development

Node 22 or newer and pnpm 11.

```bash
pnpm install
pnpm lab                                   # Storybook on http://localhost:6106

pnpm typecheck
pnpm lint                                  # logical properties only, no raw hex colours
pnpm test                                  # includes the token contrast matrix
pnpm check:components                      # every component has a valid README and a story

pnpm --filter @nasaq/site registry         # build and validate the shadcn registry
pnpm --filter @nasaq/lab build             # static docs + registry -> apps/lab/storybook-static
pnpm --filter @nasaq/lab serve             # serve that folder on http://127.0.0.1:6108
```

The static build is one folder: the docs, every story, the demo images, `r/*.json` and `registry.json`. `apps/lab/scripts/serve-static.mjs` is a dependency-free server for it (per-path cache headers and CORS for the registry files); see `docs/ARCHITECTURE.md` for the hosting notes. To run it as a long-lived service: `node apps/lab/scripts/serve-static.mjs --port 6108 --host 0.0.0.0`.


## Contributing

Contributions are welcome: bug reports, accessibility and RTL fixes, docs and new components. Read
[CONTRIBUTING.md](CONTRIBUTING.md) for setup, conventions and the DCO sign-off, then look for
[`good first issue`](https://github.com/fadymondy/nasaq/labels/good%20first%20issue).

## Community

- [GitHub Discussions](https://github.com/fadymondy/nasaq/discussions): questions, ideas, show and tell
- [Issues](https://github.com/fadymondy/nasaq/issues/new/choose): bugs and feature requests
- Security reports: see [SECURITY.md](SECURITY.md)

Please follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Fonts, logos and brands

The MIT licence covers the source code and documentation. It does **not** cover the items below.

- **Fonts.** The token stacks name Inter (Latin) and IBM Plex Sans Arabic (Arabic), both SIL OFL, plus JetBrains Mono for code. The packages load none of them, so you choose how; the docs site self-hosts IBM Plex Sans Arabic (300/400/500) in `apps/lab/public/fonts` with its licence. If you deploy Nasaq you are responsible for the licences of the fonts you load.
- **Logos and brand marks.** The sign-in components (`oauth-buttons`, `connected-accounts`) draw the official Google, GitHub, Apple and Microsoft marks, unmodified, in the providers' own colours, following each provider's branding guidelines. They are trademarks of their owners, are never recoloured, mirrored or redrawn, and are not licensed to you by this repository: follow each provider's guidelines in your own product. The brand manifests (`packages/brands`) hold the marks of the author's own products and the 17 brand themes, drawn as data to demonstrate theming; do not use one for a product you do not own.
- **Images.** The storefront demos use simple SVG illustrations under `apps/lab/public/store`, drawn for the demos so they render. They are not a product-photo library.

If you believe something here is used in a way its owner does not allow, please tell us through [SECURITY.md](SECURITY.md) and it will be removed.

## Credits

Built by Fady Mondy. Made with [Base UI](https://base-ui.com), [Tailwind CSS](https://tailwindcss.com), [shadcn/ui](https://ui.shadcn.com) (registry format and component anatomy), [Storybook](https://storybook.js.org), [Style Dictionary](https://styledictionary.com) and the [DTCG token format](https://www.w3.org/community/design-tokens/).

## Follow the build

Built in public by **[Fady Mondy](https://github.com/fadymondy)** (فادي مندي): open source, AI agents & MCP, Laravel and Go.
Release notes, deep-dives and behind-the-scenes go out here first:

[![Follow on X](https://img.shields.io/badge/X-@fadymondy-0B1429?style=flat-square&logo=x&logoColor=E2661C)](https://x.com/fadymondy)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Fady%20Mondy-0B1429?style=flat-square&logo=linkedin&logoColor=E2661C)](https://www.linkedin.com/in/fadymondy/)
[![YouTube](https://img.shields.io/badge/YouTube-@FadyMondy-0B1429?style=flat-square&logo=youtube&logoColor=E2661C)](https://www.youtube.com/@FadyMondy?sub_confirmation=1)
[![Bluesky](https://img.shields.io/badge/Bluesky-fadymondy-0B1429?style=flat-square&logo=bluesky&logoColor=E2661C)](https://bsky.app/profile/fadymondy.bsky.social)
[![Threads](https://img.shields.io/badge/Threads-@engfadymondy-0B1429?style=flat-square&logo=threads&logoColor=E2661C)](https://www.threads.com/@engfadymondy)
[![GitHub followers](https://img.shields.io/github/followers/fadymondy?label=Follow&style=flat-square&logo=github&color=0B1429&logoColor=E2661C)](https://github.com/fadymondy)

## Sponsor

Nasaq is made by [Fady Mondy](https://github.com/fadymondy), the creator of
**[ToGO](https://github.com/togo-framework/togo)**, the open-source Go + React framework behind Zekra, Mahaam,
Moharrik and Hosbah. The best way to support Nasaq is to **sponsor ToGO**, which funds the whole ecosystem.

**[Sponsor ToGO →](https://to-go.dev/sponsor)**

<p>
  <a href="https://to-go.dev/sponsor"><img src="https://img.shields.io/badge/Sponsor-ToGO-00ADD8?logo=go&logoColor=white" alt="Sponsor ToGO" /></a>
  <a href="https://github.com/sponsors/fadymondy"><img src="https://img.shields.io/badge/GitHub%20Sponsors-fadymondy-ea4aaa?logo=githubsponsors&logoColor=white" alt="GitHub Sponsors" /></a>
  <a href="https://buymeacoffee.com/fadymondy"><img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-fadymondy-ffdd00?logo=buymeacoffee&logoColor=black" alt="Buy Me a Coffee" /></a>
</p>

## Licence

MIT, © 2026 Fady Mondy. See [LICENSE](LICENSE).
