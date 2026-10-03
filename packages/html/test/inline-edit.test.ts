// The Blade inline-edit example (packages/php/examples/rendered/inline-edit.html) under real Alpine.
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
  host.innerHTML = rendered("inline-edit");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const roots = (host: HTMLElement) => [...host.querySelectorAll<HTMLElement>('[data-slot="inline-edit"]')];
const visible = (el: Element | null) => !!el && (el as HTMLElement).style.display !== "none";

describe("inline-edit (Blade example)", () => {
  it("renders the display state with the value and an empty prompt", async () => {
    const host = await mount();
    const [title, desc] = roots(host);
    expect(title!.getAttribute("data-state")).toBe("display");
    expect(title!.textContent).toContain("Launch plan");
    expect(desc!.textContent).toContain("Add description");
    expect(visible(title!.querySelector('[role="group"]'))).toBe(false);
  });

  it("opens on click, saves on Enter and fires save", async () => {
    const host = await mount();
    const root = roots(host)[0]!;
    let saved = "";
    root.addEventListener("save", (e) => (saved = (e as CustomEvent).detail.value));
    (root.querySelector("button") as HTMLElement).click();
    await tick();
    expect(root.getAttribute("data-state")).toBe("editing");
    const input = root.querySelector("input") as HTMLInputElement;
    input.value = "New title";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await tick();
    expect(saved).toBe("New title");
    expect(root.getAttribute("data-state")).toBe("display");
    expect(root.textContent).toContain("New title");
  });

  it("Escape cancels and keeps the value", async () => {
    const host = await mount();
    const root = roots(host)[0]!;
    (root.querySelector("button") as HTMLElement).click();
    await tick();
    const input = root.querySelector("input") as HTMLInputElement;
    input.value = "Nope";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await tick();
    expect(root.getAttribute("data-state")).toBe("display");
    expect(root.textContent).toContain("Launch plan");
  });

  it("shows a required error when emptied and a length error when too long", async () => {
    const host = await mount();
    const root = roots(host)[0]!;
    (root.querySelector("button") as HTMLElement).click();
    await tick();
    const input = root.querySelector("input") as HTMLInputElement;
    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await tick();
    expect(root.getAttribute("data-state")).toBe("editing");
    expect(root.querySelector('[role="alert"]')!.textContent).toContain("cannot be empty");
    input.value = "x".repeat(30);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await tick();
    expect(root.querySelector('[role="alert"]')!.textContent).toContain("Too long");
  });

  it("keeps editing when the listener resolves with an error", async () => {
    const host = await mount();
    const root = roots(host)[0]!;
    root.addEventListener("save", (e) => (e as CustomEvent).detail.wait(Promise.resolve({ error: "Taken" })));
    (root.querySelector("button") as HTMLElement).click();
    await tick();
    const input = root.querySelector("input") as HTMLInputElement;
    input.value = "Other";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await tick();
    expect(root.getAttribute("data-state")).toBe("editing");
    expect(root.querySelector('[role="alert"]')!.textContent).toBe("Taken");
  });

  it("read-only never opens", async () => {
    const host = await mount();
    const root = roots(host)[3]!;
    (root.querySelector("button") as HTMLElement).click();
    await tick();
    expect(root.getAttribute("data-state")).toBe("display");
    expect(root.querySelector('[role="group"]')).toBeNull();
  });
});
