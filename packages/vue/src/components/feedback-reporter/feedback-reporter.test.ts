import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqFeedbackFloatingLauncher, NqFeedbackHub, NqFeedbackLauncherConfigurator, NqShakeReportSheet, countByStatus, feedbackInstallSnippet, isShake, normalizePosition, useShakeToReport } from ".";
import { defineComponent, h } from "vue";

const issues = [
  { id: "a", title: "Cannot pay", status: "open" as const, votes: 4, author: "Sara" },
  { id: "b", title: "Slow page", status: "in-progress" as const, votes: 1, voted: true },
  { id: "c", title: "Typo", status: "resolved" as const, votes: 0 },
];

describe("feedback model", () => {
  it("normalizes positions, counts and detects shakes", () => {
    expect(normalizePosition("tab", "top-start")).toBe("edge-start");
    expect(normalizePosition("pill", "edge-end")).toBe("bottom-end");
    expect(countByStatus(issues)).toEqual({ all: 3, open: 1, "in-progress": 1, resolved: 1 });
    expect(isShake([1, 2, 3], 3)).toBe(true);
    expect(feedbackInstallSnippet({ shape: "pill", position: "bottom-end", label: "Hi" }, "json")).toContain("pill");
  });
});

describe("NqFeedbackFloatingLauncher", () => {
  it("normalizes the position and names the circle", () => {
    const w = mount(NqFeedbackFloatingLauncher, { props: { shape: "tab", position: "top-end", count: 3 } });
    expect(w.attributes("data-slot")).toBe("feedback-launcher");
    expect(w.attributes("data-position")).toBe("edge-end");
    expect(w.text()).toContain("Feedback");
    const c = mount(NqFeedbackFloatingLauncher, { props: { shape: "circle", label: "Help" } });
    expect(c.attributes("aria-label")).toBe("Help");
    expect(c.text()).toBe("");
  });
});

describe("NqFeedbackHub", () => {
  it("filters by status and votes", async () => {
    const onVote = vi.fn(async () => undefined);
    const onReportNew = vi.fn();
    const w = mount(NqFeedbackHub, { props: { issues, page: "/pay", onVote, onReportNew }, attachTo: document.body });
    expect(w.findAll("li")).toHaveLength(3);
    expect(w.text()).toContain("by Sara");
    const vote = w.findAll("li")[0]!.get("button[aria-pressed]");
    expect(vote.attributes("aria-pressed")).toBe("false");
    await vote.trigger("click");
    await flushPromises();
    expect(onVote).toHaveBeenCalledWith("a");
    expect(w.findAll("li")[1]!.get("button[aria-pressed]").attributes("disabled")).toBeDefined();
    expect(w.findAll("li")[2]!.get("button[aria-pressed]").attributes("disabled")).toBeDefined();
    await w.findAll("button").find((b) => b.text().includes("Report a problem"))!.trigger("click");
    expect(onReportNew).toHaveBeenCalled();
    await w.findAll("[data-slot=toggle]")[3]!.trigger("click");
    expect(w.findAll("li")).toHaveLength(1);
    w.unmount();
  });

  it("shows the empty state", () => {
    const w = mount(NqFeedbackHub, { props: { issues: [] } });
    expect(w.text()).toContain("Nothing reported here");
  });
});

describe("NqFeedbackLauncherConfigurator", () => {
  it("emits changes and prints the code", async () => {
    const w = mount(NqFeedbackLauncherConfigurator, { props: { modelValue: { shape: "pill", position: "bottom-end", label: "Feedback" } }, attachTo: document.body });
    expect(w.get('[data-slot="feedback-configurator-preview"] [data-slot="feedback-launcher"]').attributes("tabindex")).toBe("-1");
    await w.findAll("[data-slot=toggle]").find((b) => b.text() === "Circle")!.trigger("click");
    expect(w.emitted("update:modelValue")![0]![0]).toEqual({ shape: "circle", position: "bottom-end", label: "Feedback" });
    expect(w.text()).toContain("NEXT_PUBLIC_MAHAAM_FEEDBACK_KEY");
    w.unmount();
  });
});

describe("NqShakeReportSheet", () => {
  it("reports and closes", async () => {
    const onReport = vi.fn();
    const onEnabledChange = vi.fn();
    const w = mount(NqShakeReportSheet, { props: { open: true, onReport, enabled: true, onEnabledChange }, attachTo: document.body });
    await flushPromises();
    const sheet = document.body.querySelector('[data-slot="shake-report-sheet"]')!;
    expect(sheet.textContent).toContain("Something wrong?");
    expect(sheet.querySelector('[role="switch"]')).not.toBeNull();
    [...sheet.querySelectorAll("button")].find((b) => b.textContent?.includes("Report a problem"))!.click();
    expect(onReport).toHaveBeenCalled();
    expect(w.emitted("update:open")![0]).toEqual([false]);
    w.unmount();
  });
});

