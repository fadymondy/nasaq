import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";

let client;
const call = async (name, args = {}) => {
  const res = await client.callTool({ name, arguments: args });
  return { ...res, body: res.content[0].text };
};

before(async () => {
  client = new Client({ name: "nasaq-test", version: "0" });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [fileURLToPath(new URL("../src/server.mjs", import.meta.url))] }));
});
after(() => client?.close());

test("exposes the tools", async () => {
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), ["get_component", "get_foundation", "get_setup", "list_components", "list_tokens", "search_components"]);
});

test("list_components groups by category and filters", async () => {
  const all = JSON.parse((await call("list_components")).body);
  assert.ok(all.count >= 30);
  const nav = JSON.parse((await call("list_components", { category: "navigation" })).body);
  assert.ok(nav.categories.navigation.some((c) => c.name === "product-switcher"));
  assert.deepEqual(Object.keys(nav.categories), ["navigation"]);
});

test("get_component resolves folder, title and export names", async () => {
  for (const name of ["product-switcher", "ProductSwitcher", "SidebarProducts", "product switcher"]) {
    const { body, isError } = await call("get_component", { name });
    assert.ok(!isError, name);
    assert.match(body, /^# ProductSwitcher \(product-switcher\)/);
    assert.match(body, /## API/);
  }
});

test("get_component include picks sections", async () => {
  const { body } = await call("get_component", { name: "button", include: ["api", "source"] });
  assert.match(body, /^## API/m);
  assert.doesNotMatch(body, /^## Accessibility/m);
  assert.match(body, /```tsx/);
});

test("unknown component suggests alternatives", async () => {
  const { body, isError } = await call("get_component", { name: "launcher" });
  assert.ok(isError);
  assert.match(body, /No component/);
});

test("search ranks by need", async () => {
  const hits = JSON.parse((await call("search_components", { query: "switch between products" })).body);
  assert.equal(hits[0].name, "product-switcher");
});

test("foundations, tokens and setup", async () => {
  const topics = JSON.parse((await call("get_foundation")).body);
  assert.ok(topics.some((t) => t.id === "color"));
  assert.match((await call("get_foundation", { topic: "layout" })).body, /#/);
  const tokens = JSON.parse((await call("list_tokens", { prefix: "--nq-danger" })).body);
  assert.ok(tokens.total > 0 && tokens.tokens.every((t) => t.name.startsWith("--nq-danger")));
  assert.match((await call("get_setup")).body, /NasaqProvider/);
});

test("resources", async () => {
  const { resources } = await client.listResources();
  assert.ok(resources.some((r) => r.uri === "nasaq://components/app-shell"));
  const res = await client.readResource({ uri: "nasaq://components/dialog" });
  assert.match(res.contents[0].text, /# Dialog/);
});
