// The Blade country-flag example (packages/php/examples/rendered/country-flag.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = () => new Promise((r) => setTimeout(r, 30));
const SVG = '<svg viewBox="0 0 3 2"><rect width="3" height="2"/></svg>';

beforeAll(() => {
  Alpine.plugin(nasaq);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).Alpine = Alpine;
  Alpine.start();
});

afterEach(() => {
  vi.unstubAllGlobals();
  for (const el of [...document.body.children]) {
    Alpine.destroyTree(el as HTMLElement);
    el.remove();
  }
});

describe("country-flag (Blade example)", () => {
  it("renders the frame, then fills it with the fetched svg", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, text: async () => SVG }));
    vi.stubGlobal("fetch", fetchMock);
    const host = document.createElement("div");
    host.innerHTML = rendered("country-flag");
    const flag = host.querySelector<HTMLElement>('[data-slot="country-flag"]')!;
    expect(flag.getAttribute("aria-hidden")).toBe("true");
    expect(flag.className).toContain("aspect-[3/2]");
    expect(flag.querySelector("svg")).toBeNull();

    document.body.append(host);
    Alpine.initTree(host);
    await tick();
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/SA.svg"));
    expect(flag.querySelector("svg")).not.toBeNull();
  });

  it("an unknown code stays an empty frame", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, text: async () => "" })));
    const host = document.createElement("div");
    host.innerHTML = '<span data-slot="country-flag" x-data="nqCountryFlag(\'QQ\')" x-html="svg"></span>';
    document.body.append(host);
    Alpine.initTree(host);
    await tick();
    expect(host.querySelector("svg")).toBeNull();
  });
});
