// The Blade cash-collect example (packages/php/examples/rendered/cash-collect.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = () => new Promise((r) => setTimeout(r, 40));

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
  host.innerHTML = rendered("cash-collect");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const root = (h: HTMLElement) => h.querySelector<HTMLElement>('[data-slot="cash-collect"]')!;
const status = (h: HTMLElement) => h.querySelector<HTMLElement>('[data-slot="cash-status"]')!;
const field = (h: HTMLElement) => h.querySelector<HTMLInputElement>('[data-slot="input-group-input"]')!;
const confirm = (h: HTMLElement) => [...h.querySelectorAll<HTMLButtonElement>("button")].at(-1)!;
const visible = (el: Element) => (el as HTMLElement).style.display !== "none";
async function type(h: HTMLElement, text: string) {
  field(h).focus();
  await tick();
  field(h).value = text;
  field(h).dispatchEvent(new Event("input", { bubbles: true }));
  await tick();
}

describe("cash-collect (Blade example)", () => {
  it("renders the breakdown, an idle status line and a disabled confirm", async () => {
    const h = await mount();
    expect(root(h).getAttribute("data-state")).toBe("unpaid");
    expect(h.querySelector('[data-slot="cash-breakdown"]')!.textContent).toContain("$100.00");
    expect(status(h).getAttribute("data-tone")).toBe("idle");
    expect(status(h).textContent).toContain("Nothing received yet");
    expect(confirm(h).disabled).toBe(true);
    expect(confirm(h).hasAttribute("data-disabled")).toBe(true);
  });

  it("says what is still owed when short, and keeps confirm disabled", async () => {
    const h = await mount();
    await type(h, "70");
    expect(root(h).getAttribute("data-state")).toBe("short");
    expect(status(h).getAttribute("data-tone")).toBe("short");
    expect(status(h).textContent).toContain("Still owed:");
    expect(status(h).textContent).toContain("$30.00");
    expect(confirm(h).disabled).toBe(true);
  });

  it("states the change to return when over, and confirms with the amount received", async () => {
    const h = await mount();
    let detail: { collectedMinor: number } | null = null;
    root(h).addEventListener("nq-cash-collect-confirm", (e) => (detail = (e as CustomEvent).detail));
    await type(h, "120");
    expect(status(h).getAttribute("data-tone")).toBe("over");
    expect(status(h).textContent).toContain("Change to return:");
    expect(status(h).textContent).toContain("$20.00");
    expect(confirm(h).disabled).toBe(false);
    expect(confirm(h).hasAttribute("data-disabled")).toBe(false);
    confirm(h).click();
    await tick();
    expect(detail).toEqual({ collectedMinor: 12000 });
  });

  it("fills the amount from a quick button and shows the exact state", async () => {
    const h = await mount();
    const quick = h.querySelector<HTMLButtonElement>('[role="group"] button')!;
    expect(quick.getAttribute("aria-pressed")).toBe("false");
    quick.click();
    await tick();
    expect(quick.getAttribute("aria-pressed")).toBe("true");
    expect(field(h).value).toBe("100.00");
    expect(status(h).getAttribute("data-tone")).toBe("exact");
    expect(status(h).textContent).toContain("Exact amount");
    expect(confirm(h).disabled).toBe(false);
    const icons = [...status(h).querySelectorAll(":scope > span[x-show]")].filter(visible);
    expect(icons).toHaveLength(1);
  });
});
