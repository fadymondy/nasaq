// The Blade app-shell example under real Alpine.
import { beforeEach, describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();
beforeEach(() => localStorage.clear());

describe("app-shell (Blade example)", () => {
  it("renders the sidebar column, skip link and main target", async () => {
    const host = await mount("app-shell");
    const shell = host.querySelector<HTMLElement>('[data-slot="app-shell"]')!;
    expect(shell.getAttribute("data-navigation")).toBe("sidebar");
    expect(host.querySelector('a[href="#app-main"]')).not.toBeNull();
    expect(host.querySelector("#app-main")).not.toBeNull();
    const aside = host.querySelector<HTMLElement>('[data-slot="app-sidebar"]')!;
    expect(aside.hasAttribute("data-collapsed")).toBe(false);
    expect(host.querySelector('[data-slot="sidebar-resize-handle"]')!.getAttribute("role")).toBe("separator");
    const active = host.querySelector('[data-slot="sidebar-item"][aria-current="page"]')!;
    expect(active.textContent).toContain("Overview");
  });

  it("collapses to a rail with the toggle, remembers it and names the items", async () => {
    const host = await mount("app-shell");
    const aside = host.querySelector<HTMLElement>('[data-slot="app-sidebar"]')!;
    const item = aside.querySelector<HTMLElement>('[data-slot="sidebar-item"]')!;
    expect(item.hasAttribute("aria-label")).toBe(false);
    host.querySelector<HTMLElement>('button[aria-label="Toggle sidebar"]')!.click();
    await tick();
    expect(aside.hasAttribute("data-collapsed")).toBe(true);
    expect(localStorage.getItem("nasaq-sidebar")).toBe("collapsed");
    expect(item.getAttribute("aria-label")).toBe("Overview");
  });

  it("toggles with Ctrl+B", async () => {
    const host = await mount("app-shell");
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "b", code: "KeyB", ctrlKey: true, bubbles: true }));
    await tick();
    expect(host.querySelector('[data-slot="app-sidebar"]')!.hasAttribute("data-collapsed")).toBe(true);
  });

  it("resizes with the keyboard and clamps", async () => {
    const host = await mount("app-shell");
    const handle = host.querySelector<HTMLElement>('[data-slot="sidebar-resize-handle"]')!;
    expect(handle.getAttribute("aria-valuenow")).toBe("256");
    handle.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    await tick();
    expect(handle.getAttribute("aria-valuenow")).toBe("272");
    handle.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
    await tick();
    expect(handle.getAttribute("aria-valuenow")).toBe("420");
    expect(localStorage.getItem("nasaq-sidebar-width")).toBe("420");
  });

  it("renders breadcrumbs and the page header", async () => {
    const host = await mount("app-shell");
    const crumbs = host.querySelector('[data-slot="app-breadcrumbs"]')!;
    expect(crumbs.querySelectorAll("li")).toHaveLength(2);
    expect(crumbs.querySelector('[aria-current="page"]')!.textContent).toContain("Website");
    expect(host.querySelector('[data-slot="app-page-header"] h1')!.textContent).toBe("Overview");
  });

  it("splits the nav into tabs, a mobile bar and a More overflow", async () => {
    const host = await mount("app-shell");
    const tabs = host.querySelector('[data-slot="app-nav"]')!;
    expect(tabs.querySelectorAll('[data-slot="app-nav-item"]')).toHaveLength(4);
    expect(tabs.querySelector('[aria-current="page"]')!.textContent).toContain("Overview");
    const bar = host.querySelector('[data-slot="app-nav-bar"]')!;
    expect(bar.querySelectorAll('[data-slot="app-nav-item"]')).toHaveLength(2);
    expect(bar.querySelector('[data-slot="app-nav-more"]')!.textContent).toContain("More");
  });
});
