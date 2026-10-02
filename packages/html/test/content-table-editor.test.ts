// The Blade content-table-editor example under real Alpine.
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();

const cell = (host: HTMLElement, row: string, col: number) => host.querySelector<HTMLElement>(`[data-row="${row}"][data-col="${col}"]`)!;
const key = (el: HTMLElement, k: string, init: KeyboardEventInit = {}) => el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, ...init }));

describe("content-table-editor (Blade example)", () => {
  it("renders the grid with formatted cells, sums and the Saved badge", async () => {
    const host = await mount("content-table-editor");
    expect(host.querySelector('[data-slot="content-table-editor"]')).not.toBeNull();
    expect(host.querySelectorAll('[data-row][data-col]')).toHaveLength(8);
    expect(cell(host, "r1", 0).textContent).toContain("Coffee");
    expect(cell(host, "r1", 2).textContent).toContain("Live");
    expect(host.querySelector(`[data-slot="content-table-footer"]`)!.textContent).toContain("20");
    expect(host.textContent).toContain("Saved");
    expect(cell(host, "r1", 3).querySelector('[role="checkbox"]')!.getAttribute("aria-checked")).toBe("true");
  });

  it("moves with the arrow keys, edits by typing and marks the table unsaved", async () => {
    const host = await mount("content-table-editor");
    const first = cell(host, "r1", 0);
    expect(first.getAttribute("tabindex")).toBe("0");
    first.focus();
    await tick();
    key(first, "ArrowDown");
    await tick();
    expect(document.activeElement).toBe(cell(host, "r2", 0));
    key(cell(host, "r2", 0), "x");
    await tick();
    const input = host.querySelector<HTMLInputElement>('input[aria-label^="Name"]')!;
    expect(input.value).toBe("x");
    input.value = "Mint";
    key(input, "Enter");
    await tick();
    expect(cell(host, "r2", 0).textContent).toContain("Mint");
    expect(host.textContent).toContain("Unsaved changes");
  });

  it("toggles a checkbox cell, undoes and redoes", async () => {
    const host = await mount("content-table-editor");
    const box = () => cell(host, "r2", 3).querySelector<HTMLElement>('[role="checkbox"]')!;
    key(cell(host, "r2", 3), " ");
    await tick();
    expect(box().getAttribute("aria-checked")).toBe("true");
    host.querySelector<HTMLButtonElement>('button[aria-label="Undo"]')!.click();
    await tick();
    expect(box().getAttribute("aria-checked")).toBe("false");
    host.querySelector<HTMLButtonElement>('button[aria-label="Redo"]')!.click();
    await tick();
    expect(box().getAttribute("aria-checked")).toBe("true");
  });

  it("filters rows by search and sorts from the header", async () => {
    const host = await mount("content-table-editor");
    const search = host.querySelector<HTMLInputElement>('input[aria-label="Search rows"]')!;
    search.value = "tea";
    search.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect(host.querySelectorAll('[data-col="0"]')).toHaveLength(1);
    expect(host.textContent).toContain("1 of 2 rows");
    search.value = "";
    search.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    const th = host.querySelector<HTMLElement>('[role="columnheader"][aria-sort]')!;
    th.querySelector<HTMLButtonElement>("button")!.click();
    th.querySelector<HTMLButtonElement>("button")!.click();
    await tick();
    expect(th.getAttribute("aria-sort")).toBe("descending");
    expect([...host.querySelectorAll('[data-col="0"]')].map((c) => c.textContent!.trim())).toEqual(["Tea", "Coffee"]);
  });

  it("adds a row, flags the required cell, and saves through nq-content-save", async () => {
    const host = await mount("content-table-editor");
    const addRow = [...host.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent!.trim() === "Add row")!;
    addRow.click();
    await tick();
    expect(host.querySelectorAll('[role="row"][data-slot="content-table-row"]')).toHaveLength(3);
    expect(host.textContent).toContain("1 to fix");
    const save = () => [...host.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent!.trim() === "Save")!;
    expect(save().disabled).toBe(true);
    const row = host.querySelectorAll('[role="gridcell"][data-col="0"]')[2] as HTMLElement;
    row.focus();
    await tick();
    key(row, "q");
    await tick();
    const input = host.querySelector<HTMLInputElement>('input[aria-label^="Name"]')!;
    input.value = "Water";
    key(input, "Enter");
    await tick();
    expect(host.textContent).not.toContain("1 to fix");
    expect(save().disabled).toBe(false);
    save().click();
    await tick(500);
    expect(host.textContent).toContain("Saved");
  });

  it("opens the choice popover for a select cell and picks an option", async () => {
    const host = await mount("content-table-editor");
    key(cell(host, "r1", 2), "Enter");
    await tick();
    const draft = [...document.body.querySelectorAll<HTMLElement>('[role="option"]')].find((o) => o.textContent!.includes("Draft"))!;
    expect(draft).toBeTruthy();
    draft.click();
    await tick();
    expect(cell(host, "r1", 2).textContent).toContain("Draft");
  });
});
