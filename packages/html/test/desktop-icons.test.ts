// The Blade desktop-icons example under real Alpine (nqDesktopIcons): a grid and a free-placement desktop.
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();

const grid = () => document.querySelector<HTMLElement>("#grid-example [data-slot=desktop-icon-grid]")!;
const free = () => document.querySelector<HTMLElement>("#free-example [data-slot=desktop-icon-grid]")!;
const icons = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('[data-slot="desktop-icon"]')];

describe("desktop-icons (Blade example)", () => {
  it("lists the icons and selects one on click", async () => {
    await mount("desktop-icons");
    const list = icons(grid());
    expect(list.map((i) => i.textContent?.trim())).toEqual(["Files", "Notes", "Mail"]);
    expect(grid().getAttribute("aria-label")).toBe("Desktop");
    list[1]!.click();
    await tick();
    expect(list[1]!.hasAttribute("data-selected")).toBe(true);
    expect(list[1]!.getAttribute("aria-pressed")).toBe("true");
    expect(list[0]!.hasAttribute("data-selected")).toBe(false);
  });

  it("opens on a double-click and on Enter, firing nq-desktop-icon-open", async () => {
    await mount("desktop-icons");
    const ids: string[] = [];
    document.addEventListener("nq-desktop-icon-open", (e) => ids.push((e as CustomEvent).detail.id));
    const list = icons(grid());
    list[0]!.click();
    await tick();
    expect(ids).toEqual([]);
    list[0]!.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    list[2]!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await tick();
    expect(ids).toEqual(["files", "mail"]);
  });

  it("arrow keys move focus and Escape clears the selection", async () => {
    await mount("desktop-icons");
    const list = icons(grid());
    list[0]!.focus();
    list[0]!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
    await tick();
    expect(document.activeElement).toBe(list[1]);
    expect(list[1]!.hasAttribute("data-selected")).toBe(true);
    list[1]!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await tick();
    expect(list[1]!.hasAttribute("data-selected")).toBe(false);
  });

  it("free mode places icons from positions and a drag snaps and fires nq-desktop-icon-move", async () => {
    await mount("desktop-icons");
    const root = free();
    expect(root.hasAttribute("data-free")).toBe(true);
    Object.defineProperty(root, "clientWidth", { value: 600, configurable: true });
    Object.defineProperty(root, "clientHeight", { value: 400, configurable: true });
    const wrappers = () => [...root.querySelectorAll<HTMLElement>('[data-slot="desktop-icon-position"]')];
    expect(wrappers()[0]!.style.insetInlineStart || wrappers()[0]!.getAttribute("style")).toContain("8px");
    let moved: { id: string; x: number; y: number } | null = null;
    root.addEventListener("nq-desktop-icon-move", (e) => (moved = (e as CustomEvent).detail));
    const wrap = wrappers()[0]!;
    const fire = (type: string, x: number, y: number) => {
      const e = new Event(type, { bubbles: true }) as Event & Record<string, unknown>;
      Object.defineProperties(e, { pointerType: { value: "mouse" }, pointerId: { value: 1 }, button: { value: 0 }, clientX: { value: x }, clientY: { value: y } });
      wrap.dispatchEvent(e);
    };
    fire("pointerdown", 10, 10);
    fire("pointermove", 120, 10);
    fire("pointerup", 120, 10);
    await tick();
    expect(moved).toEqual({ id: "docs", x: 104, y: 8 });
    expect(wrappers()[0]!.getAttribute("style")).toContain("104px");
  });
});
