import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  NqKeywordTracker,
  NqRankChange,
  NqRankDistribution,
  averagePosition,
  bestPosition,
  competitorStats,
  ctrForPosition,
  difficultyBand,
  parseKeywordList,
  rankBucket,
  rankChange,
  rankDistribution,
  topMovers,
  visibilityShare,
  type TrackedKeyword,
} from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const keywords: TrackedKeyword[] = [
  { id: "k1", keyword: "rtl react components", position: 4, previousPosition: 7, history: [9, 8, 7, 7, 5, 4], url: "/components", volume: 2400, difficulty: 38, features: ["snippet", "paa"] },
  { id: "k2", keyword: "arabic design system", position: 2, previousPosition: 2, history: [3, 3, 2, 2, 2, 2], url: "/design-system", volume: 1900, difficulty: 45 },
  { id: "k3", keyword: "nasaq ui", position: 1, previousPosition: 1, volume: 600, difficulty: 12 },
  { id: "k4", keyword: "react rtl library", position: 12, previousPosition: 9, history: [8, 9, 9, 10, 9, 12], url: "/blog/rtl", volume: 1300, difficulty: 52 },
  { id: "k5", keyword: "ui kit arabic", position: null, previousPosition: 34, volume: 800, difficulty: 64 },
  { id: "k6", keyword: "design tokens guide", position: 18, previousPosition: null, volume: 4400, difficulty: 71 },
];

describe("rank maths", () => {
  it("reads movement with lower as better", () => {
    expect(rankChange(8, 5)).toEqual({ direction: "up", delta: 3 });
    expect(rankChange(5, 8)).toEqual({ direction: "down", delta: -3 });
    expect(rankChange(5, 5).direction).toBe("same");
    expect(rankChange(null, 5).direction).toBe("new");
    expect(rankChange(5, null).direction).toBe("lost");
    expect(rankChange(undefined, 5).direction).toBe("none");
  });

  it("buckets, averages and weighs visibility", () => {
    expect(rankBucket(3)).toBe("top3");
    expect(rankBucket(10)).toBe("top10");
    expect(rankBucket(11)).toBe("top100");
    expect(rankBucket(null)).toBe("unranked");
    expect(rankDistribution([1, 5, 50, null])).toMatchObject({ top3: 1, top10: 1, top100: 1, unranked: 1, total: 4 });
    expect(averagePosition([2, 4, null])).toBe(3);
    expect(bestPosition([9, null, 4])).toBe(4);
    expect(ctrForPosition(1)).toBe(0.3);
    expect(visibilityShare([{ position: 1, volume: 100 }])).toBe(1);
    expect(difficultyBand(10)).toBe("easy");
    expect(difficultyBand(45)).toBe("medium");
    expect(difficultyBand(80)).toBe("hard");
  });

  it("finds the movers and parses a pasted list", () => {
    const m = topMovers(keywords, 3);
    expect(m.gainers.map((k) => k.id)).toEqual(["k1"]);
    expect(m.losers.map((k) => k.id)).toEqual(["k4"]);
    expect(parseKeywordList("Foo bar\nfoo  bar, baz;\n\n qux")).toEqual(["foo bar", "baz", "qux"]);
    const you = { k1: 1, k2: 5 };
    const them = { k1: 3, k2: null };
    expect(competitorStats(them, [{ id: "k1", volume: 10 }, { id: "k2", volume: 10 }], you).ahead).toBe(0);
    expect(competitorStats(you, [{ id: "k1", volume: 10 }, { id: "k2", volume: 10 }], them).ahead).toBe(2);
  });
});

