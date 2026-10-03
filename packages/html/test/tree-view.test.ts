// The Blade tree-view example under real Alpine, plus the pure keyboard helpers.
import { describe, expect, it } from "vitest";
import { findTypeahead, getKeyAction, nextSelection, visibleRows, type TreeNodeInfo } from "../src/alpine/tree-view";
import { mount, setup, tick } from "./_float-setup";

setup();

const rows = () => [...document.querySelectorAll<HTMLElement>('[data-slot="tree-view-item"]')];
const key = (el: Element, k: string) => el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));

describe("tree-view (Blade example)", () => {
  it("renders tree semantics with the server state", async () => {
    const host = await mount("tree-view");
    const root = host.querySelector<HTMLElement>('[data-slot="tree-view"]')!;
    expect(root.getAttribute("role")).toBe("tree");
    expect(root.getAttribute("aria-label")).toBe("Files");
    const [docs, cv, notes] = rows();
    expect(docs!.getAttribute("aria-expanded")).toBe("true");
    expect(docs!.getAttribute("aria-level")).toBe("1");
    expect(cv!.getAttribute("aria-level")).toBe("2");
    expect(cv!.getAttribute("aria-posinset")).toBe("1");
    expect(cv!.style.display).not.toBe("none");
    expect(docs!.getAttribute("tabindex")).toBe("0");
    expect(notes!.getAttribute("tabindex")).toBe("-1");
    expect(cv!.getAttribute("style")).toContain("padding-inline-start: 1.625rem");
  });

  it("selects on click and collapses from the chevron", async () => {
    const host = await mount("tree-view");
    const [docs, cv, notes] = rows();
    notes!.click();
    await tick();
    expect(notes!.hasAttribute("data-selected")).toBe(true);
    expect(notes!.getAttribute("aria-selected")).toBe("true");
    docs!.querySelector<HTMLElement>('[data-slot="tree-view-toggle"]')!.click();
    await tick();
    expect(docs!.getAttribute("aria-expanded")).toBe("false");
    expect(docs!.hasAttribute("data-expanded")).toBe(false);
    expect(cv!.style.display).toBe("none");
    expect(host.querySelector('[data-slot="tree-view-item"][data-selected]')).toBe(notes);
  });

  it("navigates with the arrow keys", async () => {
    await mount("tree-view");
    const [docs, cv, notes] = rows();
    docs!.focus();
    key(docs!, "ArrowRight");
    await tick();
    expect(document.activeElement).toBe(cv);
    key(cv!, "ArrowLeft");
    await tick();
    expect(document.activeElement).toBe(docs);
    key(docs!, "ArrowLeft");
    await tick();
    expect(docs!.getAttribute("aria-expanded")).toBe("false");
    key(docs!, "ArrowDown");
    await tick();
    expect(document.activeElement).toBe(notes);
    expect(notes!.getAttribute("tabindex")).toBe("0");
    key(notes!, "Enter");
    await tick();
    expect(notes!.getAttribute("aria-selected")).toBe("true");
    key(notes!, "d");
    await tick();
    expect(document.activeElement).toBe(docs);
  });
});

describe("tree-view helpers", () => {
  const nodes: TreeNodeInfo[] = [
    { id: "a", parent: null, expandable: true, text: "Alpha" },
    { id: "a1", parent: "a", expandable: false, text: "Apple" },
    { id: "b", parent: null, expandable: false, text: "Beta" },
  ];
  it("shows children only when every ancestor is expanded", () => {
    expect(visibleRows(nodes, new Set()).map((r) => r.id)).toEqual(["a", "b"]);
    expect(visibleRows(nodes, new Set(["a"])).map((r) => r.id)).toEqual(["a", "a1", "b"]);
  });
  it("swaps the expand and collapse arrows in RTL", () => {
    const flat = visibleRows(nodes, new Set());
    expect(getKeyAction(flat, "a", "ArrowRight", "ltr")).toEqual({ type: "expand", id: "a" });
    expect(getKeyAction(flat, "a", "ArrowRight", "rtl")).toBeNull();
    expect(getKeyAction(flat, "a", "ArrowLeft", "rtl")).toEqual({ type: "expand", id: "a" });
  });
  it("finds typeahead matches and computes selections", () => {
    const flat = visibleRows(nodes, new Set(["a"]));
    expect(findTypeahead(flat, "a", "b")).toBe("b");
    expect(findTypeahead(flat, "a", "a")).toBe("a1");
    expect(nextSelection(["a"], "b", "single")).toEqual(["b"]);
    expect(nextSelection(["a"], "b", "multiple")).toEqual(["a", "b"]);
    expect(nextSelection(["a", "b"], "b", "multiple")).toEqual(["a"]);
    expect(nextSelection(["a"], "b", "none")).toEqual(["a"]);
  });
});
