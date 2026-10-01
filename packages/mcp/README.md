# @fadymondy/nasaq-mcp

MCP server for **Nasaq (نسق)**, a bilingual (English/Arabic, LTR/RTL) React design system built on Base UI and
Tailwind v4. It lets an AI assistant list Nasaq's components, find the right one for a need, and read its full
manual: props, examples, accessibility, RTL rules, source and Storybook story. It also serves the design rules,
the design tokens and the setup steps.

The server is read-only and needs no account or API key. Use it hosted (nothing to install) or locally over stdio.

## Connect

### Hosted (recommended)

Endpoint: **`https://nasaq-mcp.fadymondy.com/mcp`** (streamable HTTP, no authentication).

**Claude Code**

```bash
claude mcp add --transport http nasaq https://nasaq-mcp.fadymondy.com/mcp
```

Add `--scope user` to make it available in every project, or `--scope project` to write it to the repo's `.mcp.json`.

**Claude Desktop and claude.ai**

Settings, Connectors, Add custom connector. Name it `Nasaq` and paste the URL above. No sign-in is needed.

**Cursor**

Settings, MCP, Add new MCP server, or edit `~/.cursor/mcp.json` (or `.cursor/mcp.json` in a project):

```json
{ "mcpServers": { "nasaq": { "url": "https://nasaq-mcp.fadymondy.com/mcp" } } }
```

**Any other client**

Clients that read a JSON config generally accept one of these shapes:

```json
{ "mcpServers": { "nasaq": { "type": "http", "url": "https://nasaq-mcp.fadymondy.com/mcp" } } }
```

```json
{ "servers": { "nasaq": { "type": "http", "url": "https://nasaq-mcp.fadymondy.com/mcp" } } }
```

Clients that only speak stdio can bridge the URL with `npx -y mcp-remote https://nasaq-mcp.fadymondy.com/mcp`.

Check it is up: `https://nasaq-mcp.fadymondy.com/health` returns the version and catalogue counts.

### Local (stdio)

Same tools, runs on your machine, works offline:

```bash
claude mcp add nasaq -- npx -y @fadymondy/nasaq-mcp
```

```json
{ "mcpServers": { "nasaq": { "command": "npx", "args": ["-y", "@fadymondy/nasaq-mcp"] } } }
```

## Tools

| Tool | What it returns |
| --- | --- |
| `get_setup({ framework? })` | Install command, CSS imports, provider, app skeleton, and the shadcn registry setup. Call first. `framework`: `react` (default), `shadcn`, `inertia`, `inertia-vue`, `html`, `alpine`, `vue`, `blade`, `livewire`, `filament`, `laravel`, `tomatophp`. |
| `list_components({ category?, query?, framework? })` | Every component grouped by category, with its summary and exports. With a non-React `framework`, only the components that exist in that stack. |
| `search_components({ query, limit? })` | Components ranked for a need in words: "switch between products", "empty state". |
| `get_component({ name, include? })` | One component. `name` is the folder (`app-shell`), title (`AppShell`) or any export (`SidebarItem`). `include`: `readme` (default), `api`, `examples`, `source`, `story`, `all`. Also gives the import line and the shadcn install command. `framework` returns that stack's markup instead (Vue `Nq*`, Blade `<x-nq.*>`, Alpine, plain HTML, shadcn imports). |
| `get_foundation({ topic? })` | Design rules: `color`, `layout`, `architecture`, `component-readme-spec`, `setup`. Omit `topic` to list them. |
| `list_tokens({ prefix?, limit? })` | `--nq-*` custom properties with their value per theme, brand and density. |

Resources: `nasaq://catalog` (JSON index) and `nasaq://components/{name}` (each README).

Categories: `layout`, `navigation`, `actions`, `forms`, `pickers`, `data-display`, `charts`, `commerce`,
`collaboration`, `auth`, `account`, `developer`, `ai`, `workflow`, `analytics`, `crm`, `editors`, `health`,
`feedback`, `overlays`, `brand`, `typography`, `utilities`.

## Links

- Docs and live examples: https://nasaq-ui.fadymondy.com
- shadcn registry: `https://nasaq-ui.fadymondy.com/r/{name}.json` (namespace `@nasaq`, e.g. `npx shadcn@latest add @nasaq/button`)
- Source: https://github.com/fadymondy/nasaq

## Run the HTTP server yourself

```bash
npx -y -p @fadymondy/nasaq-mcp nasaq-mcp-http     # or: npx -y @fadymondy/nasaq-mcp --http
```

| Env | Default | Meaning |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | Interface to bind. Use `0.0.0.0` only if nothing else fronts it. |
| `PORT` | `3000` | Port. |
| `MAX_BODY_BYTES` | `262144` | Largest accepted request body; bigger gets `413`. |
| `NASAQ_LIVE` | unset | `1` reads the monorepo live instead of `catalog.json` (development). |

Endpoints:

| Route | Behaviour |
| --- | --- |
| `POST /mcp` | JSON-RPC. Stateless: no session, one fresh server per request, plain JSON responses (no SSE), so reverse-proxy buffering cannot stall it. |
| `GET /mcp`, `DELETE /mcp` | `405` (there are no sessions or server-initiated streams). |
| `GET /health` | `{ status, name, version, components, foundations, tokens, catalogGeneratedAt }`. |
| `GET /` | A short page saying what this is and how to connect. |
| `OPTIONS *` | CORS preflight; any origin is allowed (the data is public, no cookies or credentials are involved). |

The server reads only the bundled `catalog.json`; no request parameter is ever used as a file path. When you put it behind
Nginx or Nginx Proxy Manager, proxy to `HOST:PORT`, pass `Host`, and it needs no special streaming settings
(it sends `X-Accel-Buffering: no` anyway). It keeps idle connections open 65 seconds.

## Inside the Nasaq repo

The repo's `.mcp.json` / `.mcp.example.json` register the stdio server from source:

```json
{ "mcpServers": { "nasaq": { "type": "stdio", "command": "node", "args": ["packages/mcp/src/server.mjs"] } } }
```

There the stdio server reads the repo **live**, so README and source edits show up on the next call with no rebuild.
Elsewhere it uses the `catalog.json` snapshot bundled in the package. To point it at a checkout, set `NASAQ_ROOT=/path/to/nasaq`.

## How the catalogue is built

`src/catalog.mjs` scans `packages/web/src/components/<name>/`:

- `README.md`: YAML frontmatter (name, title, category, status, summary, exports, related, story, base-ui,
  keywords) plus the manual. The format is in [`docs/COMPONENT-README.md`](https://github.com/fadymondy/nasaq/blob/main/docs/COMPONENT-README.md).
- `<name>.tsx`: source, and its real exports, compared with the documented ones.
- `apps/lab/stories/*.stories.tsx`: matched through the frontmatter `story` id.
- `docs/foundations/*.md`, `docs/COMPONENT-README.md`, `docs/ARCHITECTURE.md`: foundations. `docs/audits/**` is internal
  and is never included.
- `packages/tokens/dist/tokens.css`: tokens.

`pnpm check:components` (repo root) runs the same scan and fails on any missing README, bad frontmatter, export
drift or missing story. Keep it green when adding a component.

## Scripts

```bash
pnpm --filter @fadymondy/nasaq-mcp build       # write catalog.json (run before publishing)
pnpm --filter @fadymondy/nasaq-mcp test        # stdio and HTTP transports
pnpm --filter @fadymondy/nasaq-mcp start:http  # HTTP server (HOST/PORT from env)
pnpm mcp                                       # (repo root) stdio server by hand
```

MIT © Fady Mondy
