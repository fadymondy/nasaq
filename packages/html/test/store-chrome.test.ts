// The Blade store-chrome example (packages/php/examples/rendered/store-chrome.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = () => new Promise((r) => setTimeout(r, 60));

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
  host.innerHTML = rendered("store-chrome");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const search = (h: HTMLElement) => h.querySelector<HTMLElement>('[data-slot="store-search"]')!;
const input = (h: HTMLElement) => search(h).querySelector<HTMLInputElement>('input[role="combobox"]')!;
const options = (h: HTMLElement) => [...search(h).querySelectorAll<HTMLElement>('[role="option"]')];

async function type(h: HTMLElement, text: string) {
  const i = input(h);
  i.focus();
  i.value = text;
  i.dispatchEvent(new Event("input", { bubbles: true }));
  await tick();
}
const key = (el: HTMLElement, k: string) => el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));

describe("store-chrome (Alpine)", () => {
  it("renders the header with its cart badge and labels", async () => {
    const h = await mount();
    expect(h.querySelector('[data-slot="store-header"]')).not.toBeNull();
    expect(h.querySelector('[aria-label="Cart, 2"]')?.textContent).toContain("2");
    expect(h.querySelector('[data-slot="store-mega-menu"]')).not.toBeNull();
  });

  it("suggests products with a price and wires the combobox state", async () => {
    const h = await mount();
    await type(h, "tee");
    const opts = options(h);
    expect(opts.length).toBeGreaterThan(0);
    expect(opts[0]!.textContent).toContain("Everyday tee");
    expect(opts[0]!.textContent).toContain("$29");
    expect(input(h).getAttribute("aria-expanded")).toBe("true");
  });

  it("moves with the arrow keys and fires nq-store-select-product on Enter", async () => {
    const h = await mount();
    await type(h, "hoodie");
    const picked: string[] = [];
    h.addEventListener("nq-store-select-product", (e) => {
      e.preventDefault();
      picked.push((e as CustomEvent<{ product: { id: string } }>).detail.product.id);
    });
    key(input(h), "ArrowDown");
    await tick();
    expect(input(h).getAttribute("aria-activedescendant")).toBeTruthy();
    key(input(h), "Enter");
    await tick();
    expect(picked).toEqual(["hoodie"]);
  });

  it("closes the list on Escape", async () => {
    const h = await mount();
    await type(h, "tee");
    key(input(h), "Escape");
    await tick();
    expect(input(h).getAttribute("aria-expanded")).toBe("false");
  });

  it("steps the announcement bar by hand and dismisses it", async () => {
    const h = await mount();
    const bar = h.querySelector<HTMLElement>('[data-slot="store-announcement-bar"]')!;
    expect(bar.textContent).toContain("Free shipping");
    bar.querySelector<HTMLButtonElement>('[aria-label="Next announcement"]')!.click();
    await tick();
    expect(bar.querySelector("a")?.textContent).toContain("30-day returns");
    const seen: string[] = [];
    h.addEventListener("nq-store-dismiss", (e) => seen.push((e as CustomEvent<{ id: string }>).detail.id));
    bar.querySelector<HTMLButtonElement>('[aria-label="Dismiss announcement"]')!.click();
    await tick();
    expect(seen).toEqual(["returns"]);
    expect(bar.textContent).toContain("Free shipping");
  });

  it("validates the newsletter email, then subscribes and reports it", async () => {
    const h = await mount();
    const form = h.querySelector<HTMLFormElement>('[data-slot="store-newsletter"]')!;
    const field = form.querySelector<HTMLInputElement>("input")!;
    const status = form.querySelector<HTMLElement>('[role="status"]')!;
    field.value = "nope";
    field.dispatchEvent(new Event("input", { bubbles: true }));
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick();
    expect(status.textContent).toContain("valid email");
    expect(field.getAttribute("aria-invalid")).toBe("true");

    const got: string[] = [];
    h.addEventListener("nq-store-subscribe", (e) => {
      const d = (e as CustomEvent<{ email: string; promise?: Promise<void> }>).detail;
      got.push(d.email);
      d.promise = Promise.resolve();
    });
    field.value = "ada@example.com";
    field.dispatchEvent(new Event("input", { bubbles: true }));
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick();
    expect(got).toEqual(["ada@example.com"]);
    expect(status.textContent).toContain("You are subscribed");
  });
});
