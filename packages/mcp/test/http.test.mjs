import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { after, before, test } from "node:test";
import { catalogProvider } from "../src/create-server.mjs";
import { startHttp } from "../src/http.mjs";

const MAX = 4096;
let http;
let base;
let client;

const MCP_HEADERS = { "Content-Type": "application/json", Accept: "application/json, text/event-stream" };
const rpc = (method, params, id = 1) => JSON.stringify({ jsonrpc: "2.0", id, method, params });
const post = (body, headers = MCP_HEADERS) => fetch(`${base}/mcp`, { method: "POST", headers, body });
const call = async (name, args = {}) => {
  const res = await client.callTool({ name, arguments: args });
  return { ...res, body: res.content[0].text };
};

before(async () => {
  const snapshot = existsSync(new URL("../catalog.json", import.meta.url));
  http = await startHttp({ host: "127.0.0.1", port: 0, maxBodyBytes: MAX, catalog: catalogProvider({ snapshot }) });
  base = `http://127.0.0.1:${http.address().port}`;
  client = new Client({ name: "nasaq-http-test", version: "0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`)));
});
after(async () => {
  await client?.close();
  await new Promise((resolve) => http.close(resolve));
});

test("initialize negotiates and is stateless", async () => {
  const res = await post(rpc("initialize", { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "raw", version: "0" } }));
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /application\/json/);
  assert.equal(res.headers.get("mcp-session-id"), null);
  assert.equal(res.headers.get("access-control-allow-origin"), "*");
  const msg = await res.json();
  assert.equal(msg.result.serverInfo.name, "nasaq");
  assert.match(msg.result.instructions, /get_setup/);
  assert.ok(msg.result.capabilities.tools);
});

test("lists the same tools as stdio", async () => {
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), ["get_component", "get_foundation", "get_setup", "list_components", "list_tokens", "search_components"]);
  assert.ok(tools.every((t) => t.annotations?.readOnlyHint));
});

test("search_components and get_component work over HTTP", async () => {
  const hits = JSON.parse((await call("search_components", { query: "switch between products" })).body);
  assert.equal(hits[0].name, "product-switcher");
  const { body, isError } = await call("get_component", { name: "ProductSwitcher" });
  assert.ok(!isError);
  assert.match(body, /^# ProductSwitcher \(product-switcher\)/);
  assert.match(body, /npx shadcn@latest add @nasaq\/product-switcher/);
  assert.match(body, /https:\/\/docs\.nasaqui\.com\/r\/product-switcher\.json/);
});

test("get_setup, list_tokens and get_foundation work over HTTP", async () => {
  const setup = (await call("get_setup")).body;
  assert.match(setup, /NasaqProvider/);
  assert.match(setup, /https:\/\/docs\.nasaqui\.com\/r\/\{name\}\.json/);
  assert.doesNotMatch(setup, /nasaq\.fadymondy\.com\/r\//);
  const tokens = JSON.parse((await call("list_tokens", { prefix: "--nq-danger" })).body);
  assert.ok(tokens.total > 0);
  const topics = JSON.parse((await call("get_foundation")).body).map((t) => t.id);
  assert.ok(topics.includes("color"));
  assert.ok(!topics.includes("brand-audit"), "internal audit must not be published");
});

test("GET /health reports version and counts", async () => {
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, "ok");
  assert.match(body.version, /^\d+\.\d+\.\d+/);
  assert.ok(body.components >= 30 && body.foundations >= 5 && body.tokens > 0);
});

test("GET / explains how to connect", async () => {
  const res = await fetch(base);
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /text\/html/);
  const html = await res.text();
  assert.match(html, /claude mcp add --transport http nasaq https:\/\/mcp\.nasaqui\.com\/mcp/);
});

test("CORS preflight allows browser clients", async () => {
  const res = await fetch(`${base}/mcp`, { method: "OPTIONS", headers: { Origin: "https://claude.ai", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type,mcp-protocol-version" } });
  assert.equal(res.status, 204);
  assert.equal(res.headers.get("access-control-allow-origin"), "*");
  assert.match(res.headers.get("access-control-allow-headers"), /Mcp-Protocol-Version/i);
});

test("malformed requests get JSON-RPC errors", async () => {
  const notJson = await post("{nope");
  assert.equal(notJson.status, 400);
  assert.equal((await notJson.json()).error.code, -32700);

  const scalar = await post("42");
  assert.equal(scalar.status, 400);

  const notRpc = await post(JSON.stringify({ hello: "world" }));
  assert.ok(notRpc.status >= 400 && notRpc.status < 500);
  assert.ok((await notRpc.json()).error);

  const wrongType = await post(rpc("tools/list", {}), { "Content-Type": "text/plain", Accept: MCP_HEADERS.Accept });
  assert.equal(wrongType.status, 415);

  const noAccept = await post(rpc("tools/list", {}), { "Content-Type": "application/json" });
  assert.equal(noAccept.status, 406);

  const get = await fetch(`${base}/mcp`);
  assert.equal(get.status, 405);
  assert.match(get.headers.get("allow"), /POST/);
  assert.equal((await fetch(`${base}/nope`)).status, 404);
  assert.equal((await fetch(`${base}/../../etc/passwd`)).status, 404);
});

test("unknown tool and unknown component fail cleanly", async () => {
  const { body, isError } = await call("get_component", { name: "../../.env" });
  assert.ok(isError);
  assert.match(body, /No component/);
  const res = await post(rpc("tools/call", { name: "read_file", arguments: { path: "/etc/passwd" } }));
  const msg = await res.json();
  assert.ok(msg.error || msg.result?.isError);
});

test("oversized bodies are rejected with 413 and the server stays up", async () => {
  const big = rpc("tools/call", { name: "search_components", arguments: { query: "x".repeat(MAX * 2) } });
  const res = await post(big);
  assert.equal(res.status, 413);
  assert.equal((await res.json()).error.code, -32600);
  const { tools } = await client.listTools();
  assert.equal(tools.length, 6);
});
