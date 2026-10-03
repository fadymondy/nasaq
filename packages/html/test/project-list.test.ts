// The Blade project-list example (packages/php/examples/rendered/project-list.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms));

beforeAll(() => {
  Alpine.plugin(nasaq);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).Alpine = Alpine;
  Alpine.start();
});

afterEach(() => {
  for (const el of [...document.body.children]) {
    Alpine.destroyTree(el as HTMLElement);
    el.remove();
  }
  document.body.innerHTML = "";
});

describe("project-list (Blade example)", () => {
  it("renders the list with its rows, search and view toggle", async () => {
    const host = document.createElement("div");
    host.innerHTML = rendered("project-list");
    document.body.append(host);
    Alpine.initTree(host);
    await tick(80);
    const root = host.querySelector<HTMLElement>('[data-slot="project-list"]')!;
    expect(root).not.toBeNull();
    expect(root.querySelector('[data-slot="entity-list"]')).not.toBeNull();
    expect(root.querySelector("input[type=search]")).not.toBeNull();
    expect(root.querySelectorAll("[data-row]").length).toBeGreaterThan(0);
  });
});
