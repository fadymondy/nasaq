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

describe("resizable (Blade example)", () => {
  it("sets aria values and resizes with the keyboard", async () => {
    const host = document.createElement("div");
    host.innerHTML = rendered("resizable");
    document.body.append(host);
    Alpine.initTree(host);
    await tick();

    const panels = [...host.querySelectorAll<HTMLElement>('[data-slot="resizable-panel"]')];
    const handle = host.querySelector<HTMLElement>('[data-slot="resizable-handle"]')!;
    expect(panels.length).toBeGreaterThanOrEqual(2);
    expect(handle.getAttribute("role")).toBe("separator");
    expect(handle.getAttribute("aria-valuenow")).toBe("30");
    expect(handle.dataset.separator).toBe("inactive");

    const sizeOf = (p: HTMLElement) => parseFloat(p.style.flex);
    expect(sizeOf(panels[0]!)).toBeCloseTo(30);
    handle.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
    expect(sizeOf(panels[0]!)).toBeCloseTo(40);
    expect(sizeOf(panels[1]!)).toBeCloseTo(60);
    handle.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true, cancelable: true }));
    expect(sizeOf(panels[0]!)).toBeGreaterThanOrEqual(0);
    expect(handle.getAttribute("aria-valuenow")).toBe(String(Math.round(sizeOf(panels[0]!))));
  });
});
