// The Blade currency-input example (packages/php/examples/rendered/tag-input.html) under real Alpine.
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
  host.innerHTML = rendered("currency-input");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}


const field = () => document.querySelector<HTMLInputElement>('[data-slot="input-group-input"]')!;
const hidden = () => document.querySelector<HTMLInputElement>('input[type="hidden"][name="fee"]')!;
const root = () => document.querySelector<HTMLElement>('[data-slot="currency-input"]')!;

async function type(text: string) {
  field().focus();
  await tick();
  field().value = text;
  field().dispatchEvent(new Event("input", { bubbles: true }));
  await tick();
}
async function key(k: string, shiftKey = false) {
  field().dispatchEvent(new KeyboardEvent("keydown", { key: k, shiftKey, bubbles: true, cancelable: true }));
  await tick();
}

describe("currency-input (Blade example)", () => {
  it("shows the stored amount grouped and padded, with a symbol and placeholder", async () => {
    await mount();
    expect(field().value).toBe("19.99");
    expect(document.querySelector('[data-slot="currency-symbol"]')!.textContent?.trim()).toBe("$");
    expect(field().getAttribute("inputmode")).toBe("decimal");
    expect(hidden().value).toBe("1999");
  });

  it("turns typed text into minor units and stops at the currency decimals", async () => {
    await mount();
    await type("12.345");
    expect(hidden().value).toBe("1234");
    expect(field().value).toBe("12.34");
  });

  it("reads Arabic-Indic digits and refuses letters", async () => {
    await mount();
    await type("١٢٫٥");
    expect(hidden().value).toBe("1250");
    await type("12abc");
    expect(hidden().value).toBe("1200");
  });

  it("groups and pads the figure on blur", async () => {
    await mount();
    await type("1250.5");
    field().blur();
    await tick();
    expect(field().value).toBe("1,250.50");
  });

  it("steps with the arrow keys and Shift", async () => {
    await mount();
    await key("ArrowUp");
    expect(hidden().value).toBe("2099");
    await key("ArrowDown", true);
    expect(hidden().value).toBe("1099");
  });

  it("converts the amount when the picker changes currency and announces it", async () => {
    await mount();
    let detail: unknown;
    root().addEventListener("currency-change", (e) => (detail = (e as CustomEvent).detail));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (Alpine as any).$data(root());
    data.currency = "KWD";
    await tick();
    expect(detail).toEqual({ currency: "KWD", minor: 19990 });
    expect(hidden().value).toBe("19990");
    await tick();
    expect(root().getAttribute("data-currency")).toBe("KWD");
  });
});
