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

test("get_setup per framework returns that stack's guide", async () => {
  const setup = async (framework) => (await call("get_setup", { framework })).body;
  for (const f of ["react", "shadcn"]) assert.match(await setup(f), f === "react" ? /@fadymondy\/nasaq\/web/ : /shadcn@latest add/);
  assert.match(await setup("react"), /^### React/);
  assert.match(await setup("shadcn"), /^### shadcn/);
  for (const f of ["vue", "nuxt"]) assert.match(await setup(f), /^### Vue 3 and Nuxt[\s\S]*use\(Nasaq\)/);
  for (const f of ["inertia", "inertia-vue"]) assert.match(await setup(f), /createInertiaApp/);
  for (const f of ["blade", "livewire", "filament", "laravel", "tomatophp"]) assert.match(await setup(f), /composer require fadymondy\/nasaq-php/);
  assert.match(await setup("filament"), /NasaqPlugin/);
  for (const f of ["html", "alpine"]) assert.match(await setup(f), /Alpine\.plugin\(nasaq\)/);
  assert.match((await call("get_setup")).body, /NasaqProvider/);
  assert.doesNotMatch(await setup("vue"), /framework-kit|kit\.md/);
});

test("foundations list the new setup guides and no kit", async () => {
  const ids = JSON.parse((await call("get_foundation")).body).map((t) => t.id);
  for (const id of ["get-started", "setup-react", "setup-shadcn", "setup-inertia", "setup-vue", "setup-laravel", "setup-html"]) assert.ok(ids.includes(id), id);
  assert.ok(!ids.includes("framework-kit") && !ids.includes("frameworks") && !ids.includes("setup-alpine"));
  assert.match((await call("get_foundation", { topic: "get-started" })).body, /# Get started/);
});

test("list_components per framework lists only ported components", async () => {
  for (const framework of ["vue", "nuxt", "blade", "html"]) {
    const res = JSON.parse((await call("list_components", { framework })).body);
    const names = Object.values(res.categories).flat().map((c) => c.name);
    for (const n of ["button", "dialog", "spinner", "tabs"]) assert.ok(names.includes(n), `${framework}: ${n}`);
    assert.ok(!names.includes("app-shell"), framework);
    assert.match(res.next, new RegExp(`framework: "${framework}"`));
  }
  const vue = JSON.parse((await call("list_components", { framework: "vue" })).body);
  const react = JSON.parse((await call("list_components", { framework: "react" })).body);
  const shadcn = JSON.parse((await call("list_components", { framework: "shadcn" })).body);
  assert.ok(react.count > vue.count && shadcn.count === react.count);
});

test("get_component returns the stack's code", async () => {
  const get = async (name, framework) => (await call("get_component", { name, framework })).body;
  const vue = await get("dialog", "vue");
  assert.match(vue, /NqDialog/);
  assert.match(vue, /@fadymondy\/nasaq\/vue/);
  assert.match(await get("dialog", "nuxt"), /NqDialog/);
  const blade = await get("dialog", "blade");
  assert.match(blade, /<x-nq::dialog/);
  assert.match(blade, /nasaq-php/);
  assert.match(blade, /nqDialog/); // "what it renders"
  for (const f of ["filament", "laravel", "tomatophp"]) assert.match(await get("button", f), /<x-nq::button/);
  const livewire = await get("tabs", "livewire");
  assert.match(livewire, /<x-nq::tabs/);
  assert.match(livewire, /wire:model/);
  for (const f of ["alpine", "html"]) {
    const html = await get("dialog", f);
    assert.match(html, /x-data="nqDialog/);
    assert.doesNotMatch(html, /<x-nq::/);
  }
  const shadcn = await get("dialog", "shadcn");
  assert.match(shadcn, /npx shadcn@latest add @nasaq\/dialog/);
  assert.match(shadcn, /from "@\/components\/ui\/dialog"/);
  assert.match(shadcn, /from "@\/components\/ui\/button"/);
  assert.doesNotMatch(shadcn, /@fadymondy\/nasaq\/web/);
  // React and Inertia read the README quick start, untouched.
  assert.match(await get("button", "inertia"), /@fadymondy\/nasaq\/web/);
  const react = await get("dialog");
  assert.match(react, /other stacks: shadcn, vue, blade, html\/alpine/);
  assert.match(react, /# Dialog/);
});

test("an unported component says so and lists what is ported", async () => {
  for (const [framework, label] of [["vue", "Vue"], ["blade", "Blade"], ["alpine", "HTML + Alpine"]]) {
    const res = await call("get_component", { name: "app-shell", framework });
    assert.ok(res.isError, framework);
    assert.ok(res.body.includes(`not ported yet to ${label}`), res.body);
    assert.match(res.body, /React/);
    assert.match(res.body, /button, dialog, spinner, tabs/);
  }
  // shadcn still works for any component that has a Quick start.
  assert.ok(!(await call("get_component", { name: "app-shell", framework: "shadcn" })).isError);
});

test("resources", async () => {
  const { resources } = await client.listResources();
  assert.ok(resources.some((r) => r.uri === "nasaq://components/app-shell"));
  const res = await client.readResource({ uri: "nasaq://components/dialog" });
  assert.match(res.contents[0].text, /# Dialog/);
});
