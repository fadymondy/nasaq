// The Blade impersonation-banner example (packages/php/examples/rendered/impersonation-banner.html) under real Alpine.
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

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("impersonation-banner");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const visible = (el: Element | null) => !!el && (el as HTMLElement).style.display !== "none";

describe("impersonation-banner (Blade example)", () => {
  it("renders the status region with the name and email", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="impersonation-banner"]')!;
    expect(root.getAttribute("role")).toBe("status");
    expect(root.getAttribute("data-mode")).toBe("impersonate");
    expect(root.textContent).toContain("You are viewing the app as Sara Ali.");
    expect(root.querySelector("bdi")!.getAttribute("dir")).toBe("ltr");
    expect(visible(root.querySelector('[role="alert"]'))).toBe(false);
  });

  it("shows busy while the exit promise runs, then clears", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="impersonation-banner"]')!;
    let release!: () => void;
    root.addEventListener("exit", (e) => (e as CustomEvent).detail.wait(new Promise<void>((r) => (release = r))));
    const button = root.querySelector<HTMLButtonElement>("button")!;
    button.click();
    await tick();
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.textContent).toContain("Exiting…");
    release();
    await tick();
    expect(button.getAttribute("aria-busy")).toBeNull();
  });

  it("keeps the banner and shows the failure when the exit rejects", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="impersonation-banner"]')!;
    root.addEventListener("exit", (e) => (e as CustomEvent).detail.wait(Promise.reject(new Error("no"))));
    root.querySelector<HTMLButtonElement>("button")!.click();
    await tick();
    expect(visible(root.querySelector('[role="alert"]'))).toBe(true);
    expect(root.isConnected).toBe(true);
  });
});
