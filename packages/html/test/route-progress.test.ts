import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
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

async function mount(name: string) {
  const host = document.createElement("div");
  host.innerHTML = rendered(name);
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

describe("route-progress (Blade example)", () => {
  it("is idle until work starts, then active, then idle again", async () => {
    const host = await mount("route-progress");
    const bar = host.querySelector<HTMLElement>('[data-slot="route-progress"]')!;
    expect(bar.getAttribute("role")).toBe("progressbar");
    expect(bar.getAttribute("data-state")).toBe("idle");

    window.dispatchEvent(new CustomEvent("nq-progress-start"));
    await tick();
    expect(bar.getAttribute("data-state")).toBe("active");
    expect(Number(bar.getAttribute("aria-valuenow"))).toBeGreaterThan(0);

    window.dispatchEvent(new CustomEvent("nq-progress-end"));
    await tick(450);
    expect(bar.getAttribute("data-state")).toBe("idle");
    expect(bar.getAttribute("aria-valuenow")).toBe("0");
  });

  it("follows the example button", async () => {
    const host = await mount("route-progress");
    host.querySelector<HTMLButtonElement>("button")!.click();
    await tick();
    expect(host.querySelector('[data-slot="route-progress"]')!.getAttribute("data-state")).toBe("active");
  });
});
