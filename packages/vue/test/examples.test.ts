import { mount } from "@vue/test-utils";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, expect, it } from "vitest";
import type { Component } from "vue";

// Every examples/<name>.vue (the code on the component's Vue tab) mounts without warnings and renders Nasaq markup.
const dir = (p: string) => readdirSync(resolve(process.cwd(), p), { withFileTypes: true });
const examples = dir("examples")
  .filter((f) => f.isFile() && f.name.endsWith(".vue"))
  .map((f) => f.name.replace(/\.vue$/, ""));

// Compile the whole library once, outside any single test's timeout (examples import it through "@fadymondy/nasaq/vue").
beforeAll(async () => {
  await import("../src/index");
}, 180_000);

it("has an example for every ported component", () => {
  const ported = dir("src/components").filter((d) => d.isDirectory()).map((d) => d.name);
  expect(ported.filter((n) => !examples.includes(n))).toEqual([]);
});

it.each(examples)("%s mounts", async (name) => {
  const mod = (await import(`../examples/${name}.vue`)) as { default: Component };
  const warnings: string[] = [];
  const w = mount(mod.default, { attachTo: document.body, global: { config: { warnHandler: (msg) => void warnings.push(msg) } } });
  expect(warnings).toEqual([]);
  expect(document.body.innerHTML).toMatch(/data-slot="/);
  w.unmount();
}, 30_000);
