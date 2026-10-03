import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";
import { applyThemePreset, THEME_PRESETS, themePresetSwatches, themePresetVars, themeTextOn, themeToHex } from "../src/alpine/theme-presets-logic";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

beforeAll(() => {
  Alpine.plugin(nasaq);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).Alpine = Alpine;
  Alpine.start();
});

beforeEach(() => localStorage.removeItem("nasaq-theme-preset"));

afterEach(() => {
  for (const el of [...document.body.children]) {
    Alpine.destroyTree(el as HTMLElement);
    el.remove();
  }
  document.documentElement.removeAttribute("style");
});

async function mount(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (el: Element) => Alpine.$data(el as HTMLElement) as any;

describe("theme-presets logic", () => {
  it("has eight presets and computes variables", () => {
    expect(THEME_PRESETS.map((p) => p.id)).toContain("rose-light");
    expect(THEME_PRESETS).toHaveLength(8);
    expect(themeToHex("abc")).toBe("#AABBCC");
    expect(themeToHex("nope")).toBeUndefined();
    expect(themeTextOn("#FFFFFF")).toBe("#0E1A3C");
    const vars = themePresetVars(THEME_PRESETS.find((p) => p.id === "purple")!);
    expect(vars["--nq-brand-l"]).toBe("#7C3AED");
    expect(vars["--nq-brand-d"]).toBe("#9B6DF5");
    expect(themePresetSwatches(THEME_PRESETS[0]!)[0]).toBe("#0B1429");
  });
  it("applies and removes the variables, scoped roots get data-brand", () => {
    const el = document.createElement("div");
    document.body.append(el);
    const undo = applyThemePreset(el, THEME_PRESETS.find((p) => p.id === "rose")!);
    expect(el.style.getPropertyValue("--nq-brand-l")).toBe("#E11D48");
    expect(el.getAttribute("data-brand")).toBe("runtime");
    undo();
    expect(el.style.getPropertyValue("--nq-brand-l")).toBe("");
    expect(el.hasAttribute("data-brand")).toBe(false);
    el.remove();
  });
});

describe("theme-presets (Blade example)", () => {
  it("renders the gallery and the scope", async () => {
    const host = await mount(rendered("theme-presets"));
    expect(host.querySelectorAll("[data-slot=theme-card]")).toHaveLength(8);
    const scope = host.querySelector<HTMLElement>("[data-slot=theme-preset-scope] [data-brand=runtime]")!;
    expect(scope.getAttribute("style")).toContain("--nq-brand-l: #E11D48");
    expect(host.querySelector("[data-slot=theme-card][aria-checked=true]")!.textContent).toContain("Purple light");
  });

  it("follows the preset: stores, applies to the page and reports the change", async () => {
    const host = await mount(`<div x-data="nqThemePreset({ defaultValue: 'nasaq' })"></div>`);
    const root = host.firstElementChild as HTMLElement;
    let detail: unknown;
    root.addEventListener("nq-change", (e) => (detail = (e as CustomEvent).detail));
    const d = data(root);
    d.presetId = "emerald-light";
    await tick();
    expect(localStorage.getItem("nasaq-theme-preset")).toBe("emerald-light");
    expect(document.documentElement.style.getPropertyValue("--nq-brand-l")).toBe("#059669");
    expect(d.mode).toBe("light");
    expect(d.scopeStyle).toContain("--nq-brand: var(--nq-brand-l)");
    expect(detail).toEqual({ value: "emerald-light" });
  });

  it("restores a stored choice and ignores an unknown one", async () => {
    localStorage.setItem("nasaq-theme-preset", "rose");
    let host = await mount(`<div x-data="nqThemePreset({ apply: false })"></div>`);
    expect(data(host.firstElementChild!).presetId).toBe("rose");
    localStorage.setItem("nasaq-theme-preset", "bogus");
    host = await mount(`<div x-data="nqThemePreset({ apply: false })"></div>`);
    expect(data(host.firstElementChild!).presetId).toBe("nasaq");
    expect(document.documentElement.style.getPropertyValue("--nq-brand-l")).toBe("");
  });
});
