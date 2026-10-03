import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const attr = (el: Element, name: string) => [...el.attributes].find((a) => a.name === name)?.value ?? null; // happy-dom getAttribute is stale for server-rendered attributes Alpine rewrites
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

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

async function mount(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

describe("chip-group (Blade example)", () => {
  it("marks the default chip and moves the selection on click", async () => {
    const host = await mount(rendered("chip-group"));
    const group = host.querySelector<HTMLElement>('[data-slot="chip-group"]')!;
    expect(group.getAttribute("role")).toBe("group");
    expect(group.getAttribute("aria-label")).toBe("Categories");
    const chips = [...host.querySelectorAll<HTMLElement>('[data-slot="chip"]')];
    expect(chips).toHaveLength(3);
    expect(attr(chips[0]!, "aria-pressed")).toBe("true");
    expect(chips[0]!.hasAttribute("data-selected")).toBe(true);
    expect(attr(chips[1]!, "aria-pressed")).toBe("false");
    expect(chips[1]!.hasAttribute("data-selected")).toBe(false);
    chips[1]!.click();
    await tick();
    expect(attr(chips[1]!, "aria-pressed")).toBe("true");
    expect(chips[1]!.hasAttribute("data-selected")).toBe(true);
    expect(attr(chips[0]!, "aria-pressed")).toBe("false");
    expect(chips[0]!.hasAttribute("data-selected")).toBe(false);
  });
});
