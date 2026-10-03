import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
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
  vi.useRealTimers();
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

const cards = (host: HTMLElement) => [...host.querySelectorAll<HTMLElement>("[data-slot=plugin-card]")];
const pointer = (el: Element, type: string, pointerType: string) => {
  const e = new Event(type, { bubbles: true }) as Event & { pointerType: string };
  e.pointerType = pointerType;
  el.dispatchEvent(e);
};

describe("plugin-card (Blade example)", () => {
  it("renders the cards with their activity and selection", async () => {
    const host = await mount(rendered("plugin-card"));
    const [a, b, c] = cards(host);
    expect(a!.dataset.activity).toBe("live");
    expect(b!.dataset.activity).toBe("recent");
    expect(c!.dataset.activity).toBe("never");
    expect(a!.dataset.selected).toBe("true");
    expect(b!.hasAttribute("data-selected")).toBe(false);
    expect(a!.querySelector("[data-slot=plugin-card-activity]")!.textContent).toContain("12 minutes ago");
    expect(c!.querySelector("[data-slot=plugin-card-activity]")!.textContent).toContain("No activity");
    expect(a!.querySelector("[data-slot=num]")!.textContent).toBe("128.4K");
    expect(b!.querySelector("[data-slot=plugin-card-metric]")).toBeNull();
  });

  it("toggles on a card click, not on links or the checkbox, and reports the change", async () => {
    const host = await mount(rendered("plugin-card"));
    const b = cards(host)[1]!;
    const seen: boolean[] = [];
    b.addEventListener("nq-change", (e) => seen.push((e as CustomEvent).detail.selected));
    b.querySelector<HTMLElement>("p")!.click();
    await tick();
    expect(b.dataset.selected).toBe("true");
    expect(b.className).toContain("border-primary");
    expect(b.querySelector("[role=checkbox]")!.getAttribute("aria-checked")).toBe("true");
    b.querySelector<HTMLAnchorElement>("a")!.addEventListener("click", (e) => e.preventDefault());
    b.querySelector<HTMLAnchorElement>("a")!.click();
    await tick();
    expect(b.dataset.selected).toBe("true");
    b.querySelector<HTMLElement>("[role=checkbox]")!.click();
    await tick();
    expect(b.hasAttribute("data-selected")).toBe(false);
    expect(b.className).toContain("border-border");
    expect(seen).toEqual([true, false]);
  });

  it("selects on a touch long press and swallows the click that follows", async () => {
    const host = await mount(rendered("plugin-card"));
    const b = cards(host)[1]!;
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    pointer(b, "pointerdown", "touch");
    vi.advanceTimersByTime(600);
    vi.useRealTimers();
    await tick();
    expect(b.dataset.selected).toBe("true");
    b.querySelector<HTMLElement>("p")!.click();
    await tick();
    expect(b.dataset.selected).toBe("true");
  });

  it("does not long-press with a mouse, or when released early", async () => {
    const host = await mount(rendered("plugin-card"));
    const b = cards(host)[1]!;
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    pointer(b, "pointerdown", "mouse");
    vi.advanceTimersByTime(600);
    pointer(b, "pointerdown", "touch");
    vi.advanceTimersByTime(200);
    pointer(b, "pointerup", "touch");
    vi.advanceTimersByTime(600);
    vi.useRealTimers();
    await tick();
    expect(b.hasAttribute("data-selected")).toBe(false);
  });
});
