import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NasaqProvider } from "../../provider";
import { NqPluginCard, NqPluginCardGrid, humanizePluginKind, pluginActivity, pluginSelectionState, togglePluginSelected } from ".";

const NOW = Date.parse("2026-09-29T09:00:00");
const plugin = {
  id: "postgres",
  name: "Postgres",
  version: "2.4.1",
  kind: "source",
  hue: "blue" as const,
  enabled: true,
  description: "Streams rows.",
  lastActiveAt: NOW - 10 * 60_000,
  count: 12400,
  countLabel: "records",
  series: [1, 3, 2, 5],
};

describe("plugin card logic", () => {
  it("buckets activity", () => {
    expect(pluginActivity(NOW - 5 * 60_000, NOW)).toBe("live");
    expect(pluginActivity(NOW - 5 * 3_600_000, NOW)).toBe("recent");
    expect(pluginActivity(NOW - 3 * 86_400_000, NOW)).toBe("idle");
    expect(pluginActivity(null, NOW)).toBe("never");
    expect(pluginActivity("nonsense", NOW)).toBe("never");
  });
  it("humanizes kinds and toggles selection", () => {
    expect(humanizePluginKind("ai_provider")).toBe("Ai provider");
    expect(togglePluginSelected(["a"], "b", true)).toEqual(["a", "b"]);
    expect(togglePluginSelected(["a", "b"], "a", false)).toEqual(["b"]);
    expect(pluginSelectionState(["a"], ["a", "b"])).toBe("some");
    expect(pluginSelectionState([], ["a"])).toBe("none");
    expect(pluginSelectionState(["a"], ["a"])).toBe("all");
  });
});

describe("NqPluginCard", () => {
  it("renders the card, badges, metric and footer links", () => {
    const w = mount(NqPluginCard, { props: { plugin, now: NOW, detailHref: "/p/postgres", pageHref: "/postgres" } });
    const el = w.find('[data-slot="plugin-card"]');
    expect(el.element.tagName).toBe("ARTICLE");
    expect(el.attributes("data-activity")).toBe("live");
    expect(el.attributes("data-selected")).toBeUndefined();
    expect(el.classes()).toEqual(expect.arrayContaining(["rounded-card", "border-border"]));
    expect(w.find("h3").text()).toBe("Postgres");
    expect(el.attributes("aria-labelledby")).toBe(w.find("h3").attributes("id"));
    expect(w.text()).toContain("Source");
    expect(w.text()).toContain("Enabled");
    expect(w.find('[data-slot="plugin-card-activity"]').text()).toContain("Last active");
    expect(w.find('[data-slot="plugin-card-metric"]').text()).toContain("12.4K");
    expect(w.find('[data-slot="sparkline"]').attributes("aria-label")).toBe("Postgres activity");
    const links = w.findAll("footer a");
    expect(links.map((a) => a.attributes("href"))).toEqual(["/postgres", "/p/postgres"]);
    expect(links[1]!.attributes("aria-label")).toBe("Open Postgres details");
  });

  it("shows placeholders without data and a button with a handler", async () => {
    const onOpen = vi.fn();
    const w = mount(NqPluginCard, { props: { plugin: { id: "x", name: "X", enabled: false }, onOpen } });
    expect(w.find('[data-slot="plugin-card"]').attributes("data-activity")).toBe("never");
    expect(w.text()).toContain("No description.");
    expect(w.text()).toContain("No activity");
    expect(w.text()).toContain("Disabled");
    expect(w.find('[data-slot="plugin-card-metric"]').exists()).toBe(false);
    await w.find("footer button").trigger("click");
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it("is not selectable by default; selectable toggles on click but not on a button", async () => {
    const plain = mount(NqPluginCard, { props: { plugin } });
    await plain.find('[data-slot="plugin-card"]').trigger("click");
    expect(plain.emitted("update:selected")).toBeUndefined();
    expect(plain.find('[role="checkbox"]').exists()).toBe(false);

    const w = mount(NqPluginCard, { props: { plugin, selectable: true, onOpen: () => {} } });
    expect(w.find('[role="checkbox"]').attributes("aria-label")).toBe("Select Postgres");
    await w.find('[data-slot="plugin-card"]').trigger("click");
    expect(w.emitted("update:selected")![0]).toEqual([true]);
    await w.find("footer button").trigger("click");
    expect(w.emitted("update:selected")).toHaveLength(1);
  });

  it("marks the selected card", () => {
    const w = mount(NqPluginCard, { props: { plugin, selectable: true, selected: true } });
    const el = w.find('[data-slot="plugin-card"]');
    expect(el.attributes("data-selected")).toBe("true");
    expect(el.classes()).toEqual(expect.arrayContaining(["border-primary", "bg-nq-selected"]));
  });

  describe("long press", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());
    it("selects after 500 ms on touch and swallows the click that follows", async () => {
      const w = mount(NqPluginCard, { props: { plugin, selectable: true } });
      const el = w.find('[data-slot="plugin-card"]');
      await el.trigger("pointerdown", { pointerType: "touch" });
      vi.advanceTimersByTime(499);
      expect(w.emitted("update:selected")).toBeUndefined();
      vi.advanceTimersByTime(2);
      expect(w.emitted("update:selected")![0]).toEqual([true]);
      await el.trigger("click");
      expect(w.emitted("update:selected")).toHaveLength(1);
    });
    it("cancels on pointer up and ignores the mouse", async () => {
      const w = mount(NqPluginCard, { props: { plugin, selectable: true } });
      const el = w.find('[data-slot="plugin-card"]');
      await el.trigger("pointerdown", { pointerType: "touch" });
      await el.trigger("pointerup");
      vi.advanceTimersByTime(800);
      await el.trigger("pointerdown", { pointerType: "mouse" });
      vi.advanceTimersByTime(800);
      expect(w.emitted("update:selected")).toBeUndefined();
    });
  });

  it("speaks Arabic in an Arabic provider", () => {
    const w = mount(
      { components: { NqPluginCard, NasaqProvider }, setup: () => ({ plugin }), template: `<NasaqProvider locale="ar" target="scope"><NqPluginCard :plugin="plugin" detail-href="/x" /></NasaqProvider>` },
    );
    expect(w.text()).toContain("مفعّلة");
    expect(w.text()).toContain("مصدر");
    expect(w.find("footer a").attributes("aria-label")).toBe("فتح تفاصيل Postgres");
  });

  it("the grid is a responsive grid", () => {
    const w = mount(NqPluginCardGrid, { slots: { default: "x" } });
    expect(w.attributes("data-slot")).toBe("plugin-card-grid");
    expect(w.classes()).toEqual(expect.arrayContaining(["grid", "gap-4", "grid-cols-[repeat(auto-fill,minmax(18rem,1fr))]"]));
  });
});
