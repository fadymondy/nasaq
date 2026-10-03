import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NqTreeView, type TreeNode } from ".";

const items: TreeNode[] = [
  { id: "docs", label: "Documents", textValue: "Documents", children: [{ id: "cv", label: "CV.pdf", textValue: "CV.pdf" }] },
  { id: "notes", label: "Notes.txt", textValue: "Notes.txt" },
  { id: "lazy", label: "Lazy", textValue: "Lazy", hasChildren: true },
];

describe("NqTreeView", () => {
  it("renders tree semantics and roving tabindex", () => {
    const w = mount(NqTreeView, { props: { items, defaultExpanded: ["docs"] }, attachTo: document.body });
    const root = w.find('[data-slot="tree-view"]');
    expect(root.attributes("role")).toBe("tree");
    expect(root.attributes("aria-label")).toBe("Tree");
    expect(root.classes()).toEqual(expect.arrayContaining(["flex", "flex-col", "gap-0.5"]));
    const rows = w.findAll('[data-slot="tree-view-item"]');
    expect(rows).toHaveLength(4);
    expect(rows[0]!.attributes("aria-expanded")).toBe("true");
    expect(rows[0]!.attributes("aria-level")).toBe("1");
    expect(rows[1]!.attributes("aria-level")).toBe("2");
    expect(rows[1]!.attributes("aria-posinset")).toBe("1");
    expect(rows[1]!.attributes("aria-setsize")).toBe("1");
    expect(rows[0]!.attributes("tabindex")).toBe("0");
    expect(rows[2]!.attributes("tabindex")).toBe("-1");
    expect(rows[1]!.attributes("style")).toContain("padding-inline-start: 1.625rem");
    w.unmount();
  });

  it("selects on click and toggles on the chevron", async () => {
    const w = mount(NqTreeView, { props: { items }, attachTo: document.body });
    const rows = () => w.findAll('[data-slot="tree-view-item"]');
    await rows()[1]!.trigger("click");
    expect(rows()[1]!.attributes("data-selected")).toBe("");
    expect(rows()[1]!.attributes("aria-selected")).toBe("true");
    await w.find('[data-slot="tree-view-toggle"]').trigger("click");
    expect(rows()).toHaveLength(4);
    expect(rows()[0]!.attributes("data-expanded")).toBe("");
    expect(w.emitted("update:selected")![0]).toEqual([["notes"]]);
    w.unmount();
  });

  it("navigates with arrows and swaps them in RTL", async () => {
    const w = mount(NqTreeView, { props: { items, dir: "rtl" }, attachTo: document.body });
    const first = w.find('[data-slot="tree-view-item"]');
    await first.trigger("keydown", { key: "ArrowRight" });
    expect(first.attributes("aria-expanded")).toBe("false");
    await first.trigger("keydown", { key: "ArrowLeft" });
    expect(w.find('[data-slot="tree-view-item"]').attributes("aria-expanded")).toBe("true");
    await first.trigger("keydown", { key: "ArrowDown" });
    expect(document.activeElement?.getAttribute("data-node-id")).toBe("cv");
    w.unmount();
  });

  it("shows a spinner while lazy children load", async () => {
    let resolve!: () => void;
    const onExpand = () => new Promise<void>((r) => (resolve = r));
    const w = mount(NqTreeView, { props: { items, onExpand }, attachTo: document.body });
    const lazy = w.findAll('[data-slot="tree-view-item"]')[2]!;
    await lazy.trigger("keydown", { key: "ArrowRight" });
    expect(w.findAll('[data-slot="tree-view-item"]')[2]!.attributes("aria-busy")).toBe("true");
    expect(w.find('[role="status"]').text()).toBe("Loading");
    resolve();
    await flushPromises();
    expect(w.findAll('[data-slot="tree-view-item"]')[2]!.attributes("aria-busy")).toBeUndefined();
    w.unmount();
  });
});
