import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqKeywordPlanner, classifyIntent, type PlannerKeyword } from ".";

const keywords: PlannerKeyword[] = [
  { id: "k1", keyword: "arabic design system", volume: 2400, difficulty: 38, ownerUrl: "/design-system" },
  { id: "k2", keyword: "rtl react components", volume: 1300, difficulty: 29, rankingUrls: [{ url: "/components", position: 6 }, { url: "/blog/rtl", position: 11 }] },
  { id: "k3", keyword: "buy ui kit", volume: 800, difficulty: 52 },
];

describe("NqKeywordPlanner", () => {
  it("renders the keyword table with intent and status", () => {
    const w = mount(NqKeywordPlanner, { props: { keywords } });
    expect(w.attributes("data-slot")).toBe("keyword-planner");
    const rows = w.findAll("tbody tr");
    expect(rows).toHaveLength(3);
    expect(rows[0]!.text()).toContain("arabic design system");
    expect(rows[0]!.text()).toContain("Owned");
    expect(rows[1]!.text()).toContain("Competing pages");
    expect(rows[2]!.text()).toContain("Transactional");
    expect(rows[2]!.text()).toContain("No owner");
  });

  it("lists clusters and cannibalization, keeping a page", async () => {
    const onAssignOwner = vi.fn(async () => {});
    const w = mount(NqKeywordPlanner, { props: { keywords, onAssignOwner } });
    const tabs = w.findAll('[role="tab"]');
    await tabs[2]!.trigger("mousedown");
    await tabs[2]!.trigger("click");
    await tabs[2]!.trigger("keydown", { key: "Enter" });
    expect(w.text()).toContain("1 keyword has competing pages");
    const keep = w.findAll("button").find((b) => b.text() === "Keep this page")!;
    await keep.trigger("click");
    expect(onAssignOwner).toHaveBeenCalledWith("k2", "/blog/rtl");
  });

  it("shows an alert when saving fails", async () => {
    const onAssignOwner = vi.fn(async () => ({ error: "Nope" }));
    const w = mount(NqKeywordPlanner, { props: { keywords, onAssignOwner } });
    const tabs = w.findAll('[role="tab"]');
    await tabs[2]!.trigger("mousedown");
    await tabs[2]!.trigger("click");
    const keep = w.findAll("button").find((b) => b.text() === "Keep this page")!;
    await keep.trigger("click");
    await tabs[0]!.trigger("mousedown");
    await tabs[0]!.trigger("click");
    await new Promise((r) => setTimeout(r));
    expect(w.get('[role="alert"]').text()).toContain("Nope");
  });

  it("classifies intent", () => {
    expect(classifyIntent("best crm")).toBe("commercial");
    expect(classifyIntent("سعر الاشتراك")).toBe("transactional");
  });
});
