// The Blade mobile-nav-kit example under real Alpine: the filter strip, the swipe row and the bottom tab bar.
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();

const chips = () => [...document.querySelectorAll<HTMLElement>('[data-slot="filter-strip"] button')];
const tabs = () => [...document.querySelectorAll<HTMLElement>("[data-tab-item]")];
const row = () => document.querySelector<HTMLElement>('[data-slot="swipe-action-row"]')!;

describe("mobile-nav-kit (Blade example)", () => {
  it("the filter strip presses one chip at a time and fires nq-change", async () => {
    await mount("mobile-nav-kit");
    expect(chips().map((c) => c.getAttribute("aria-pressed"))).toEqual(["true", "false", "false"]);
    let value = "";
    document.querySelector('[data-slot="filter-strip"]')!.addEventListener("nq-change", (e) => (value = (e as CustomEvent).detail.value));
    chips()[1]!.click();
    await tick();
    expect(chips().map((c) => c.getAttribute("aria-pressed"))).toEqual(["false", "true", "false"]);
    expect(value).toBe("open");
    expect(chips()[1]!.className).toContain("bg-primary");
  });

  it("the tab bar marks the active tab, shows the badge and moves with the keyboard", async () => {
    await mount("mobile-nav-kit");
    expect(tabs()[0]!.getAttribute("aria-current")).toBe("page");
    expect(tabs()[1]!.hasAttribute("aria-current")).toBe(false);
    expect(document.querySelector('[data-slot="bottom-tab-badge"]')!.textContent).toBe("3");
    expect(tabs().map((t) => t.getAttribute("tabindex"))).toEqual(["0", "-1", "-1"]);
    tabs()[0]!.focus();
    tabs()[0]!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(document.activeElement).toBe(tabs()[1]);
    tabs()[1]!.click();
    await tick();
    expect(tabs()[1]!.getAttribute("aria-current")).toBe("page");
    expect(tabs()[0]!.hasAttribute("aria-current")).toBe(false);
  });

  it("the swipe row opens on a touch swipe and an action fires nq-swipe-action", async () => {
    await mount("mobile-nav-kit");
    expect(row().getAttribute("data-state")).toBe("closed");
    const surface = row().querySelector<HTMLElement>('[data-slot="swipe-surface"]')!;
    const touch = (type: string, x: number, t: number) => {
      const e = new Event(type, { bubbles: true }) as Event & Record<string, unknown>;
      Object.defineProperties(e, { pointerType: { value: "touch" }, pointerId: { value: 1 }, clientX: { value: x }, clientY: { value: 0 }, timeStamp: { value: t } });
      surface.dispatchEvent(e);
    };
    touch("pointerdown", 200, 0);
    touch("pointermove", 120, 50);
    touch("pointermove", 80, 100);
    touch("pointerup", 80, 120);
    await tick();
    expect(row().getAttribute("data-state")).toBe("end");
    // The click that ends a drag is swallowed once, like the React row.
    surface.click();
    await tick();
    expect(row().getAttribute("data-state")).toBe("end");
    let id = "";
    row().addEventListener("nq-swipe-action", (e) => (id = (e as CustomEvent).detail.id));
    row().querySelector<HTMLElement>('[data-action="archive"]')!.click();
    await tick();
    expect(id).toBe("archive");
    expect(row().getAttribute("data-state")).toBe("closed");
  });
});
