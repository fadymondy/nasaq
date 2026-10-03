// The Blade slider example under real Alpine with the Nasaq runtime.
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

async function mount(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const key = (el: Element, k: string) => el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));

describe("slider (Alpine)", () => {
  it("renders a labelled thumb at the initial value", async () => {
    const host = await mount(rendered("slider"));
    const thumb = host.querySelector('[data-slot="slider-thumb"]')!;
    expect(thumb.getAttribute("role")).toBe("slider");
    expect(thumb.getAttribute("aria-valuenow")).toBe("40");
    expect(thumb.getAttribute("aria-valuetext")).toBe("40");
    expect(host.querySelector('[data-slot="slider-value"]')!.textContent).toBe("40");
    expect(thumb.getAttribute("aria-labelledby")).toBe(host.querySelector("span.text-label")!.id);
  });

  it("moves with the keyboard and updates the value label and range", async () => {
    const host = await mount(rendered("slider"));
    const thumb = host.querySelector('[data-slot="slider-thumb"]')!;
    key(thumb, "ArrowRight");
    await tick();
    expect(thumb.getAttribute("aria-valuenow")).toBe("41");
    expect(host.querySelector('[data-slot="slider-value"]')!.textContent).toBe("41");
    key(thumb, "End");
    await tick();
    expect(thumb.getAttribute("aria-valuenow")).toBe("100");
    key(thumb, "Home");
    await tick();
    expect(thumb.getAttribute("aria-valuenow")).toBe("0");
    key(thumb, "PageUp");
    await tick();
    expect(thumb.getAttribute("aria-valuenow")).toBe("10");
    expect((host.querySelector('[data-slot="slider-range"]') as HTMLElement).getAttribute("style")).toContain("calc(100% - calc(10%");
  });

  it("flips the arrow keys in RTL", async () => {
    document.documentElement.dir = "rtl";
    try {
      const host = await mount(rendered("slider"));
      const thumb = host.querySelector('[data-slot="slider-thumb"]')!;
      key(thumb, "ArrowLeft");
      await tick();
      expect(thumb.getAttribute("aria-valuenow")).toBe("41");
      key(thumb, "ArrowRight");
      await tick();
      expect(thumb.getAttribute("aria-valuenow")).toBe("40");
    } finally {
      document.documentElement.removeAttribute("dir");
    }
  });

  it("keeps range thumbs apart and formats values", async () => {
    const host = await mount(`
      <div x-data="nqSlider({ value: [20, 30], min: 0, max: 100, step: 5, minStepsBetweenThumbs: 1, format: { style: 'currency', currency: 'USD', maximumFractionDigits: 0 } })">
        <output x-text="text"></output>
        <div x-ref="track">
          <div data-slot="slider-thumb" tabindex="0" :aria-valuetext="fmt(values[0])" x-on:keydown="key($event, 0)"></div>
          <div data-slot="slider-thumb" tabindex="0" :aria-valuetext="fmt(values[1])" x-on:keydown="key($event, 1)"></div>
        </div>
      </div>`);
    const [a, b] = host.querySelectorAll('[data-slot="slider-thumb"]');
    expect(host.querySelector("output")!.textContent).toBe("$20 – $30");
    key(a!, "PageUp");
    await tick();
    expect(a!.getAttribute("aria-valuetext")).toBe("$25");
    key(b!, "Home");
    await tick();
    expect(b!.getAttribute("aria-valuetext")).toBe("$30");
  });
});
