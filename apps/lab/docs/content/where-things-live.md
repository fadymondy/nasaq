# Where things live

Nasaq is served from three hosts, each with one job, plus the repository and the npm packages.

| What | Where |
| --- | --- |
| Documentation and live component lab (this site) | https://nasaq-ui.fadymondy.com |
| shadcn registry index | https://nasaq-ui.fadymondy.com/registry.json |
| shadcn registry item | `https://nasaq-ui.fadymondy.com/r/{name}.json`, for example [`/r/button.json`](/r/button.json) |
| Landing page | https://nasaq.fadymondy.com |
| MCP server (streamable HTTP) | https://nasaq-mcp.fadymondy.com/mcp |
| MCP health check | https://nasaq-mcp.fadymondy.com/health |
| Source code, issues, releases | https://github.com/fadymondy/nasaq |
| npm: components, tokens, brands | `@fadymondy/nasaq` |
| npm: MCP server | `@fadymondy/nasaq-mcp` |

## Inside this site

| Section of the sidebar | Contents |
| --- | --- |
| Docs | These pages |
| Foundations | Colour, typography, icons and bidi, motion, layout |
| Brand | Brand matrix and product marks |
| Components | One folder per category, A to Z. Each holds its components (manual and stories), then a **Pages** folder of full screens built from them and, where there are any, **Patterns** |

Story URLs are stable and worth linking to: `/?path=/story/<id>` opens a story, `/?path=/docs/<id>--docs` opens a component's docs page, and `/iframe.html?id=<id>&viewMode=story` is the bare canvas without the Storybook chrome, useful for embedding or screenshots. Add `&globals=theme:dark;locale:ar` to a canvas URL to pick the theme and locale.

## Machine-readable

- `/index.json` lists every story and docs entry.
- `/registry.json` and `/r/*.json` are the shadcn registry. They are static files with `Access-Control-Allow-Origin: *`.
- The MCP server serves the same manuals to AI tools. See [The MCP server](?page=docs-guides-mcp-server).

## In the repository

| Path | What is there |
| --- | --- |
| `packages/web/src/components/<name>/` | A component: source and `README.md` manual |
| `packages/tokens/src/dtcg/` | Token source |
| `apps/lab/stories/` | Every story and page template |
| `apps/lab/docs/` | These docs |
| `docs/foundations/` | Design rules |
| `scripts/` | Registry build, validate and smoke test |

See [Contributing](?page=docs-project-contributing).
