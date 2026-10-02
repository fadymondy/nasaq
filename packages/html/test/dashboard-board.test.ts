// The Blade dashboard-board example under real Alpine.
import { describe, expect, it, vi } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();
vi.setConfig({ testTimeout: 20000 });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (el: Element) => (window as any).Alpine.$data(el);
const root = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-slot="dashboard-board"]')!;
const titles = (r: HTMLElement) => [...r.querySelectorAll("h3")].map((h) => h.textContent);
const btn = (r: ParentNode, text: string) => [...r.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent!.replace(/\s+/g, " ").trim().replace(/Saving$/, "") === text);
const key = (el: Element, k: string) => el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true }));

describe("dashboard board (Blade example)", () => {
  it("renders titled cards with their widget content and no editing controls", async () => {
    const host = await mount("dashboard-board");
    const r = root(host);
    expect(r.querySelector("h2")!.textContent).toBe("Overview");
    expect(titles(r)).toEqual(["Revenue", "Orders"]);
    expect(r.textContent).toContain("$48,200");
    expect(r.textContent).toContain("318");
    expect(r.querySelectorAll('[data-slot="dashboard-board-card"]')).toHaveLength(2);
    expect(btn(r, "Customise")).toBeTruthy();
    expect(r.querySelector("[data-board-handle]")).toBeNull();
    expect(r.querySelector<HTMLElement>("[data-board-id]")!.style.gridColumn).toContain("span 2");
    // The revenue card has a Settings field, so it shows the settings button even outside editing.
    expect(r.querySelectorAll("[data-board-more]")).toHaveLength(1);
  });

  it("edits, shows handles, and Save is disabled until something changes", async () => {
    const host = await mount("dashboard-board");
    const r = root(host);
    btn(r, "Customise")!.click();
    await tick(50);
    expect(r.textContent).toContain("Editing the dashboard");
    expect(r.querySelectorAll("[data-board-handle]")).toHaveLength(2);
    expect(btn(r, "Save")!.disabled).toBe(true);
    expect(btn(r, "Reset to default")).toBeTruthy();
    btn(r, "Cancel")!.click();
    await tick(50);
    expect(r.querySelector("[data-board-handle]")).toBeNull();
  });

  it("reorders with the keyboard, then saves and fires the save event", async () => {
    const host = await mount("dashboard-board");
    const r = root(host);
    const saved: { layout: { id: string }[] }[] = [];
    r.addEventListener("save", (e) => saved.push((e as CustomEvent).detail));
    btn(r, "Customise")!.click();
    await tick(50);
    const handle = r.querySelector<HTMLElement>('[data-board-handle="revenue-1"]')!;
    key(handle, " ");
    await tick(30);
    key(handle, "ArrowDown");
    await tick(50);
    key(handle, " ");
    await tick(50);
    expect(titles(r)).toEqual(["Orders", "Revenue"]);
    expect(r.querySelector(':scope > p[role="status"]')!.textContent).toContain("Dropped Revenue at position 2 of 2");
    const save = btn(r, "Save")!;
    expect(save.disabled).toBe(false);
    save.click();
    await tick(60);
    expect(saved).toHaveLength(1);
    expect(saved[0]!.layout.map((i) => i.id)).toEqual(["orders-1", "revenue-1"]);
    expect(data(r).editing).toBe(false);
    expect(titles(r)).toEqual(["Orders", "Revenue"]);
  });

  it("keeps the editor open with an error when a save listener rejects", async () => {
    const host = await mount("dashboard-board");
    const r = root(host);
    r.addEventListener("save", (e) => (e as CustomEvent).detail.until(Promise.reject(new Error("no"))));
    btn(r, "Customise")!.click();
    await tick(50);
    r.querySelector<HTMLElement>('[data-board-handle="revenue-1"]')!.closest("[data-slot='dashboard-board-card']")!.querySelector<HTMLElement>('button[aria-pressed]:not([data-board-handle])')!.click();
    await tick(50);
    btn(r, "Save")!.click();
    await tick(80);
    expect(data(r).editing).toBe(true);
    expect(r.querySelector<HTMLElement>('[role="alert"]')!.style.display).not.toBe("none");
  });

  it("opens the actions menu, makes a card wider than allowed disabled and removes a card", async () => {
    const host = await mount("dashboard-board");
    const r = root(host);
    btn(r, "Customise")!.click();
    await tick(50);
    const more = r.querySelectorAll<HTMLElement>("[data-board-more]")[1]!;
    more.click();
    await tick(120);
    const menu = [...document.querySelectorAll<HTMLElement>('[data-slot="context-menu-content"]')].find((m) => m.textContent!.includes("Wider") && !m.textContent!.includes("Settings"))!;
    expect(menu).toBeTruthy();
    const labels = [...menu.querySelectorAll('[role="menuitem"]')].map((i) => i.textContent!.replace(/\s+/g, " ").trim());
    expect(labels).toEqual(["Wider", "Narrower", "Taller", "Shorter", "Move earlier", "Move later", "Pin to the front", "Remove"]);
    const narrower = [...menu.querySelectorAll<HTMLElement>('[role="menuitem"]')][1]!;
    expect(narrower.hasAttribute("data-disabled")).toBe(true);
    [...menu.querySelectorAll<HTMLElement>('[role="menuitem"]')][0]!.click();
    await tick(60);
    expect(data(r).draft.find((i: { id: string }) => i.id === "orders-1").cols).toBe(2);
    expect(r.querySelector<HTMLElement>('[data-board-id="orders-1"]')!.style.gridColumn).toContain("span 2");
  });

  it("adds a widget from the catalogue and shows a unique one as taken afterwards", async () => {
    const host = await mount("dashboard-board");
    const r = root(host);
    btn(r, "Customise")!.click();
    await tick(50);
    btn(r, "Add widget")!.click();
    await tick(150);
    const add = document.querySelector<HTMLButtonElement>('[aria-label="Add widget: Notes"]')!;
    expect(add.disabled).toBe(false);
    add.click();
    await tick(80);
    expect(titles(r)).toContain("Notes");
    expect(r.textContent).toContain("Ship the Q4 report on Monday.");
    expect(data(r).taken(data(r).widgets[2])).toBe(true);
  });

  it("changes a widget setting from its dialog", async () => {
    const host = await mount("dashboard-board");
    const r = root(host);
    r.querySelector<HTMLElement>("[data-board-more]")!.click();
    await tick(150);
    const dialog = [...document.querySelectorAll<HTMLElement>('[data-slot="dialog-content"]')].find((d) => d.textContent!.includes("settings"))!;
    expect(dialog).toBeTruthy();
    expect(dialog.textContent).toContain("Revenue settings");
    data(r).form.range = "7d";
    await tick(30);
    dialog.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    await tick(80);
    expect(data(r).layout[0].settings.range).toBe("7d");
    expect(r.textContent).toContain("$12,400");
  });
});
