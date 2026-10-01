// The Blade editor-chrome example under real Alpine: the tabs strip (nqEditorTabs) and the status bar (nqEditorStatus).
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();

const tabs = () => [...document.querySelectorAll<HTMLElement>('[role="tab"]')];
const status = () => document.querySelector<HTMLElement>('[data-slot="editor-status-bar"]')!;

describe("editor-chrome (Blade example)", () => {
  it("lists the tabs with the pinned one first and the active one selected", async () => {
    await mount("editor-chrome");
    expect(tabs().map((t) => t.dataset.tabId)).toEqual(["c", "a", "b"]);
    const a = tabs().find((t) => t.dataset.tabId === "a")!;
    expect(a.getAttribute("aria-selected")).toBe("true");
    expect(a.hasAttribute("data-dirty")).toBe(true);
    expect(tabs().find((t) => t.dataset.tabId === "b")!.getAttribute("aria-selected")).toBe("false");
  });

  it("clicking selects, arrow keys move, Delete closes and fires events", async () => {
    await mount("editor-chrome");
    const root = document.querySelector<HTMLElement>('[data-slot="editor-tabs"]')!;
    const picked: string[] = [];
    const closed: string[] = [];
    root.addEventListener("nq-editor-tab-select", (e) => picked.push((e as CustomEvent).detail.id));
    root.addEventListener("nq-editor-tab-close", (e) => closed.push((e as CustomEvent).detail.id));
    tabs().find((t) => t.dataset.tabId === "b")!.click();
    await tick();
    expect(picked).toEqual(["b"]);
    const b = tabs().find((t) => t.dataset.tabId === "b")!;
    b.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    await tick();
    expect(picked.at(-1)).toBe("c");
    b.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", bubbles: true }));
    await tick();
    expect(closed).toEqual(["b"]);
    expect(tabs().map((t) => t.dataset.tabId)).toEqual(["c", "a"]);
  });

  it("the status bar counts the textarea and tracks the caret", async () => {
    await mount("editor-chrome");
    const text = status().textContent ?? "";
    expect(text).toContain("3 words");
    expect(text).toContain("16 characters");
    expect(text).toContain("Ln 1, Col 1");
    expect(text).toContain("Saved");
    const area = document.querySelector<HTMLTextAreaElement>("#editor-chrome-text")!;
    area.value = "One two\nthree";
    area.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect(status().textContent).toContain("3 words");
    window.dispatchEvent(new CustomEvent("nq-editor-status", { detail: { saveState: "error" } }));
    await tick();
    expect(status().querySelector('[data-slot="editor-save-state"]')!.getAttribute("role")).toBe("alert");
    expect(status().textContent).toContain("Could not save");
    expect(status().textContent).toContain("Retry");
  });

  it("the backlinks panel highlights the mention", async () => {
    await mount("editor-chrome");
    const aside = document.querySelector('[data-slot="editor-backlinks"]')!;
    expect(aside.querySelector("mark")!.textContent).toBe("Trip plan");
    expect(aside.textContent).toContain("Packing list");
  });
});
