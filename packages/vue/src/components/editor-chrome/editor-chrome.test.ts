import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NqEditorBacklinks, NqEditorStatusBar, NqEditorTabs, closeEditorTab, editorCursorAt, editorTabKeyTarget, editorTextStats } from ".";

const tabs = [
  { id: "a", title: "Trip plan", dirty: true },
  { id: "b", title: "Ideas" },
];

describe("editor model", () => {
  it("closes the active tab to its neighbour", () => {
    expect(closeEditorTab(tabs, "a", "a")).toEqual({ tabs: [tabs[1]], activeId: "b" });
  });
  it("mirrors arrows in rtl and wraps", () => {
    expect(editorTabKeyTarget(["a", "b"], "a", "ArrowRight", "ltr")).toBe("b");
    expect(editorTabKeyTarget(["a", "b"], "a", "ArrowRight", "rtl")).toBe("b");
    expect(editorTabKeyTarget(["a", "b"], "a", "ArrowLeft", "rtl")).toBe("b");
    expect(editorTabKeyTarget(["a", "b"], "b", "ArrowRight", "ltr")).toBe("a");
  });
  it("counts text and cursor", () => {
    expect(editorTextStats("Book the flights").words).toBe(3);
    expect(editorCursorAt("ab\ncd", 4)).toEqual({ line: 2, column: 2 });
  });
});

describe("NqEditorTabs", () => {
  it("renders a tablist with an active tab and a dirty marker", () => {
    const w = mount(NqEditorTabs, { props: { tabs, activeId: "a" } });
    expect(w.attributes("data-slot")).toBe("editor-tabs");
    expect(w.find('[role="tablist"]').exists()).toBe(true);
    const tab = w.findAll('[role="tab"]');
    expect(tab[0]!.attributes("aria-selected")).toBe("true");
    expect(tab[0]!.attributes("data-dirty")).toBe("");
    expect(tab[0]!.attributes("tabindex")).toBe("0");
    expect(tab[1]!.attributes("tabindex")).toBe("-1");
    expect(w.text()).toContain("Unsaved changes");
  });
  it("selects, and closes with Delete and the close button", async () => {
    const w = mount(NqEditorTabs, { props: { tabs, activeId: "a", onClose: () => {} } });
    await w.findAll('[role="tab"]')[1]!.trigger("click");
    expect(w.emitted("select")![0]).toEqual(["b"]);
    await w.findAll('[role="tab"]')[0]!.trigger("keydown", { key: "Delete" });
    await w.find('button[aria-label="Close Ideas"]').trigger("click");
    expect(w.emitted("close")).toEqual([["a"], ["b"]]);
  });
  it("shows the + button only with @new", async () => {
    expect(mount(NqEditorTabs, { props: { tabs, activeId: "a" } }).find('button[aria-label="New document"]').exists()).toBe(false);
    const w = mount(NqEditorTabs, { props: { tabs, activeId: "a", onNew: () => {} } });
    await w.find('button[aria-label="New document"]').trigger("click");
    expect(w.emitted("new")).toHaveLength(1);
  });
});

describe("NqEditorStatusBar", () => {
  it("shows counts and a polite save state", () => {
    const w = mount(NqEditorStatusBar, { props: { words: 3, characters: 16, line: 1, column: 5, saveState: "saved" } });
    expect(w.text()).toContain("Ln 1, Col 5");
    expect(w.text()).toContain("3 words");
    const s = w.find('[data-slot="editor-save-state"]');
    expect(s.attributes("role")).toBe("status");
    expect(s.attributes("data-state")).toBe("saved");
  });
  it("error is an alert with Retry", async () => {
    const w = mount(NqEditorStatusBar, { props: { saveState: "error", onRetry: () => {} } });
    expect(w.find('[data-slot="editor-save-state"]').attributes("role")).toBe("alert");
    await w.find("button").trigger("click");
    expect(w.emitted("retry")).toHaveLength(1);
  });
});

describe("NqEditorBacklinks", () => {
  it("lists links with the term highlighted and emits open", async () => {
    const w = mount(NqEditorBacklinks, {
      props: { backlinks: [{ id: "1", title: "Weekly review", snippet: "see Trip plan for dates" }], related: [], highlight: "Trip plan", onOpen: () => {} },
    });
    expect(w.find("mark").text()).toBe("Trip plan");
    expect(w.text()).toContain("No related documents.");
    await w.find("a").trigger("click");
    expect(w.emitted("open")![0]![0]).toMatchObject({ id: "1" });
  });
});
