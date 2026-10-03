// The Blade feature-flag-detail example (packages/php/examples/rendered/feature-flag-detail.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 60) => new Promise((r) => setTimeout(r, ms));

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
  host.innerHTML = rendered("feature-flag-detail");
  document.body.append(host);
  Alpine.initTree(host);
  await tick(100);
  return host.querySelector<HTMLElement>('[data-slot="feature-flag-detail"]')!;
}

const switches = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('[data-slot="flag-environment"] [role="switch"]')];
const visible = (el: Element | null) => !!el && (el as HTMLElement).style.display !== "none";
const shown = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>('[data-slot="status"]')]
    .filter(visible)
    .map((s) => s.textContent!.trim());
const button = (root: ParentNode, text: string) => [...root.querySelectorAll<HTMLElement>("button")].find((b) => b.textContent!.includes(text))!;

describe("feature-flag-detail (Blade example)", () => {
  it("shows the name, key, a rolling-out state and the four tabs", async () => {
    const root = await mount();
    expect(root.querySelector("h2")!.textContent).toContain("New checkout");
    expect(root.textContent).toContain("new-checkout");
    expect(shown(root)).toEqual(["Rolling out"]);
    expect([...root.querySelectorAll('[role="tab"]')].map((t) => t.textContent!.trim())).toEqual(["Environments", "Targeting", "Variants", "History"]);
    expect(root.querySelectorAll('[data-slot="flag-environment"]')).toHaveLength(2);
    expect(visible(root.querySelector('[data-slot="alert"][data-tone="danger"]'))).toBe(false);
  });

  it("fires toggle from a switch and keeps the value on success", async () => {
    const root = await mount();
    const seen: string[] = [];
    root.addEventListener("toggle", (e) => {
      const d = (e as unknown as CustomEvent).detail;
      seen.push(`${d.environment}:${d.enabled}`);
      d.wait(Promise.resolve());
    });
    switches(root)[0]!.click();
    await tick();
    expect(seen).toEqual(["dev:false"]);
    expect(switches(root)[0]!.getAttribute("aria-checked")).toBe("false");
  });

  it("rolls a switch back and shows the error when the host fails", async () => {
    const root = await mount();
    root.addEventListener("toggle", (e) => (e as unknown as CustomEvent).detail.wait(Promise.resolve({ error: "Nope" })));
    switches(root)[1]!.click();
    await tick();
    expect(switches(root)[1]!.getAttribute("aria-checked")).toBe("true");
    expect(root.textContent).toContain("Nope");
  });

  it("commits a rollout when the slider is released on a new value", async () => {
    const root = await mount();
    const seen: string[] = [];
    root.addEventListener("rollout", (e) => {
      const d = (e as unknown as CustomEvent).detail;
      seen.push(`${d.environment}:${d.percent}`);
      d.wait(Promise.resolve());
    });
    const thumb = root.querySelectorAll<HTMLElement>('[data-slot="slider-thumb"]')[1]!;
    thumb.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    await tick();
    thumb.dispatchEvent(new KeyboardEvent("keyup", { key: "ArrowRight", bubbles: true }));
    await tick();
    expect(seen).toEqual(["prod:26"]);
  });

  it("validates variant keys and shows the shares", async () => {
    const root = await mount();
    const keys = () => [...root.querySelectorAll<HTMLInputElement>('[data-slot="flag-variant"] input')].filter((i) => i.type !== "number");
    expect(keys().map((i) => i.value)).toEqual(["control", "single-page"]);
    expect(root.querySelector('[data-slot="flag-variant"]')!.textContent).toContain("50%");
    keys()[1]!.value = "control";
    keys()[1]!.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect(root.textContent).toContain("Each key can be used once.");
    keys()[1]!.value = "Bad Key";
    keys()[1]!.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect(root.textContent).toContain("Keys are lowercase");
  });

  it("saves variants and adds and removes a targeting rule", async () => {
    const root = await mount();
    const seen: unknown[] = [];
    root.addEventListener("variants", (e) => {
      const d = (e as unknown as CustomEvent).detail;
      seen.push(d.variants.length);
      d.wait(Promise.resolve());
    });
    button(root, "Add variant").click();
    await tick();
    button(root, "Save variants").click();
    await tick();
    expect(seen).toEqual([3]);
    expect(root.textContent).toContain("Saved.");

    expect(root.querySelectorAll('[data-slot="flag-rule"]')).toHaveLength(1);
    button(root, "Add rule").click();
    await tick();
    expect(root.querySelectorAll('[data-slot="flag-rule"]')).toHaveLength(2);
    root.querySelector<HTMLElement>('[aria-label="Remove rule 2"]')!.click();
    await tick();
    expect(root.querySelectorAll('[data-slot="flag-rule"]')).toHaveLength(1);
  });

  it("has the rules and variant rows in the server HTML, and Alpine replaces them", async () => {
    const host = document.createElement("div");
    host.innerHTML = rendered("feature-flag-detail");
    // Before Alpine starts: one rule (with its builder) and two variant rows are already there.
    expect(host.querySelectorAll('[data-ssr="rules"] [data-slot="flag-rule"]')).toHaveLength(1);
    expect(host.querySelector('[data-ssr="rules"] [data-slot="rule-builder"]')).not.toBeNull();
    expect(host.querySelectorAll('[data-ssr="variants"] [data-slot="flag-variant"]')).toHaveLength(2);
    expect(host.querySelector('[data-ssr="variants"]')!.textContent).toContain("50%");
    document.body.append(host);
    Alpine.initTree(host);
    await tick(100);
    // After: only the live copies, no duplicates.
    expect(host.querySelectorAll("[data-ssr]")).toHaveLength(0);
    expect(host.querySelectorAll('[data-slot="flag-rule"]')).toHaveLength(1);
    expect(host.querySelectorAll('[data-slot="flag-variant"]')).toHaveLength(2);
  });

  it("makes the rule builders' serve-variant choices follow variant edits", async () => {
    const root = await mount();
    const options = () => [...root.querySelectorAll<HTMLOptionElement>('[data-slot="flag-rule"] select option')].map((o) => o.value);
    expect(options()).toContain("single-page");
    const keys = [...root.querySelectorAll<HTMLInputElement>('[data-slot="flag-variant"] input')].filter((i) => i.type !== "number");
    keys[1]!.value = "one-page";
    keys[1]!.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect(options()).toContain("one-page");
    expect(options()).not.toContain("single-page");
    button(root, "Add variant").click();
    await tick();
    expect(options()).toContain("variant-3");
  });

  it("kills the flag with a reason and restores it", async () => {
    const root = await mount();
    const seen: string[] = [];
    root.addEventListener("kill", (e) => {
      const d = (e as unknown as CustomEvent).detail;
      seen.push(d.reason);
      d.wait(Promise.resolve());
    });
    root.addEventListener("restore", (e) => (e as unknown as CustomEvent).detail.wait(Promise.resolve()));
    button(root, "Kill switch").click();
    await tick();
    const input = document.body.querySelector<HTMLInputElement>('[data-slot="alert-dialog-content"] input')!;
    input.value = "Errors after deploy";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    document.body.querySelector<HTMLElement>('[data-slot="alert-dialog-action"]')!.click();
    await tick(120);
    expect(seen).toEqual(["Errors after deploy"]);
    expect(shown(root)).toEqual(["Killed"]);
    expect(switches(root)[0]!.hasAttribute("disabled")).toBe(true);
    button(root, "Restore").click();
    await tick();
    expect(shown(root)).toEqual(["Rolling out"]);
  });

  it("lists the audit history newest first", async () => {
    const root = await mount();
    const items = [...root.querySelectorAll('[data-slot="timeline-item"]')].map((i) => i.textContent!);
    expect(items).toHaveLength(2);
    expect(items[0]).toContain("Turned on in Production");
    expect(items[1]).toContain("Created the flag");
  });
});
