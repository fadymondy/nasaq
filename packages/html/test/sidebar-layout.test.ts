// The Blade sidebar-layout example under real Alpine.
import { beforeEach, describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();
beforeEach(() => localStorage.clear());

const items = (host: HTMLElement) => [...host.querySelectorAll<HTMLElement>('[data-slot="sidebar-sortable-item"]')];
/** The sidebar as the user sees it: visible items sorted by their CSS order. */
const seen = (host: HTMLElement) =>
  items(host)
    .filter((e) => e.style.display !== "none")
    .sort((a, b) => Number(a.style.order) - Number(b.style.order))
    .map((e) => e.dataset.sortableId);
const handles = () => [...document.querySelectorAll<HTMLButtonElement>("button[aria-keyshortcuts]")];
const popup = () => document.querySelector<HTMLElement>('[data-slot="dialog-content"]')!;
const button = (text: string) => [...document.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.trim() === text)!;

async function open() {
  const host = await mount("sidebar-layout");
  host.querySelector<HTMLButtonElement>('[data-slot="sidebar-layout-trigger"]')!.click();
  await tick();
  return host;
}

describe("sidebar-layout (Blade example)", () => {
  it("renders the items in their default order and the dialog closed", async () => {
    const host = await mount("sidebar-layout");
    expect(seen(host)).toEqual(["dashboard", "inbox", "issues"]);
    expect(items(host)[0]!.className).toContain("data-dragging:z-10");
    expect(popup().style.display).toBe("none");
  });

  it("opens a labelled dialog with a handle and a switch per item", async () => {
    await open();
    expect(popup().style.display).toBe("");
    expect(popup().getAttribute("role")).toBe("dialog");
    expect(popup().textContent).toContain("Customize sidebar");
    expect(handles().map((h) => h.getAttribute("aria-label"))).toEqual(["Reorder Dashboard", "Reorder Inbox", "Reorder My issues"]);
    const switches = [...popup().querySelectorAll<HTMLElement>('[data-slot="switch"]')];
    expect(switches.map((s) => s.getAttribute("aria-checked"))).toEqual(["true", "true", "true"]);
    expect(switches[0]!.hasAttribute("disabled")).toBe(true);
    expect(button("Reset to default").disabled).toBe(true);
    button("Done").click();
    await tick();
    expect(popup().hasAttribute("data-open")).toBe(false);
  });

  it("reorders with the keyboard, announces it, keeps focus and persists", async () => {
    const host = await open();
    handles()[0]!.focus();
    handles()[0]!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    await tick();
    expect(seen(host)).toEqual(["inbox", "dashboard", "issues"]);
    expect(document.querySelector('[aria-live="polite"]')!.textContent).toBe("Dashboard, position 2 of 3");
    expect(JSON.parse(localStorage.getItem("my-app-nav")!).order).toEqual(["inbox", "dashboard", "issues"]);
    expect(button("Reset to default").disabled).toBe(false);

    handles()[2]!.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true, cancelable: true }));
    await tick();
    expect(seen(host)).toEqual(["issues", "inbox", "dashboard"]);
  });

  it("hides an item with its switch, and Reset restores everything", async () => {
    const host = await open();
    popup().querySelectorAll<HTMLElement>('[data-slot="switch"]')[1]!.click();
    await tick();
    expect(seen(host)).toEqual(["dashboard", "issues"]);
    expect(JSON.parse(localStorage.getItem("my-app-nav")!).hidden).toEqual(["inbox"]);
    expect(popup().querySelectorAll('[data-slot="switch"]')[1]!.getAttribute("aria-checked")).toBe("false");
    button("Reset to default").click();
    await tick();
    expect(seen(host)).toEqual(["dashboard", "inbox", "issues"]);
    expect(localStorage.getItem("my-app-nav")).toBeNull();
  });

  it("applies a saved layout on load, dropping unknown ids", async () => {
    localStorage.setItem("my-app-nav", JSON.stringify({ order: ["issues", "gone", "dashboard"], hidden: ["dashboard", "gone"] }));
    const host = await mount("sidebar-layout");
    expect(seen(host)).toEqual(["issues", "inbox"]);
  });

  it("ignores a saved value of the wrong shape", async () => {
    localStorage.setItem("my-app-nav", JSON.stringify({ nope: 1 }));
    const host = await mount("sidebar-layout");
    expect(seen(host)).toEqual(["dashboard", "inbox", "issues"]);
  });

  it("drags an item with the pointer and swallows the click that ends the drag", async () => {
    const host = await mount("sidebar-layout");
    const els = items(host);
    els.forEach((el, i) => {
      el.getClientRects = () => [{}] as unknown as DOMRectList;
      el.getBoundingClientRect = () => ({ top: i * 40, height: 40, left: 0, width: 100, right: 100, bottom: i * 40 + 40, x: 0, y: i * 40 }) as DOMRect;
    });
    const ptr = (type: string, y: number) => {
      const e = new MouseEvent(type, { clientX: 5, clientY: y, button: 0, bubbles: true, cancelable: true });
      Object.assign(e, { pointerId: 1, pointerType: "mouse" });
      return e;
    };
    els[0]!.dispatchEvent(ptr("pointerdown", 5));
    window.dispatchEvent(ptr("pointermove", 12));
    expect(els[0]!.hasAttribute("data-dragging")).toBe(true);
    window.dispatchEvent(ptr("pointermove", 85));
    window.dispatchEvent(ptr("pointerup", 85));
    await tick();
    expect(els[0]!.hasAttribute("data-dragging")).toBe(false);
    expect(seen(host)).toEqual(["inbox", "issues", "dashboard"]);
    let clicked = false;
    const link = els[0]!.querySelector("a")!;
    link.addEventListener("click", () => (clicked = true));
    link.click();
    expect(clicked).toBe(false);
  });
});
