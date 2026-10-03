// The Blade onboarding-checklist example (packages/php/examples/rendered/onboarding-checklist.html) under real Alpine.
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

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("onboarding-checklist");
  document.body.append(host);
  Alpine.initTree(host);
  await tick(80);
  return host.querySelector<HTMLElement>('[data-slot="onboarding-checklist"]')!;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (root: HTMLElement) => (Alpine as any).$data(root);
const lis = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>("li")];

describe("onboarding-checklist (Blade example)", () => {
  it("shows progress and highlights the next item", async () => {
    const root = await mount();
    expect(root.getAttribute("role")).toBe("region");
    expect(root.querySelector('[data-slot="onboarding-checklist-count"]')!.textContent).toBe("1 of 3 done");
    const rows = lis(root);
    expect(rows[0]!.hasAttribute("data-done")).toBe(true);
    expect(rows[1]!.hasAttribute("data-next")).toBe(true);
    expect(rows[2]!.hasAttribute("data-next")).toBe(false);
    expect(root.querySelector('[role="progressbar"]')!.getAttribute("aria-valuenow")).toBe("33");
  });

  it("runs an item action (busy until settled) and fires dismiss", async () => {
    const root = await mount();
    const seen: string[] = [];
    let release: () => void = () => {};
    root.addEventListener("action", (e) => {
      const d = (e as CustomEvent).detail;
      seen.push(d.id);
      d.wait(new Promise<void>((r) => (release = r)));
    });
    root.addEventListener("dismiss", () => seen.push("dismiss"));
    const button = lis(root)[1]!.querySelector("button")!;
    button.click();
    await tick();
    expect(seen).toEqual(["invite"]);
    expect(button.getAttribute("aria-busy")).toBe("true");
    release();
    await tick();
    expect(button.getAttribute("aria-busy")).toBeNull();
    root.querySelector<HTMLElement>('[aria-label="Dismiss the checklist"]')!.click();
    await tick();
    expect(seen).toEqual(["invite", "dismiss"]);
  });

  it("celebrates once everything is done and fires complete once", async () => {
    const root = await mount();
    let completes = 0;
    root.addEventListener("complete", () => completes++);
    const d = data(root);
    d.items = d.items.map((i: { id: string }) => ({ ...i, done: true }));
    await tick(80);
    expect(completes).toBe(1);
    expect(root.hasAttribute("data-complete")).toBe(true);
    expect(root.textContent).toContain("You are all set");
    expect(root.querySelector("ol")!.style.display).toBe("none");
    d.items = d.items.map((i: { id: string }) => ({ ...i }));
    await tick();
    expect(completes).toBe(1);
  });
});
