import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

// jsbarcode loads from a CDN in a real page; here a stub on window stands in and records its input.
const calls: string[] = [];
(window as unknown as { JsBarcode: unknown }).JsBarcode = (el: SVGElement, value: string) => {
  calls.push(value);
  el.setAttribute("width", "200");
  el.setAttribute("height", "100");
  el.innerHTML = `<rect width="2" height="80"/>`;
};

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
  calls.length = 0;
});

async function mount(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

describe("barcode (Blade example)", () => {
  it("draws the barcode in the browser: named, left to right, with a viewBox and download buttons", async () => {
    const host = await mount(rendered("barcode"));
    const root = host.querySelector<HTMLElement>('[data-slot="barcode"]')!;
    expect(root.getAttribute("dir")).toBe("ltr");
    const svg = root.querySelector<SVGElement>('[data-slot="barcode-svg"]')!;
    expect(svg.getAttribute("role")).toBe("img");
    expect(svg.getAttribute("aria-label")).toBe("Code 128 barcode for NSQ-2026-0042");
    expect(svg.getAttribute("viewBox")).toBe("0 0 200 100");
    expect(svg.querySelector("rect")).not.toBeNull();
    expect(calls).toEqual(["NSQ-2026-0042"]);
    expect([...root.querySelectorAll('[data-slot="barcode-actions"] button')].map((b) => b.textContent?.trim())).toEqual(["Download SVG", "Download PNG"]);
    expect(root.querySelector<HTMLElement>('[role="alert"]')!.style.display).toBe("none");
  });

  it("shows the reason instead of drawing when the value does not fit, then redraws when fixed", async () => {
    const host = await mount(
      `<div data-slot="barcode" x-data="nqBarcode({ value: '123', format: 'EAN13' })"><p role="alert" x-show="message" x-text="message"></p><svg data-slot="barcode-svg" x-bind:aria-label="name"></svg></div>`,
    );
    const root = host.firstElementChild as HTMLElement;
    const alert = root.querySelector<HTMLElement>('[role="alert"]')!;
    expect(alert.textContent).toBe("This value has the wrong length for the format.");
    expect(calls).toEqual([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Alpine.$data(root) as any).value = "5901234123457";
    await tick();
    expect(alert.style.display).toBe("none");
    expect(calls).toEqual(["5901234123457"]);
  });

  it("the generator moves to the new format's example when the value no longer fits", async () => {
    const host = await mount(
      `<div data-slot="barcode-generator" x-data="nqBarcodeGenerator({})" x-init="$watch('format', (f) => setFormat(f))"><svg data-slot="barcode-svg"></svg></div>`,
    );
    const root = host.firstElementChild as HTMLElement;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = Alpine.$data(root) as any;
    expect(data.value).toBe("NSQ-2026-0042");
    data.format = "EAN13";
    await tick();
    expect(data.value).toBe("5901234123457");
    expect(data.hint).toBe("12 digits, or 13 with the check digit. Retail products.");
  });
});
