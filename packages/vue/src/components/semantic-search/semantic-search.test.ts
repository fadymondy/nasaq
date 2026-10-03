import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { NqSemanticSearch, type SemanticHit } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const results: SemanticHit[] = [
  { id: "1", content: "Refunds within 14 days", score: 0.91, group: "policies", kind: "document", source: "notion", importance: 0.9 },
  { id: "2", content: "Shipping takes 3 days", score: 0.3, group: "faq", kind: "fact", source: "upload", importance: 0.2 },
];

describe("NqSemanticSearch", () => {
  it("shows the idle hint before a search", () => {
    const w = mount(NqSemanticSearch, { props: { onSearch: vi.fn() } });
    expect(w.text()).toContain("Search the brain in plain words");
    expect(w.find("button[type=submit]").attributes("disabled")).toBeDefined();
  });

  it("submits the query with the mode and limit", async () => {
    const onSearch = vi.fn();
    const w = mount(NqSemanticSearch, { props: { onSearch } });
    await w.find("input").setValue("  refund ");
    const keyword = w.findAll("[role=group] button").find((b) => b.text() === "Keyword")!;
    await keyword.trigger("click");
    await w.findAll("button").find((b) => b.text() === "20")!.trigger("click");
    await w.find("form").trigger("submit");
    expect(onSearch).toHaveBeenCalledWith("refund", { mode: "keyword", limit: 20 });
  });

  it("renders hits with marked words and scores", async () => {
    const w = mount(NqSemanticSearch, { props: { onSearch: vi.fn(), results, defaultQuery: "refunds" } });
    await w.find("form").trigger("submit");
    expect(w.findAll("ol > li")).toHaveLength(2);
    expect(w.find("mark").text().toLowerCase()).toBe("refunds");
    expect(w.text()).toContain("0.91");
    expect(w.text()).toContain("Strong");
    expect(w.text()).toContain("2 results");
  });

  it("narrows by facet and by importance, and clears", async () => {
    const w = mount(NqSemanticSearch, { props: { onSearch: vi.fn(), results } });
    await w.findAll("button").find((b) => b.text() === "faq")!.trigger("click");
    expect(w.findAll("ol > li")).toHaveLength(1);
    expect(w.text()).toContain("1 of 2 results");
    await w.findAll("button").find((b) => b.text() === "Clear filters")!.trigger("click");
    expect(w.findAll("ol > li")).toHaveLength(2);
    await w.findAll("button").find((b) => b.text() === "High importance")!.trigger("click");
    expect(w.findAll("ol > li")).toHaveLength(1);
  });

  it("opens a hit and shows the empty state", async () => {
    const onOpen = vi.fn();
    const w = mount(NqSemanticSearch, { props: { onSearch: vi.fn(), results, onOpen } });
    await w.findAll("ol button").find((b) => b.text() === "Open")!.trigger("click");
    expect(onOpen).toHaveBeenCalledWith(results[0]);
    const e = mount(NqSemanticSearch, { props: { onSearch: vi.fn(), results: [], defaultQuery: "zzz" } });
    await e.find("form").trigger("submit");
    await nextTick();
    expect(e.text()).toContain("Nothing found for “zzz”");
  });
});
