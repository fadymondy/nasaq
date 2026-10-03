// The Blade provider-switcher example (packages/php/examples/rendered/provider-switcher.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = () => new Promise((r) => setTimeout(r, 30));

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

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("provider-switcher");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const row = (host: HTMLElement, key: string) => host.querySelector<HTMLElement>(`[data-capability="${key}"]`)!;
const triggerOf = (host: HTMLElement, key: string) => row(host, key).querySelector<HTMLElement>('[data-slot="provider-switcher-select"]')!;
const items = () => [...document.querySelectorAll<HTMLElement>('[data-slot="select-item"]')];
const visible = (el: Element) => (el as HTMLElement).style.display !== "none";

async function pick(host: HTMLElement, key: string, value: string) {
  triggerOf(host, key).click();
  await tick();
  items().find((i) => i.dataset.value === value)!.click();
  await tick();
}

describe("provider-switcher (Blade example)", () => {
  it("renders a row per capability with the active backend and the status chip", async () => {
    const host = await mount();
    expect(host.querySelectorAll('[data-slot="provider-switcher-row"]')).toHaveLength(2);
    expect(triggerOf(host, "data").getAttribute("aria-label")).toBe("Backend for Data");
    expect(triggerOf(host, "data").textContent).toContain("postgres");
    const chips = [...row(host, "data").querySelectorAll('[data-slot="status"]')].filter((s) => visible(s.parentElement!));
    expect(chips.map((c) => c.textContent!.trim())).toEqual(["Default"]);
    const queue = [...row(host, "queue").querySelectorAll('[data-slot="status"]')].filter((s) => visible(s.parentElement!));
    expect(queue.map((c) => c.textContent!.trim())).toEqual(["Overridden"]);
  });

  it("dispatches select, marks the row busy while a handler waits, then shows Overridden", async () => {
    const host = await mount();
    let release!: () => void;
    let seen: { capability: string; backend: string } | null = null;
    host.querySelector('[data-slot="provider-switcher"]')!.addEventListener("select", (e) => {
      const detail = (e as CustomEvent).detail;
      seen = { capability: detail.capability, backend: detail.backend };
      detail.wait(new Promise<void>((r) => (release = r)));
    });
    await pick(host, "data", "sqlite");
    expect(seen).toEqual({ capability: "data", backend: "sqlite" });
    expect(row(host, "data").getAttribute("aria-busy")).toBe("true");
    expect(triggerOf(host, "data").hasAttribute("disabled")).toBe(true);
    release();
    await tick();
    expect(row(host, "data").hasAttribute("aria-busy")).toBe(false);
    expect(triggerOf(host, "data").textContent).toContain("sqlite");
    const chips = [...row(host, "data").querySelectorAll('[data-slot="status"]')].filter((s) => visible(s.parentElement!));
    expect(chips.map((c) => c.textContent!.trim())).toEqual(["Overridden"]);
  });

  it("puts the previous backend back when the handler rejects", async () => {
    const host = await mount();
    host.querySelector('[data-slot="provider-switcher"]')!.addEventListener("select", (e) => (e as CustomEvent).detail.wait(Promise.reject(new Error("no"))));
    await pick(host, "queue", "nats");
    await tick();
    expect(triggerOf(host, "queue").textContent).toContain("redis");
  });
});
