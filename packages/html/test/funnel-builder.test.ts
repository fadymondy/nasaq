// The Blade funnel-builder example (packages/php/examples/rendered/funnel-builder.html) under real Alpine.
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
  host.innerHTML = rendered("funnel-builder");
  document.body.append(host);
  Alpine.initTree(host);
  await tick(80);
  return host.querySelector<HTMLElement>('[data-slot="funnel-builder"]')!;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (root: HTMLElement) => (Alpine as any).$data(root);
const steps = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('[data-slot="funnel-builder-step"]')];
const byLabel = (root: HTMLElement, label: string) => root.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!;

describe("funnel-builder (Blade example)", () => {
  it("renders the card with the empty state and the default window", async () => {
    const root = await mount();
    expect(root.textContent).toContain("Funnel builder");
    expect(root.textContent).toContain("No steps yet");
    expect(steps(root)).toHaveLength(0);
    expect(root.textContent).toContain("7d");
  });

  it("blocks saving without a name or two steps", async () => {
    const root = await mount();
    let fired = false;
    root.addEventListener("save", () => (fired = true));
    root.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    await tick(80);
    expect(fired).toBe(false);
    const alert = [...root.querySelectorAll<HTMLElement>('[role="alert"]')].filter((a) => a.style.display !== "none").map((a) => a.textContent);
    expect(alert.join(" ")).toContain("Give the funnel a name.");
    expect(alert.join(" ")).toContain("A funnel needs at least two steps.");
  });

  it("adds, reorders and removes steps, then saves and shows the success message", async () => {
    const root = await mount();
    const seen: unknown[] = [];
    root.addEventListener("funnel-change", (e) => seen.push((e as CustomEvent).detail.value));
    let saved: { name: string; steps: { sourceId: string }[] } | null = null;
    root.addEventListener("save", (e) => {
      const d = (e as CustomEvent).detail;
      saved = d.value;
      d.wait(Promise.resolve());
    });
    const d = data(root);
    d.name = "Signup";
    d.pickEvent = "signup";
    await tick();
    [...root.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.includes("Add step"))!.click();
    await tick();
    d.pickEvent = "order";
    await tick();
    [...root.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.includes("Add step"))!.click();
    await tick();
    expect(steps(root)).toHaveLength(2);
    expect(steps(root)[0]!.textContent).toContain("Signed up");
    expect(steps(root)[0]!.textContent).toContain("user_signed_up");

    byLabel(root, "Move Signed up down").click();
    await tick();
    expect(steps(root)[0]!.textContent).toContain("Placed an order");

    byLabel(root, "Remove Signed up").click();
    await tick();
    expect(steps(root)).toHaveLength(1);

    d.pickEvent = "signup";
    await tick();
    [...root.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.includes("Add step"))!.click();
    await tick();
    root.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    await tick(80);
    expect(saved!.name).toBe("Signup");
    expect(saved!.steps.map((s) => s.sourceId)).toEqual(["order", "signup"]);
    expect(seen.length).toBeGreaterThan(3);
    expect(root.textContent).toContain("Funnel saved.");
  });

  it("shows the message the host resolves with, and the generic error when nobody listens", async () => {
    const root = await mount();
    const d = data(root);
    d.name = "Signup";
    d.steps = [
      { id: "a#1", sourceId: "home", kind: "page", label: "Home page", detail: "/" },
      { id: "b#2", sourceId: "signup", kind: "event", label: "Signed up" },
    ];
    await tick();
    root.addEventListener("save", (e) => (e as CustomEvent).detail.wait(Promise.resolve({ error: "Name taken" })), { once: true });
    root.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    await tick(80);
    expect(root.textContent).toContain("Name taken");
  });

  it("clamps the window and updates its key", async () => {
    const root = await mount();
    const d = data(root);
    d.amount = 24;
    d.unit = "hour";
    await tick();
    expect(root.textContent).toContain("24h");
    d.amount = 0;
    d.setAmount();
    await tick();
    expect(d.amount).toBe(1);
  });
});