describe("useShakeToReport", () => {
  it("fires once after enough jolts", async () => {
    const onShake = vi.fn();
    const w = mount(defineComponent({ setup: () => useShakeToReport({ onShake, cooldown: 100000 }), render: () => h("div") }));
    class Fake extends Event {}
    (globalThis as unknown as { DeviceMotionEvent: unknown }).DeviceMotionEvent = Fake;
    await flushPromises();
    w.unmount();
    delete (globalThis as unknown as { DeviceMotionEvent?: unknown }).DeviceMotionEvent;
    expect(onShake).not.toHaveBeenCalled();
  });
});

describe("movable launcher and My reports", () => {
  it("snaps, steps and parses launcher spots", async () => {
    const m = await import(".");
    expect(m.snapLauncherSpot({ x: 10, y: 300 }, { width: 400, height: 600 })).toEqual({ side: "start", y: 0.5 });
    expect(m.snapLauncherSpot({ x: 10, y: 300 }, { width: 400, height: 600 }, true).side).toBe("end");
    expect(m.snapLauncherSpot({ x: 390, y: 0 }, { width: 400, height: 600 }, false, 40).y).toBeCloseTo(36 / 600, 3);
    expect(m.spotFromPosition("bottom-start")).toEqual({ side: "start", y: 0.9 });
    expect(m.moveLauncherSpot({ side: "end", y: 0.93 }, "down").y).toBe(0.95);
    expect(m.moveLauncherSpot({ side: "end", y: 0.5 }, "start").side).toBe("start");
    expect(m.parseLauncherSpot('{"side":"end","y":0.4}')).toEqual({ side: "end", y: 0.4 });
    expect(m.parseLauncherSpot("nope")).toBeNull();
    expect(m.filterHubIssues([{ id: "1", title: "a", status: "open", mine: true }, { id: "2", title: "b", status: "open" }], "mine")).toHaveLength(1);
  });

  it("moves with Alt + arrows, saves the spot and swallows the click after a drag", async () => {
    localStorage.clear();
    const onClick = vi.fn();
    const onSpotChange = vi.fn();
    const w = mount(NqFeedbackFloatingLauncher, { props: { movable: true, shape: "tab", onClick, onSpotChange }, attachTo: document.body });
    expect(w.attributes("data-movable")).toBe("true");
    expect(w.attributes("aria-keyshortcuts")).toContain("Alt+ArrowUp");
    expect(w.attributes("title")).toContain("Drag to move");
    await w.trigger("keydown", { key: "ArrowUp", altKey: true });
    expect(w.attributes("data-side")).toBe("end");
    expect(w.attributes("data-position")).toBeUndefined();
    expect(w.classes()).toContain("-translate-y-1/2");
    expect(w.classes()).toContain("touch-none");
    expect(w.attributes("style")).toContain("top: 45%");
    await w.trigger("keydown", { key: "ArrowLeft", altKey: true });
    expect(w.attributes("data-side")).toBe("start");
    expect(w.classes()).toContain("rounded-e-card");
    expect(JSON.parse(localStorage.getItem("nasaq-feedback-launcher")!)).toEqual({ side: "start", y: 0.45 });
    expect(onSpotChange).toHaveBeenCalledTimes(2);
    await w.trigger("click");
    expect(onClick).toHaveBeenCalledTimes(1);
    w.unmount();
  });

  it("reads a saved spot after mount and ignores everything when not movable", async () => {
    localStorage.setItem("k", '{"side":"start","y":0.3}');
    const w = mount(NqFeedbackFloatingLauncher, { props: { movable: true, storageKey: "k" } });
    await flushPromises();
    expect(w.attributes("data-side")).toBe("start");
    const fixed = mount(NqFeedbackFloatingLauncher);
    await fixed.trigger("keydown", { key: "ArrowUp", altKey: true });
    expect(fixed.attributes("data-side")).toBeUndefined();
    expect(fixed.attributes("data-position")).toBe("bottom-end");
  });

  it("shows Mine, Yours, its empty state and Load more", async () => {
    const list = [
      { id: "a", title: "Mine one", status: "open" as const, mine: true, author: "Me" },
      { id: "b", title: "Theirs", status: "open" as const, author: "Sara" },
    ];
    const onLoadMore = vi.fn();
    const onFilterChange = vi.fn();
    const w = mount(NqFeedbackHub, { props: { issues: list, counts: { all: 12 }, hasMore: true, onLoadMore, onFilterChange }, attachTo: document.body });
    expect(w.text()).toContain("Mine");
    expect(w.text()).toContain("Yours");
    expect(w.text()).not.toContain("by Me");
    expect(w.text()).toContain("Showing 2 of 12");
    await w.findAll("button").find((b) => b.text() === "Load more")!.trigger("click");
    expect(onLoadMore).toHaveBeenCalled();
    const mine = w.findAll("button").find((b) => b.text().startsWith("Mine"))!;
    await mine.trigger("click");
    expect(onFilterChange).toHaveBeenCalledWith("mine");
    expect(w.findAll("li")).toHaveLength(1);
    const none = mount(NqFeedbackHub, { props: { issues: [{ id: "x", title: "T", status: "open" as const }], mineTab: true }, attachTo: document.body });
    expect(none.text()).toContain("Mine");
    await none.findAll("button").find((b) => b.text().startsWith("Mine"))!.trigger("click");
    expect(none.text()).toContain("You have not reported anything");
    w.unmount();
    none.unmount();
  });
});
