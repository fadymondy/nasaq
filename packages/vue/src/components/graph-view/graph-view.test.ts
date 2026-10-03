import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { NasaqProvider } from "../../provider";
import { NqGraphView, filterNodes, sortRows, type GraphViewKind, type GraphViewLink, type GraphViewNode } from ".";

const mounted: { unmount(): void }[] = [];
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount());
  document.body.innerHTML = "";
});

const kinds: GraphViewKind[] = [
  { id: "person", label: "People", hue: "blue" },
  { id: "doc", label: "Documents", hue: "amber" },
];
const nodes: GraphViewNode[] = [
  { id: "sara", label: "Sara", kind: "person", description: "Lead" },
  { id: "omar", label: "Omar", kind: "person" },
  { id: "spec", label: "Spec", kind: "doc", updatedAt: "2026-09-20T10:00:00Z" },
];
const links: GraphViewLink[] = [{ source: "sara", target: "spec", label: "wrote" }];

function view(props: Record<string, unknown> = {}, locale = "en") {
  const w = mount(
    defineComponent({ setup: () => () => h(NasaqProvider, { locale }, () => h(NqGraphView, { kinds, nodes, links, animate: false, defaultMode: "grid", ...props })) }),
    { attachTo: document.body },
  );
  mounted.push(w);
  return w;
}

describe("helpers", () => {
  it("filters by query and kind", () => {
    expect(filterNodes(nodes, { query: "sa", kinds: [] }).map((n) => n.id)).toEqual(["sara"]);
    expect(filterNodes(nodes, { query: "", kinds: ["doc"] }).map((n) => n.id)).toEqual(["spec"]);
  });
  it("sorts rows", () => {
    const rows = sortRows(nodes.map((n) => ({ node: n, label: n.label, kind: n.kind, links: 0 })), "label", "desc", "en");
    expect(rows.map((r) => r.label)).toEqual(["Spec", "Sara", "Omar"]);
  });
});

describe("NqGraphView", () => {
  it("renders the grid with a card per node and the counts", () => {
    const w = view();
    expect(w.find("[data-slot=graph-view]").attributes("data-mode")).toBe("grid");
    expect(w.findAll("li button[data-node]")).toHaveLength(3);
    expect(w.text()).toContain("3 items, 1 links");
  });

  it("selects a node and shows the inspector with its links", async () => {
    const w = view();
    await w.find("[data-node=sara]").trigger("click");
    const aside = w.find("[data-slot=graph-inspector]");
    expect(aside.exists()).toBe(true);
    expect(aside.text()).toContain("Links to");
    expect(aside.text()).toContain("Spec");
    await aside.find("button[aria-label=Close]").trigger("click");
    expect(w.find("[data-slot=graph-inspector]").exists()).toBe(false);
  });

  it("shows an Open button only with onOpen", async () => {
    let opened = "";
    const w = view({ defaultSelectedId: "sara", onOpen: (n: GraphViewNode) => (opened = n.id) });
    const open = w.findAll("aside button").find((b) => b.text() === "Open");
    expect(open).toBeTruthy();
    await open!.trigger("click");
    expect(opened).toBe("sara");
  });

  it("filters by search and offers to clear when nothing matches", async () => {
    const w = view();
    await w.find("input[type=search]").setValue("zzz");
    expect(w.text()).toContain("Nothing matches");
    const clear = w.findAll("button").find((b) => b.text() === "Clear filters");
    await clear!.trigger("click");
    expect(w.findAll("li button[data-node]")).toHaveLength(3);
  });

  it("renders the list with aria-sort and sorts on click", async () => {
    const w = view({ defaultMode: "list" });
    const names = () => w.findAll("tbody tr").map((r) => r.attributes("data-node"));
    expect(names()).toEqual(["omar", "sara", "spec"]);
    expect(w.find("th[aria-sort=ascending]").exists()).toBe(true);
    await w.find("th button").trigger("click");
    expect(names()).toEqual(["spec", "sara", "omar"]);
  });

  it("renders the schema with a column per kind", () => {
    const w = view({ defaultMode: "schema" });
    expect(w.findAll("[data-column]")).toHaveLength(2);
  });

  it("renders the graph canvas without throwing", () => {
    const w = view({ defaultMode: "graph" });
    expect(w.find("[data-slot=graph-canvas]").exists() || w.find("svg").exists()).toBe(true);
  });

  it("uses Arabic labels in Arabic", () => {
    const w = view({}, "ar");
    expect(w.text()).toContain("شبكة");
  });
});
