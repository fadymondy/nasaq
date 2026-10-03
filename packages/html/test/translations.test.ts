import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";
import { createTranslator, translationsInterpolate, translationsLocaleChain, translationsLookup } from "../src/alpine/translations-logic";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

beforeAll(() => {
  Alpine.plugin(nasaq);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).Alpine = Alpine;
  Alpine.start();
});

beforeEach(() => {
  localStorage.removeItem("nasaq-locale");
  (Alpine.store("nq") as { setLocale(l: string): void }).setLocale("en");
});

afterEach(() => {
  for (const el of [...document.body.children]) {
    Alpine.destroyTree(el as HTMLElement);
    el.remove();
  }
});

async function mount(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const texts = (host: HTMLElement) => [...host.querySelectorAll("[data-slot=translations-text]")].map((e) => e.textContent);

describe("translations logic", () => {
  const bundle = {
    en: { a: { b: "Deep" }, n_one: "{count} thing", n_other: "{count} things", hi: "Hi {{name}}" },
    ar: { n_zero: "none", n_two: "two things", hi: "اهلا {name}" },
  };
  it("looks up nested, flat and namespaced keys", () => {
    expect(translationsLookup(bundle.en, "a.b")).toBe("Deep");
    expect(translationsLookup(bundle.en, "a:b")).toBe("Deep");
    expect(translationsLookup(bundle.en, "x")).toBeUndefined();
  });
  it("interpolates and builds the locale chain", () => {
    expect(translationsInterpolate("Hi {name} {x}", { name: "Sara" })).toBe("Hi Sara {x}");
    expect(translationsLocaleChain("ar-EG")).toEqual(["ar-EG", "ar", "en"]);
  });
  it("translates with plurals and fallbacks", () => {
    const tEn = createTranslator(bundle, "en");
    expect(tEn("n", { count: 1 })).toBe("1 thing");
    expect(tEn("n", { count: 3 })).toBe("3 things");
    expect(tEn("nope", { defaultValue: "Fallback" })).toBe("Fallback");
    const tAr = createTranslator(bundle, "ar");
    expect(tAr("n", { count: 0 })).toBe("none");
    expect(tAr("n", { count: 2 })).toBe("two things");
    expect(tAr("a.b")).toBe("Deep");
  });
});

describe("translations (Blade example)", () => {
  it("follows the locale and remembers the choice", async () => {
    const host = await mount(rendered("translations"));
    expect(texts(host)).toEqual(["Hello, Sara", "1 item in your cart", "3 items in your cart", "Fallback text"]);
    const [en, ar] = host.querySelectorAll<HTMLButtonElement>("button");
    ar!.click();
    await tick();
    expect(localStorage.getItem("nasaq-locale")).toBe("ar");
    expect(texts(host)[0]).toBe("مرحبا، Sara");
    expect(texts(host)[1]).toBe("منتج واحد في سلتك");
    expect(texts(host)[2]!.includes("منتجات")).toBe(true);
    en!.click();
    await tick();
    expect(texts(host)[0]).toBe("Hello, Sara");
  });

  it("restores a stored locale, and seeds only when nothing is stored", async () => {
    localStorage.setItem("nasaq-locale", "ar");
    const host = await mount(rendered("translations"));
    expect(texts(host)[0]).toBe("مرحبا، Sara");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = Alpine.$data(host.firstElementChild as HTMLElement) as any;
    expect(d.hasStoredLocale()).toBe(true);
    d.seedLocale("en");
    expect(d.locale).toBe("ar");
    localStorage.removeItem("nasaq-locale");
    expect(d.hasStoredLocale()).toBe(false);
    d.seedLocale("en");
    await tick();
    expect(d.locale).toBe("en");
    expect(localStorage.getItem("nasaq-locale")).toBeNull();
  });
});
