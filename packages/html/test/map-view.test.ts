// The Blade map-view example (packages/php/examples/rendered/map-view.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = () => new Promise((r) => setTimeout(r, 40));

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 800 });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => 450 });
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
  host.innerHTML = rendered("map-view");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host.querySelector<HTMLElement>("[data-slot=map-view]")!;
}
const visible = (el: Element | null) => !!el && (el as HTMLElement).style.display !== "none";

describe("map-view", () => {
  it("renders the map, a pin, a route, tiles and the attribution", async () => {
    const map = await mount();
    expect(map.getAttribute("dir")).toBe("ltr");
    expect(map.querySelectorAll("[data-pin]")).toHaveLength(1);
    expect(map.querySelector("[data-pin=v1]")!.getAttribute("aria-label")).toBe("Van 12");
    expect(map.querySelector("[data-slot=map-routes] [data-route=r1]")).not.toBeNull();
    expect(map.querySelectorAll("img").length).toBeGreaterThan(0);
    expect(map.textContent).toContain("© Example maps");
  });

  it("selects a pin, shows the card and closes it", async () => {
    const map = await mount();
    let id: string | null | undefined;
    map.addEventListener("nq-map-select", (e) => (id = (e as CustomEvent).detail.id));
    (map.querySelector("[data-pin=v1]") as HTMLElement).click();
    await tick();
    expect(id).toBe("v1");
    const card = map.querySelector("[data-slot=map-card]")!;
    expect(card.textContent).toContain("Van 12");
    expect(card.textContent).toContain("Moving");
    expect(card.textContent).toContain("24.71360");
    (card.querySelector("button[aria-label=Close]") as HTMLElement).click();
    await tick();
    expect(map.querySelector("[data-slot=map-card]")).toBeNull();
  });

  it("zooms with the buttons and the keyboard", async () => {
    const map = await mount();
    const views: number[] = [];
    map.addEventListener("nq-map-view", (e) => views.push((e as CustomEvent).detail.view.zoom));
    (map.querySelector("button[aria-label='Zoom in']") as HTMLElement).click();
    await tick();
    map.dispatchEvent(new KeyboardEvent("keydown", { key: "-", bubbles: true }));
    await tick();
    expect(views).toHaveLength(2);
    expect(views[0]).toBeGreaterThan(views[1]!);
  });

  it("opens the layers panel and hides a layer", async () => {
    const map = await mount();
    const legend = map.querySelector("[data-slot=map-legend]")!;
    expect(visible(legend)).toBe(true);
    (legend.querySelector("button") as HTMLElement).click();
    await tick();
    const box = legend.querySelector("input[type=checkbox]") as HTMLInputElement;
    expect(box.checked).toBe(true);
    box.checked = false;
    box.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect(map.querySelectorAll("[data-pin]")).toHaveLength(0);
  });

  it("emits a map click for a tap on empty ground", async () => {
    const map = await mount();
    let point: { lat: number } | undefined;
    map.addEventListener("nq-map-click", (e) => (point = (e as CustomEvent).detail.point));
    map.dispatchEvent(new MouseEvent("pointerdown", { button: 0, clientX: 10, clientY: 10, bubbles: true }));
    map.dispatchEvent(new MouseEvent("pointerup", { button: 0, clientX: 10, clientY: 10, bubbles: true }));
    await tick();
    expect(typeof point?.lat).toBe("number");
  });
});
