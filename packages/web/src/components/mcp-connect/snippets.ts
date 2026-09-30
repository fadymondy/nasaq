export type McpClientId = "claude-code" | "claude-desktop" | "cursor" | "vscode" | "generic";

export const MCP_CLIENTS: readonly McpClientId[] = ["claude-code", "claude-desktop", "cursor", "vscode", "generic"];

export interface McpServerInfo {
  /** The key the server gets in the client's config: `nasaq`. */
  name: string;
  /** The Streamable HTTP endpoint. */
  url: string;
  /** The bearer token, or undefined to leave a placeholder. */
  token?: string;
  /** Header that carries the token. Default `Authorization` with a `Bearer ` prefix. */
  header?: string;
}

export interface McpSnippet {
  /** Where it goes: a file name or "Terminal". */
  target: string;
  language: "bash" | "json";
  code: string;
  /** A one-click install link for clients that have one. */
  deepLink?: string;
}

export const TOKEN_PLACEHOLDER = "YOUR_TOKEN";

const headerName = (s: McpServerInfo) => s.header ?? "Authorization";
const headerValue = (s: McpServerInfo, token: string) => (headerName(s).toLowerCase() === "authorization" ? `Bearer ${token}` : token);
const headers = (s: McpServerInfo, token: string) => ({ [headerName(s)]: headerValue(s, token) });

const json = (value: unknown) => JSON.stringify(value, null, 2);

/** `shell` quoting for the one place a value goes into a command line. */
const quote = (value: string) => `"${value.replace(/(["\\$`])/g, "\\$1")}"`;

/** Base64 of ASCII-or-UTF-8 JSON, for the Cursor install link. */
function base64(text: string) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/**
 * The config a client needs. Pass `token` as the real value for copying, or a masked string for display:
 * the same builder produces both, so what people see is what they paste.
 */
export function mcpSnippet(client: McpClientId, server: McpServerInfo, tokenOverride?: string): McpSnippet {
  const token = tokenOverride ?? server.token ?? TOKEN_PLACEHOLDER;
  const h = headers(server, token);
  switch (client) {
    case "claude-code":
      return {
        target: "Terminal",
        language: "bash",
        code: `claude mcp add --transport http ${server.name} ${server.url} --header ${quote(`${headerName(server)}: ${headerValue(server, token)}`)}`,
      };
    case "claude-desktop":
      // Claude Desktop runs local servers; mcp-remote bridges a remote HTTP one.
      return {
        target: "claude_desktop_config.json",
        language: "json",
        code: json({
          mcpServers: {
            [server.name]: {
              command: "npx",
              args: ["-y", "mcp-remote", server.url, "--header", `${headerName(server)}: ${headerValue(server, token)}`],
            },
          },
        }),
      };
    case "cursor": {
      const entry = { url: server.url, headers: h };
      return {
        target: "~/.cursor/mcp.json",
        language: "json",
        code: json({ mcpServers: { [server.name]: entry } }),
        deepLink: `cursor://anysphere.cursor-deeplink/mcp/install?name=${encodeURIComponent(server.name)}&config=${encodeURIComponent(base64(JSON.stringify(entry)))}`,
      };
    }
    case "vscode": {
      const entry = { type: "http", url: server.url, headers: h };
      return {
        target: ".vscode/mcp.json",
        language: "json",
        code: json({ servers: { [server.name]: entry } }),
        deepLink: `vscode:mcp/install?${encodeURIComponent(JSON.stringify({ name: server.name, ...entry }))}`,
      };
    }
    default:
      return {
        target: "mcp.json",
        language: "json",
        code: json({ mcpServers: { [server.name]: { type: "http", url: server.url, headers: h } } }),
      };
  }
}

/** A token shortened for display: the first six characters, dots, the last four. */
export function maskToken(token: string): string {
  if (token.length <= 10) return "•".repeat(token.length);
  return `${token.slice(0, 6)}${"•".repeat(12)}${token.slice(-4)}`;
}
