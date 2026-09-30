import assert from "node:assert/strict";
import { test } from "node:test";
import { maskToken, mcpSnippet } from "../src/components/mcp-connect/snippets.ts";

const server = { name: "nasaq", url: "https://mcp.example.com/mcp", token: "nsq_secret_token_1234" };

test("Claude Code gets one command with the bearer header", () => {
  const s = mcpSnippet("claude-code", server);
  assert.equal(s.language, "bash");
  assert.equal(
    s.code,
    'claude mcp add --transport http nasaq https://mcp.example.com/mcp --header "Authorization: Bearer nsq_secret_token_1234"',
  );
});

test("JSON clients use their own root key", () => {
  assert.deepEqual(JSON.parse(mcpSnippet("cursor", server).code), {
    mcpServers: { nasaq: { url: server.url, headers: { Authorization: "Bearer nsq_secret_token_1234" } } },
  });
  assert.deepEqual(JSON.parse(mcpSnippet("vscode", server).code), {
    servers: { nasaq: { type: "http", url: server.url, headers: { Authorization: "Bearer nsq_secret_token_1234" } } },
  });
  const desktop = JSON.parse(mcpSnippet("claude-desktop", server).code);
  assert.equal(desktop.mcpServers.nasaq.command, "npx");
  assert.ok(desktop.mcpServers.nasaq.args.includes("mcp-remote"));
  assert.equal(JSON.parse(mcpSnippet("generic", server).code).mcpServers.nasaq.type, "http");
});

test("a missing token leaves a placeholder, an override wins", () => {
  assert.match(mcpSnippet("generic", { name: "n", url: "u" }).code, /Bearer YOUR_TOKEN/);
  assert.match(mcpSnippet("generic", server, "nsq_••••").code, /Bearer nsq_••••/);
});

test("a custom header carries the bare token", () => {
  const s = mcpSnippet("generic", { ...server, header: "X-Api-Key" });
  assert.equal(JSON.parse(s.code).mcpServers.nasaq.headers["X-Api-Key"], "nsq_secret_token_1234");
});

test("deep links round-trip", () => {
  const cursor = mcpSnippet("cursor", server).deepLink ?? "";
  assert.ok(cursor.startsWith("cursor://anysphere.cursor-deeplink/mcp/install?name=nasaq&config="));
  const config = decodeURIComponent(cursor.split("config=")[1] ?? "");
  assert.equal(JSON.parse(Buffer.from(config, "base64").toString()).url, server.url);
  const code = mcpSnippet("vscode", server).deepLink ?? "";
  assert.ok(code.startsWith("vscode:mcp/install?"));
  assert.equal(JSON.parse(decodeURIComponent(code.slice("vscode:mcp/install?".length))).name, "nasaq");
  assert.equal(mcpSnippet("claude-code", server).deepLink, undefined);
});

test("maskToken keeps the ends", () => {
  assert.equal(maskToken("nsq_secret_token_1234"), "nsq_se••••••••••••1234");
  assert.equal(maskToken("short"), "•••••");
});
