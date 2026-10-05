---
name: mcp-connect
title: McpConnect
category: integrations
status: beta
summary: Install guide for an MCP server with per-client tabs for Claude Code, Claude Desktop, Cursor, VS Code and generic JSON, copyable snippets with a masked token, one-click deep links and a connection test.
exports: [McpConnect, McpConnectProps, McpConnectLabels, McpTestResult, MCP_CLIENTS, McpClientId, McpServerInfo, McpSnippet, TOKEN_PLACEHOLDER, maskToken, mcpSnippet]
related: [api-keys, code-block, tabs, copy-button, alert]
story: components-integrations-mcp-connect
base-ui: [tabs]
keywords: [mcp, model context protocol, claude code, claude desktop, cursor, vscode, install, snippet, deep link, token]
---

# McpConnect

Tell people how to connect their AI tool to your MCP server. One tab per client with the exact command or
JSON, a copy button, a one-click install link where the client has one, the server URL and token, and a
button that tests the connection.

## When to use

- Next to the API keys of a product that ships an MCP server.
- Docs or onboarding pages that need copy-ready client config.

## When not to use

- A general code sample: use [`CodeBlock`](../code-block/README.md).
- Managing the keys themselves: [`ApiKeys`](../api-keys/README.md).

## Import

```tsx
import { McpConnect } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { McpConnect } from "@fadymondy/nasaq/web";

declare const token: string;

export function Connect() {
  return <McpConnect serverUrl="https://mcp.example.com/mcp" serverName="example" token={token} onTest={async () => ({ ok: true, tools: 12 })} />;
}
```

## Anatomy

```
McpConnect                      data-slot="mcp-connect" (Card)
├─ server URL                   CopyField (dir="ltr")
├─ token                        masked field: show/hide, copy
├─ Tabs                         one per client
│  ├─ numbered steps
│  ├─ snippet                   CodeBlock with target (file or Terminal) and copy
│  └─ deep link                 "Add to Cursor" / "Install in VS Code"
└─ Test connection              Alert: success (latency, tools) or failure
```

## API

**McpConnect**: every `div` prop except `children`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `serverUrl` | `string` | required | Streamable HTTP endpoint. |
| `serverName` | `string` | `"nasaq"` | Key the server gets in each config. |
| `token` | `string` | | Put in the snippets. Shown masked; copying gives the real one. Omit for a `YOUR_TOKEN` placeholder. |
| `tokenHeader` | `string` | `"Authorization"` | Sent as `Bearer <token>`. Any other header carries the bare token. |
| `clients` | `McpClientId[]` | all five | `claude-code`, `claude-desktop`, `cursor`, `vscode`, `generic`. |
| `defaultClient` | `McpClientId` | first | Tab open first. |
| `onTest` | `() => Promise<{ ok, latencyMs?, tools?, error? }>` | | Shows Test connection. A rejection shows a generic failure. |
| `labels` | `Partial<McpConnectLabels>` | | Override any string. |

**Helpers** (pure, tested): `mcpSnippet(client, server, tokenOverride?)` returns `{ target, language, code, deepLink? }`;
`maskToken(token)`.

## Examples

**Only two clients**

```tsx
import { McpConnect } from "@fadymondy/nasaq/web";

export const Two = () => <McpConnect serverUrl="https://mcp.example.com/mcp" clients={["claude-code", "cursor"]} />;
```

**Build a snippet yourself**

```tsx
import { mcpSnippet } from "@fadymondy/nasaq/web";

export const cmd = mcpSnippet("claude-code", { name: "example", url: "https://mcp.example.com/mcp", token: "abc" }).code;
```

## Accessibility

- Tabs are Base UI `Tabs`: arrow keys move, the panel is labelled by its tab.
- The token field has a label and the show/hide button has a state-aware name. Test results are announced (`role="status"` or `alert`).

## RTL & i18n

- English and Arabic strings follow the Nasaq locale. URLs, commands, JSON and tokens are `dir="ltr"`.

## Styling & tokens

- Built on `Card`, `Tabs`, `CodeBlock`, `CopyField`, `Alert` and `--nq-*` tokens.
- Target `[data-slot="mcp-connect"]`.

## Do / Don't

- Do give a scoped, expiring token, not a master key.
- Do keep the token masked on screen; the copy button gives the real one.
- Don't put the token in a deep link you log or share.
- Client config formats change: check them against each client's docs when you upgrade.

## Related

- [`ApiKeys`](../api-keys/README.md)
- [`CodeBlock`](../code-block/README.md)
- [`Tabs`](../tabs/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-integrations-mcp-connect--docs

## Steps layout and the connect sheet

`<McpConnect layout="steps" />` drops the card and tabs: the client comes from a select and the setup is
numbered steps with the snippet inline. Use it inside a sheet or dialog.

`<McpConnectSheet types={[...]} />` is "Connect to your project" as a side-over. A green `ConnectButton`
pill opens it, the connection types (MCP, API, SDK…) sit as tiles across the top, and the chosen type's
content fills the panel. Pass `trigger={null}` and `open` to drive it yourself, or your own trigger element.
