// The Blade view-toggle example under real Alpine.
import { afterEach, describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();
afterEach(() => localStorage.clear());
const buttons = (host: HTMLElement) => [...host.querySelectorAll<HTMLElement>('[data-slot="toggle"]')];

describe("view-toggle (Blade example)", () => {
  it("renders a labelled group with the first view pressed", async () => {
    const host = await mount("view-toggle");
    const group = host.querySelector('[data-slot="toggle-group"]')!;
    expect(group.getAttribute("aria-label")).toBe("View");
    const [table, grid] = buttons(host);
    expect(table!.getAttribute("aria-label")).toBe("Table");
    expect(table!.getAttribute("aria-pressed")).toBe("true");
    expect(table!.hasAttribute("data-pressed")).toBe(true);
    expect(grid!.getAttribute("aria-pressed")).toBe("false");
    expect(grid!.hasAttribute("data-pressed")).toBe(false);
    expect(table!.tabIndex).toBe(0);
    expect(grid!.tabIndex).toBe(-1);
  });

  it("clicking swaps the pressed view, saves it and never clears it", async () => {
    const host = await mount("view-toggle");
    const seen: string[] = [];
    host.addEventListener("nq-view-change", (e) => seen.push((e as CustomEvent).detail.view));
    const [table, grid] = buttons(host);
    grid!.click();
    await tick();
    expect(grid!.getAttribute("aria-pressed")).toBe("true");
    expect(table!.getAttribute("aria-pressed")).toBe("false");
    expect(localStorage.getItem("customers:view")).toBe("grid");
    expect(seen).toEqual(["grid"]);
    grid!.click();
    await tick();
    expect(grid!.getAttribute("aria-pressed")).toBe("true");
    expect(seen).toEqual(["grid"]);
  });

  it("restores the stored view on init", async () => {
    localStorage.setItem("customers:view", "grid");
    const host = await mount("view-toggle");
    const [table, grid] = buttons(host);
    expect(grid!.getAttribute("aria-pressed")).toBe("true");
    expect(table!.getAttribute("aria-pressed")).toBe("false");
  });

  it("arrow keys move focus, Home and End jump, focus loops", async () => {
    const host = await mount("view-toggle");
    const [table, grid] = buttons(host);
    table!.focus();
    table!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(document.activeElement).toBe(grid);
    grid!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(document.activeElement).toBe(table);
    table!.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
    expect(document.activeElement).toBe(grid);
    grid!.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
    expect(document.activeElement).toBe(table);
    await tick();
    expect(grid!.tabIndex).toBe(-1);
  });
});
