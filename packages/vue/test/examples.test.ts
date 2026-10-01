import { mount } from "@vue/test-utils";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";
import type { Component } from "vue";

// Every examples/<name>.vue (the code on the component's Vue tab) mounts without warnings and renders Nasaq markup.
const examples = import.meta.glob<{ default: Component }>("../examples/*.vue", { eager: true });

it("has an example for every ported component", () => {
  const ported = readdirSync(resolve(process.cwd(), "src/components"), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  const named = Object.keys(examples).map((p) => p.replace(/^.*\/|\.vue$/g, ""));
  expect(ported.filter((n) => !named.includes(n))).toEqual([]);
});

it.each(Object.entries(examples))("%s mounts", (_path, mod) => {
  const warnings: string[] = [];
  const w = mount(mod.default, { attachTo: document.body, global: { config: { warnHandler: (msg) => void warnings.push(msg) } } });
  expect(warnings).toEqual([]);
  expect(document.body.innerHTML).toMatch(/data-slot="/);
  w.unmount();
});
