import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";
import { applyBrand, darkVariant, hexToHSL, hslToHex, readableOn } from "../src/alpine/branding-logic";

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

async function mount(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

describe("branding helpers", () => {
  it("convert and pick readable colours", () => {
    expect(hexToHSL("#ff0000")).toEqual({ h: 0, s: 100, l: 50 });
    expect(hslToHex({ h: 0, s: 100, l: 50 })).toBe("#FF0000");
    expect(readableOn("#FFFFFF")).toBe("#0E1A3C");
    expect(readableOn("#0A2540")).toBe("#F0EBE1");
    expect(hexToHSL(darkVariant("#0A3D2E")!)!.l).toBeGreaterThanOrEqual(62);
    const el = document.createElement("div");
    document.body.append(el);
    const undo = applyBrand(el, { brand: "#0a7c66", accent: "nope" });
    expect(el.style.getPropertyValue("--nq-brand-l")).toBe("#0A7C66");
    expect(el.style.getPropertyValue("--nq-accent-brand")).toBe("");
    undo();
    expect(el.hasAttribute("data-brand")).toBe(false);
    el.remove();
  });
});

describe("branding-provider (Blade example)", () => {
  it("scopes the colours to the target and shares the name", async () => {
    const host = await mount(rendered("branding-provider"));
    const scope = host.querySelector<HTMLElement>("#branding-demo")!;
    expect(scope.style.getPropertyValue("--nq-brand-l")).toBe("#0A7C66");
    expect(scope.style.getPropertyValue("--nq-action-l")).toBe("#0A7C66");
    expect(scope.getAttribute("data-brand")).toBe("runtime");
    expect(host.querySelector("span[x-text]")!.textContent).toBe("Acme Clinic");
    expect(host.querySelector<HTMLElement>("img")!.style.display).toBe("none");
  });

  it("set() recolours at runtime and cleanup removes the variables", async () => {
    const host = await mount(
      `<div data-slot="branding-provider" class="contents" x-data="nqBrandingProvider({ brand: '#0A7C66' }, '#t')"><div id="t"></div><button x-on:click="set({ brand: '#112233', logoUrl: '/l.png' })">go</button><img x-show="logoUrl" x-bind:src="logoUrl"></div>`,
    );
    const t = host.querySelector<HTMLElement>("#t")!;
    host.querySelector("button")!.click();
    await tick();
    expect(t.style.getPropertyValue("--nq-brand-l")).toBe("#112233");
    expect(host.querySelector("img")!.getAttribute("src")).toBe("/l.png");
    Alpine.destroyTree(host);
    expect(t.style.getPropertyValue("--nq-brand-l")).toBe("");
  });
});
