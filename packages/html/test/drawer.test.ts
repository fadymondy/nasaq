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

async function mount(name: string) {
  const host = document.createElement("div");
  host.innerHTML = rendered(name);
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

describe("sheet (Blade example)", () => {
  it("opens from the trigger, labels itself and closes", async () => {
    const host = await mount("sheet");
    const popup = () => document.querySelector<HTMLElement>('[data-slot="sheet-content"]')!;
    expect(popup().style.display).toBe("none");
    host.querySelector<HTMLButtonElement>('[data-slot="sheet-trigger"]')!.click();
    await tick();
    expect(popup().style.display).not.toBe("none");
    expect(popup().getAttribute("role")).toBe("dialog");
    const labelled = popup().getAttribute("aria-labelledby")!;
    expect(document.getElementById(labelled)).not.toBeNull();
    popup().dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await tick();
    expect(popup().style.display).toBe("none");
  });
});

describe("drawer (Blade example)", () => {
  it("opens, then a long drag on the handle closes it and a short one snaps back", async () => {
    const host = await mount("drawer");
    const popup = () => document.querySelector<HTMLElement>('[data-slot="drawer-content"]')!;
    host.querySelector<HTMLButtonElement>('[data-slot="drawer-trigger"]')!.click();
    await tick();
    expect(popup().style.display).not.toBe("none");
    expect(popup().getAttribute("role")).toBe("dialog");

    Object.defineProperty(popup(), "offsetHeight", { value: 400 });
    const handle = popup().querySelector<HTMLElement>('[data-slot="drawer-handle"]')!;
    const ev = (type: string, y: number, t: number) => {
      const e = new Event(type, { bubbles: true }) as Event & Record<string, unknown>;
      Object.assign(e, { clientY: y, pointerId: 1, pointerType: "touch", button: 0 });
      Object.defineProperty(e, "timeStamp", { value: t });
      handle.dispatchEvent(e);
    };
    ev("pointerdown", 100, 0);
    ev("pointermove", 120, 100);
    await tick();
    expect(popup().getAttribute("data-dragging")).toBe("");
    expect(popup().style.translate).toContain("20px");
    ev("pointerup", 120, 200);
    await tick();
    expect(popup().style.display).not.toBe("none");
    expect(popup().getAttribute("data-dragging")).toBeNull();

    // a drag past 30% of the (mocked) height closes: reduced motion is off, so wait out the slide.
    ev("pointerdown", 100, 1000);
    ev("pointermove", 300, 1500);
    ev("pointerup", 300, 2000);
    await new Promise((r) => setTimeout(r, 300));
    expect(popup().style.display).toBe("none");
  });

  it("closes on Escape", async () => {
    const host = await mount("drawer");
    const popup = () => document.querySelector<HTMLElement>('[data-slot="drawer-content"]')!;
    host.querySelector<HTMLButtonElement>('[data-slot="drawer-trigger"]')!.click();
    await tick();
    popup().dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await tick();
    expect(popup().style.display).toBe("none");
  });
});
