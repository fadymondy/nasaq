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

async function mount(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

describe("qr-code (Blade example)", () => {
  it("draws the code in the browser: modules, three eyes, named, left to right", async () => {
    const host = await mount(rendered("qr-code"));
    const root = host.querySelector<HTMLElement>('[data-slot="qr-code"]')!;
    expect(root.getAttribute("dir")).toBe("ltr");
    const svg = root.querySelector<SVGElement>('[data-slot="qr-code-svg"]')!;
    expect(svg.getAttribute("role")).toBe("img");
    expect(svg.getAttribute("aria-label")).toBe("QR code for https://nasaq.fadymondy.com");
    expect(svg.getAttribute("viewBox")).toMatch(/^0 0 (\d+) \1$/);
    expect(svg.getAttribute("shape-rendering")).toBe("crispEdges");
    expect(svg.style.background).toBe("white");
    const paths = [...svg.querySelectorAll("path")];
    expect(paths).toHaveLength(7);
    expect(paths.every((p) => (p.getAttribute("d") ?? "").length > 10)).toBe(true);
    expect(paths[0]!.getAttribute("fill")).toBe("black");
    expect(svg.querySelectorAll("g")).toHaveLength(3);
    expect(svg.querySelector<HTMLElement>("image")!.style.display).toBe("none");
  });

  it("has the two download buttons and no error", async () => {
    const host = await mount(rendered("qr-code"));
    const buttons = [...host.querySelectorAll('[data-slot="qr-code-actions"] button')];
    expect(buttons.map((b) => b.textContent?.trim())).toEqual(["Download SVG", "Download PNG"]);
    expect(host.querySelector<HTMLElement>('[role="alert"]')!.style.display).toBe("none");
  });

  it("redraws when the value changes (x-model drives it)", async () => {
    const host = await mount(rendered("qr-code"));
    const root = host.querySelector<HTMLElement>('[data-slot="qr-code"]')!;
    const svg = root.querySelector("svg")!;
    const before = svg.querySelector("path")!.getAttribute("d");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Alpine.$data(root) as any).value = "a completely different payload";
    await tick();
    expect(svg.querySelector("path")!.getAttribute("d")).not.toBe(before);
    expect(svg.getAttribute("aria-label")).toBe("QR code for a completely different payload");
  });
});
