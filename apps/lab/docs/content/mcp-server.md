# The MCP server

The Nasaq MCP server lets an AI assistant (Claude Code, Claude, Cursor and any other [Model Context Protocol](https://modelcontextprotocol.io) client) work with the design system properly: list the components, find the right one for a need, and read its full manual, including props, examples, accessibility and RTL rules. It also serves the design rules, the tokens and the setup steps.

It is read-only and needs no account or API key.

## Connect to the hosted server

Endpoint: `https://nasaq-mcp.fadymondy.com/mcp` (streamable HTTP, no authentication).

**Claude Code**

```bash
claude mcp add --transport http nasaq https://nasaq-mcp.fadymondy.com/mcp
```

Add `--scope user` to have it in every project, or `--scope project` to write it to the repo's `.mcp.json` so your team gets it too.

**Claude Desktop and claude.ai**

Open Settings, then Connectors, then Add custom connector. Name it `Nasaq` and paste the URL above. No sign-in is needed.

**Cursor**

Add it in Settings, MCP, or put this in `~/.cursor/mcp.json` (or `.cursor/mcp.json` in a project):

```json
{ "mcpServers": { "nasaq": { "url": "https://nasaq-mcp.fadymondy.com/mcp" } } }
```

**Other clients**

Most clients that read a JSON config accept this shape, and some use `servers` instead of `mcpServers`:

```json
{ "mcpServers": { "nasaq": { "type": "http", "url": "https://nasaq-mcp.fadymondy.com/mcp" } } }
```

A client that only speaks stdio can bridge the URL: `npx -y mcp-remote https://nasaq-mcp.fadymondy.com/mcp`.

To check the server is up, open `https://nasaq-mcp.fadymondy.com/health`. It returns the version and catalogue counts.

## Run it locally over stdio

The same tools, on your machine and offline:

```bash
claude mcp add nasaq -- npx -y @fadymondy/nasaq-mcp
```

```json
{ "mcpServers": { "nasaq": { "command": "npx", "args": ["-y", "@fadymondy/nasaq-mcp"] } } }
```

> The `@fadymondy/nasaq-mcp` package is published together with `@fadymondy/nasaq`. Until then, use the hosted server or run it from a clone of the repository with `pnpm mcp`.

## What it offers

| Tool | Returns |
| --- | --- |
| `get_setup` | Install commands, CSS imports, `NasaqProvider` props and an app skeleton. Call this first. |
| `list_components` | Every component grouped by category, with its summary and exports. Filter by `category` or `query`. |
| `search_components` | Components ranked for a need in words: "switch between products", "empty state". |
| `get_component` | One component by folder name, title or any export. Includes the manual (`readme`), `api`, `examples`, `source` or its `story`, the import line and the shadcn install command. |
| `get_foundation` | The design rules: `color`, `layout`, `architecture`, `component-readme-spec`, `setup`. |
| `list_tokens` | The `--nq-*` custom properties with their values per theme, brand and density. |

It also exposes resources: `nasaq://catalog` and `nasaq://components/{name}`.

## Try it

Once connected, ask your assistant something like:

- "Using Nasaq, build a settings page with a sidebar, a profile form and a danger zone."
- "Which Nasaq component should I use for a searchable multi-select?"
- "Add Nasaq's `data-table` to this project and show me how to make a column sortable."

The assistant will call `get_setup`, search the catalogue, read the manual for the right component, and give you the `npx shadcn@latest add @nasaq/<name>` command.

## Run your own copy of the HTTP server

```bash
npx -y -p @fadymondy/nasaq-mcp nasaq-mcp-http
```

`HOST` (default `127.0.0.1`) and `PORT` (default `3000`) control where it listens. The server is stateless, allows any origin (the data is public) and keeps no sessions. The package README lists the endpoints and settings.

## Privacy

Requests carry a tool name and its arguments, and nothing else. No credentials are involved. The server reads only its bundled catalogue and never a path supplied by a request.
