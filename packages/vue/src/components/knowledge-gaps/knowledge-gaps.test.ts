import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { NqKnowledgeGaps, gapCounts, gapTransitions, groupGaps, type KnowledgeGap } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const gaps: KnowledgeGap[] = [
  { id: "a", query: "Ship to Jeddah?", hits: 9, firstSeen: "2026-09-01", lastSeen: "2026-09-20", status: "open" },
  { id: "b", query: "Refund window?", hits: 3, firstSeen: "2026-09-02", lastSeen: "2026-09-21", status: "indexed", resolution: "Added" },
  { id: "c", query: "Test", hits: 1, firstSeen: "2026-09-03", lastSeen: "2026-09-22", status: "dismissed" },
];

describe("helpers", () => {
  it("groups, counts and transitions", () => {
    expect(groupGaps(gaps).open).toHaveLength(1);
    expect(gapCounts(gaps)).toMatchObject({ open: 1, indexed: 1, dismissed: 1 });
    expect(gapTransitions("open")).not.toContain("open");
  });
});

describe("NqKnowledgeGaps", () => {
  it("renders groups per status", () => {
    const w = mount(NqKnowledgeGaps, { props: { gaps } });
    expect(w.find("[data-slot=knowledge-gaps]").exists()).toBe(true);
    expect(w.findAll("[data-status]").map((e) => e.attributes("data-status"))).toEqual(["open", "indexed", "dismissed"]);
    expect(w.text()).toContain("Ship to Jeddah?");
    expect(w.text()).toContain("Added");
  });
  it("filters to one status", async () => {
    const w = mount(NqKnowledgeGaps, { props: { gaps, defaultStatus: "indexed" } });
    expect(w.findAll("[data-status]")).toHaveLength(1);
    expect(w.text()).not.toContain("Ship to Jeddah?");
  });
  it("shows the empty state", () => {
    const w = mount(NqKnowledgeGaps, { props: { gaps: [] } });
    expect(w.text()).toContain("No unanswered questions");
  });
  it("calls onResolve and announces", async () => {
    const onResolve = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqKnowledgeGaps, { props: { gaps, onResolve } });
    const btn = w.findAll("[data-status=open] button").find((b) => b.text().includes("Dismiss"))!;
    await btn.trigger("click");
    await new Promise((r) => setTimeout(r, 0));
    await nextTick();
    expect(onResolve).toHaveBeenCalledWith(gaps[0], "dismissed");
    expect(w.find("[role=status]").text()).toBe("Dismissed.");
  });
  it("shows an error from onResolve", async () => {
    const onResolve = vi.fn().mockResolvedValue({ error: "Nope" });
    const w = mount(NqKnowledgeGaps, { props: { gaps, onResolve } });
    await w.find("[data-status=open] button").trigger("click");
    await new Promise((r) => setTimeout(r, 0));
    expect(w.find("[role=status]").text()).toBe("Nope");
  });
});
