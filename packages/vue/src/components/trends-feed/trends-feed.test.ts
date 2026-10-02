import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NqSourcesCatalogue, NqTrendsFeed, trendActionsFor, resolveTrendActiveTier, type TrendSource, type TrendTopic } from ".";

const now = new Date("2026-09-29T09:00:00Z");
const topics: TrendTopic[] = [
  {
    id: "a",
    title: "Hot topic",
    summary: "Summary text",
    score: 90,
    reasons: ["Mentioned by 6 outlets"],
    outlets: [{ id: "o1", name: "Asharq" }, { id: "o2", name: "Argaam" }],
    items: [{ id: "i1", title: "Article one", outlet: "Asharq", url: "https://example.com/1", publishedAt: "2026-09-29T08:00:00Z" }],
    detectedAt: "2026-09-29T06:00:00Z",
    state: "new",
  },
  { id: "b", title: "Cool topic", score: 40, outlets: [], items: [], detectedAt: "2026-09-28T06:00:00Z", state: "new" },
  { id: "c", title: "Saved one", score: 50, outlets: [], items: [], detectedAt: "2026-09-28T06:00:00Z", state: "saved" },
];
const sources: TrendSource[] = [
  { id: "s1", name: "Primary feed", tier: 1, enabled: true, health: "down", url: "https://example.com" },
  { id: "s2", name: "Backup feed", tier: 2, enabled: true, health: "ok", lastFetchedAt: "2026-09-29T08:00:00Z", perDay: 1200 },
];

afterEach(() => {
  document.body.innerHTML = "";
});

describe("NqTrendsFeed", () => {
  it("counts per state, groups by day (Today / Yesterday) and flags hot topics", () => {
    const w = mount(NqTrendsFeed, { props: { topics, now, timeZone: "UTC" } });
    const root = w.get('[data-slot="trends-feed"]');
    const tabs = root.findAll('[data-slot="tabs-tab"]').map((t) => t.text());
    expect(tabs[0]).toContain("New");
    expect(tabs[0]).toContain("2");
    expect(root.findAll("h3").map((h) => h.text())).toEqual(["Today", "Yesterday"]);
    expect(root.text()).toContain("Hot");
    expect(root.text()).toContain("Mentioned by 6 outlets");
    expect(root.text()).toContain("2 outlets");
    expect(root.text()).toContain("Show 1 article");
  });

  it("runs an action, waits on it and shows the failure inline", async () => {
    const onAction = vi.fn().mockRejectedValue(new Error("nope"));
    const w = mount(NqTrendsFeed, { props: { topics, now, timeZone: "UTC", onAction } });
    const save = w.findAll("button").find((b) => b.text() === "Save")!;
    await save.trigger("click");
    await flushPromises();
    expect(onAction).toHaveBeenCalledWith(topics[0], "save");
    expect(w.get('[role="alert"]').text()).toBe("Could not save. Try again.");
  });

  it("shows the empty state for a tab without topics and offers restore only on dismissed", () => {
    const w = mount(NqTrendsFeed, { props: { topics, now, defaultState: "dismissed" } });
    expect(w.text()).toContain("No dismissed topics");
    expect(trendActionsFor("dismissed")).toEqual(["restore"]);
  });

  it("shows the error state with a retry", async () => {
    const onRetry = vi.fn();
    const w = mount(NqTrendsFeed, { props: { topics, error: "Feed offline", onRetry } });
    expect(w.text()).toContain("Feed offline");
    await w.findAll("button").find((b) => b.text() === "Retry now")!.trigger("click");
    expect(onRetry).toHaveBeenCalled();
  });

  it("every topic has a row-actions button that opens its context menu", () => {
    const w = mount(NqTrendsFeed, { props: { topics, now, onAction: async () => undefined }, attachTo: document.body });
    expect(w.findAll('button[aria-label^="Actions for"]')).toHaveLength(2);
    w.unmount();
  });
});

describe("NqSourcesCatalogue", () => {
  it("falls back to the next tier and marks it active", () => {
    expect(resolveTrendActiveTier(sources).tier).toBe(2);
    const w = mount(NqSourcesCatalogue, { props: { sources, now } });
    const root = w.get('[data-slot="sources-catalogue"]');
    expect(root.text()).toContain("Tier 1 has no working source, so tier 2 is being used.");
    expect(root.text()).toContain("Down");
    expect(root.text()).toContain("Working");
    expect(root.text()).toContain("1,200 a day");
    expect(root.text()).toContain("Never");
  });

  it("says when nothing works and renders a switch plus a menu button per source", () => {
    const w = mount(NqSourcesCatalogue, { props: { sources: [sources[0]!], now, onEnabledChange: async () => undefined } });
    expect(w.text()).toContain("No source is working");
    expect(w.findAll('[role="switch"]')).toHaveLength(1);
    expect(w.findAll('button[aria-label^="Actions for"]')).toHaveLength(1);
  });

  it("toggling calls onEnabledChange and a rejection shows an error", async () => {
    const onEnabledChange = vi.fn().mockRejectedValue(new Error("x"));
    const w = mount(NqSourcesCatalogue, { props: { sources, now, onEnabledChange } });
    await w.get('[role="switch"]').trigger("click");
    await flushPromises();
    expect(onEnabledChange).toHaveBeenCalledWith(sources[0], false);
    expect(w.text()).toContain("Could not change the source");
  });
});
