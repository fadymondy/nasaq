// Shared by the collapsible, popover, hover-card, tooltip and scroll-area tests: boots Alpine with the Nasaq runtime
// and mounts a Blade example as rendered by Laravel (packages/php/examples/rendered).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
export const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

/** Call once at the top of a test file. */
export function setup() {
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
  });
}

export async function mount(name: string) {
  const host = document.createElement("div");
  host.innerHTML = rendered(name);
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}
