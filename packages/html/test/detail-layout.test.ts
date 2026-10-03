import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import nasaq from "../src/alpine";
import { groupDetailTabs, stepDetailTab } from "../src/alpine/detail-layout-logic";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

beforeAll(() => {
  Alpine.plugin(nasaq);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).Alpine = Alpine;
  Alpine.start();
});

afterEach(() => {
  vi.restoreAllMocks();
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
const side = (host: HTMLElement) => [...host.querySelector("[data-slot=detail-layout]")!.querySelectorAll<HTMLElement>("[data-slot=detail-sidebar] [data-slot=detail-tab]")];
const bar = (host: HTMLElement) => [...host.querySelector("[data-slot=detail-layout]")!.querySelectorAll<HTMLElement>("[data-slot=detail-tabbar] [data-slot=detail-tab]")];
const panels = (host: HTMLElement) => [...host.querySelector("[data-slot=detail-layout]")!.querySelectorAll<HTMLElement>("[data-slot=detail-panel]")];

describe("detail-layout logic", () => {
  const tabs = [{ key: "a" }, { key: "b", section: "S" }, { key: "c", section: "S", disabled: true }, { key: "d", section: "T" }];
  it("groups by section, unsectioned first", () => {
    expect(groupDetailTabs(tabs).map((g) => [g.section, g.tabs.map((t) => t.key)])).toEqual([
      [null, ["a"]],
      ["S", ["b", "c"]],
      ["T", ["d"]],
    ]);
  });
  it("steps over disabled tabs and wraps", () => {
    expect(stepDetailTab(tabs, "b", 1)?.key).toBe("d");
    expect(stepDetailTab(tabs, "d", 1)?.key).toBe("a");
    expect(stepDetailTab(tabs, "a", -1)?.key).toBe("d");
    expect(stepDetailTab(tabs, "a", "last")?.key).toBe("d");
    expect(stepDetailTab([], "a", 1)).toBeUndefined();
  });
});

describe("detail-layout (Blade example)", () => {
  it("renders the groups, the active tab and its panel", async () => {
    const host = await mount(rendered("detail-layout"));
    expect(side(host).slice(0, 4).map((b) => b.dataset.key)).toEqual(["overview", "logs", "settings", "billing"]);
    expect(side(host)[0]!.getAttribute("aria-current")).toBe("page");
    expect(side(host)[1]!.hasAttribute("aria-current")).toBe(false);
    expect(side(host)[3]!.hasAttribute("disabled")).toBe(true);
    expect(panels(host).map((p) => p.style.display)).toEqual(["", "none", "none"]);
    expect(host.querySelector("[data-slot=detail-hero] h1")!.textContent).toBe("Postgres");
  });

  it("switches panels on click, keeps one tab in the tab order and reports the change", async () => {
    const host = await mount(rendered("detail-layout"));
    const root = host.querySelector<HTMLElement>("[data-slot=detail-layout]")!;
    const seen: string[] = [];
    root.addEventListener("nq-change", (e) => seen.push((e as CustomEvent).detail.value));
    side(host)[1]!.click();
    await tick();
    expect(panels(host).map((p) => p.style.display)).toEqual(["none", "", "none"]);
    expect(side(host)[1]!.dataset.active).toBe("true");
    expect(bar(host)[1]!.getAttribute("aria-current")).toBe("page");
    expect(side(host).filter((b) => b.tabIndex === 0)).toHaveLength(1);
    expect(side(host)[1]!.tabIndex).toBe(0);
    expect(seen).toEqual(["logs"]);
  });

  it("moves with the arrows, skips disabled tabs and jumps with Home and End", async () => {
    const host = await mount(rendered("detail-layout"));
    const tabs = side(host);
    tabs[0]!.focus();
    key(tabs[0]!, "ArrowDown");
    await tick();
    expect(document.activeElement).toBe(tabs[1]);
    key(tabs[1]!, "ArrowDown");
    await tick();
    expect(document.activeElement).toBe(tabs[2]);
    key(tabs[2]!, "ArrowDown");
    await tick();
    expect(document.activeElement).toBe(tabs[0]);
    key(tabs[0]!, "End");
    await tick();
    expect(document.activeElement).toBe(tabs[2]);
    key(tabs[2]!, "Home");
    await tick();
    expect(document.activeElement).toBe(tabs[0]);
    expect(panels(host).map((p) => p.style.display)).toEqual(["", "none", "none"]);
  });

  it("uses left and right in the small-screen bar, flipped in RTL", async () => {
    const host = await mount(rendered("detail-layout"));
    const tabs = bar(host);
    key(tabs[0]!, "ArrowRight");
    await tick();
    expect(panels(host)[1]!.style.display).toBe("");
    expect(document.activeElement).toBe(tabs[1]);
    const real = window.getComputedStyle.bind(window);
    vi.spyOn(window, "getComputedStyle").mockImplementation((el: Element, pseudo?: string | null) => {
      const style = real(el, pseudo);
      return new Proxy(style, { get: (t, p) => (p === "direction" ? "rtl" : Reflect.get(t, p)) });
    });
    key(tabs[1]!, "ArrowLeft");
    await tick();
    expect(document.activeElement).toBe(tabs[2]);
  });

  it("shows the loading and error states with a retry", async () => {
    const host = await mount(rendered("detail-layout"));
    const layouts = host.querySelectorAll("[data-slot=detail-layout]");
    expect(layouts[1]!.querySelector("[data-slot=loading-state]")).not.toBeNull();
    expect(layouts[1]!.querySelector("[data-slot=detail-hero]")!.getAttribute("aria-hidden")).toBe("true");
    expect(layouts[2]!.querySelector("[data-slot=error-state]")!.textContent).toContain("This page could not load");
    expect(layouts[2]!.querySelector("[data-slot=error-state] button")!.textContent).toContain("Try again");
  });
});