describe("NqRankChange and NqRankDistribution", () => {
  it("renders the arrow, new and lost", () => {
    expect(mount(NqRankChange, { props: { current: 4, previous: 7 } }).text()).toContain("Up 3");
    expect(mount(NqRankChange, { props: { current: 9, previous: 4 } }).attributes("data-direction")).toBe("down");
    expect(mount(NqRankChange, { props: { current: 4, previous: null } }).text()).toBe("New");
    expect(mount(NqRankChange, { props: { current: null, previous: 4 } }).text()).toBe("Lost");
    expect(mount(NqRankChange, { props: { current: 4 } }).text()).toBe("");
  });

  it("draws a stacked bar with a legend", () => {
    const w = mount(NqRankDistribution, { props: { distribution: rankDistribution([1, 5, 50, null]) } });
    expect(w.attributes("data-slot")).toBe("rank-distribution");
    expect(w.findAll("span[data-bucket]")).toHaveLength(4);
    expect(w.findAll("li[data-bucket]")).toHaveLength(4);
    expect(w.find('[role="img"]').attributes("aria-label")).toContain("Top 3: 1 keywords, 25%");
  });
});

describe("NqKeywordTracker", () => {
  it("shows the tiles, the movers and the table sorted by position", () => {
    const w = mount(NqKeywordTracker, { props: { keywords } });
    expect(w.attributes("data-slot")).toBe("keyword-tracker");
    expect(w.text()).toContain("Tracked keywords");
    const rows = w.findAll("tbody tr");
    expect(rows).toHaveLength(6);
    expect(rows[0]!.text()).toContain("nasaq ui");
    expect(w.find('[data-slot="keyword-movers"]').text()).toContain("rtl react components");
    expect(w.find('[data-slot="keyword-movers"]').text()).toContain("react rtl library");
    expect(w.find('[data-slot="rank-distribution"]').exists()).toBe(true);
  });

  it("has the competitors tab only with competitors", () => {
    expect(mount(NqKeywordTracker, { props: { keywords } }).findAll('[role="tab"]')).toHaveLength(1);
    const w = mount(NqKeywordTracker, { props: { keywords, competitors: [{ id: "c1", domain: "me.dev", you: true, ranks: { k1: 4 } }] } });
    expect(w.findAll('[role="tab"]')).toHaveLength(2);
  });

  it("adds row actions for each handler", () => {
    const none = mount(NqKeywordTracker, { props: { keywords } });
    expect(none.findAll('[data-slot="data-table-row-actions"]')).toHaveLength(0);
    const w = mount(NqKeywordTracker, { props: { keywords, onRefresh: async () => {}, onRemoveKeywords: async () => {} } });
    expect(w.findAll('[data-slot="data-table-row-actions"]')).toHaveLength(6);
  });

  it("validates and adds keywords through the dialog", async () => {
    const onAddKeywords = vi.fn(async () => {});
    const w = mount(NqKeywordTracker, { props: { keywords, locations: [{ value: "sa", label: "Saudi Arabia" }], onAddKeywords }, attachTo: document.body });
    const add = w.findAll("button").find((b) => b.text().includes("Add keywords"))!;
    await add.trigger("click");
    await flushPromises();
    const form = document.querySelector<HTMLFormElement>('[data-slot="add-keywords-dialog"] form')!;
    expect(form).not.toBeNull();
    form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    await flushPromises();
    expect(onAddKeywords).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("Add at least one keyword.");
    const ta = form.querySelector<HTMLTextAreaElement>("textarea")!;
    ta.value = "alpha one\nbeta two, alpha one";
    ta.dispatchEvent(new Event("input", { bubbles: true }));
    await flushPromises();
    expect(form.textContent).toContain("2 keywords");
    form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    await flushPromises();
    expect(onAddKeywords).toHaveBeenCalledWith({ keywords: ["alpha one", "beta two"], location: "sa", device: "desktop" });
  });

  it("shows an alert when a refresh fails", async () => {
    const onRefresh = vi.fn(async () => ({ error: "Rate limited" }));
    const w = mount(NqKeywordTracker, { props: { keywords, onRefresh } });
    await w.find('[data-action="refresh"]').trigger("click");
    await flushPromises();
    expect(onRefresh).toHaveBeenCalledWith([]);
    expect(w.find('[role="alert"]').text()).toContain("Rate limited");
  });

  it("takes label overrides", () => {
    const w = mount(NqKeywordTracker, { props: { keywords, labels: { tracked: "Watched" } } });
    expect(w.text()).toContain("Watched");
  });
});
