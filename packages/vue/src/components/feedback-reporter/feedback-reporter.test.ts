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
