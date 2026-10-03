import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NasaqProvider } from "../../provider";
import { NqDetailLayout, groupDetailTabs, stepDetailTab } from ".";

const tabs = [
  { key: "overview", label: "Overview", section: "General" },
  { key: "logs", label: "Logs", section: "General", badge: 12 },
  { key: "off", label: "Off", section: "Settings", disabled: true },
  { key: "settings", label: "Settings", section: "Settings" },
];
const identity = { name: "Postgres", version: "2.4.1", kind: "Source", status: { label: "Enabled", tone: "success" as const }, slug: "postgres" };

describe("detail layout logic", () => {
  it("groups by section, keeping unsectioned tabs first", () => {
    const g = groupDetailTabs([{ key: "a" }, { key: "b", section: "X" }, { key: "c", section: "Y" }, { key: "d", section: "X" }]);
    expect(g.map((x) => [x.section, x.tabs.map((t) => t.key)])).toEqual([[null, ["a"]], ["X", ["b", "d"]], ["Y", ["c"]]]);
  });
  it("steps over disabled tabs and wraps", () => {
    expect(stepDetailTab(tabs, "logs", 1)?.key).toBe("settings");
    expect(stepDetailTab(tabs, "settings", 1)?.key).toBe("overview");
    expect(stepDetailTab(tabs, "overview", -1)?.key).toBe("settings");
    expect(stepDetailTab(tabs, "logs", "first")?.key).toBe("overview");
    expect(stepDetailTab(tabs, "logs", "last")?.key).toBe("settings");
    expect(stepDetailTab([], "x", 1)).toBeUndefined();
  });
});

describe("NqDetailLayout", () => {
  const make = (props: Record<string, unknown> = {}) =>
    mount(NqDetailLayout, { props: { tabs, activeTab: "overview", identity, ...props }, slots: { default: "<p>content</p>" }, attachTo: document.body });

  it("renders sidebar, tab bar, hero and content", () => {
    const w = make({ activity: { count: 128430, countLabel: "records", series: [1, 2, 3] } });
    expect(w.find('[data-slot="detail-layout"]').exists()).toBe(true);
    expect(w.find('[data-slot="detail-sidebar"] nav').attributes("aria-label")).toBe("Sections");
    const side = w.findAll('[data-slot="detail-sidebar"] [data-slot="detail-tab"]');
    expect(side).toHaveLength(4);
    expect(w.findAll('[data-slot="detail-tabbar"] [data-slot="detail-tab"]')).toHaveLength(4);
    expect(side[0]!.attributes("aria-current")).toBe("page");
    expect(side[0]!.attributes("data-active")).toBe("true");
    expect(side[0]!.attributes("tabindex")).toBe("0");
    expect(side[1]!.attributes("tabindex")).toBe("-1");
    expect(side[1]!.text()).toContain("12");
    expect(w.find('[data-slot="detail-hero"] h1').text()).toBe("Postgres");
    expect(w.find('[data-slot="detail-hero"]').text()).toContain("2.4.1");
    expect(w.find('[data-slot="detail-activity"]').text()).toContain("128.4K");
    const panel = w.find('[data-slot="detail-content"]');
    expect(panel.text()).toBe("content");
    expect(side[0]!.attributes("aria-controls")).toBe(panel.attributes("id"));
    w.unmount();
  });

  it("emits the clicked tab and moves with the arrow keys, Home and End", async () => {
    const w = make({ activeTab: "logs" });
    const side = w.findAll('[data-slot="detail-sidebar"] [data-slot="detail-tab"]');
    await side[3]!.trigger("click");
    expect(w.emitted("update:activeTab")![0]).toEqual(["settings"]);
    await side[1]!.trigger("keydown", { key: "ArrowDown" });
    expect(w.emitted("update:activeTab")![1]).toEqual(["settings"]);
    await side[1]!.trigger("keydown", { key: "ArrowUp" });
    expect(w.emitted("update:activeTab")![2]).toEqual(["overview"]);
    await side[1]!.trigger("keydown", { key: "End" });
    expect(w.emitted("update:activeTab")![3]).toEqual(["settings"]);
    await side[1]!.trigger("keydown", { key: "Home" });
    expect(w.emitted("update:activeTab")![4]).toEqual(["overview"]);
    const bar = w.findAll('[data-slot="detail-tabbar"] [data-slot="detail-tab"]');
    await bar[1]!.trigger("keydown", { key: "ArrowRight" });
    expect(w.emitted("update:activeTab")![5]).toEqual(["settings"]);
    w.unmount();
  });

  it("flips the horizontal arrows in RTL", async () => {
    // jsdom does not resolve `direction` from `dir`, so answer for it.
    const real = window.getComputedStyle.bind(window);
    const spy = vi.spyOn(window, "getComputedStyle").mockImplementation((el: Element, pseudo?: string | null) => {
      const style = real(el, pseudo);
      return new Proxy(style, { get: (t, k) => (k === "direction" ? (el.closest("[dir]")?.getAttribute("dir") ?? "ltr") : Reflect.get(t, k)) });
    });
    const w = mount(
      { components: { NqDetailLayout, NasaqProvider }, setup: () => ({ tabs, identity }), template: `<NasaqProvider locale="ar" target="scope"><NqDetailLayout :tabs="tabs" active-tab="logs" :identity="identity" /></NasaqProvider>` },
      { attachTo: document.body },
    );
    expect(w.find('[data-slot="detail-sidebar"] nav').attributes("aria-label")).toBe("الأقسام");
    const bar = w.findAll('[data-slot="detail-tabbar"] [data-slot="detail-tab"]');
    await bar[1]!.trigger("keydown", { key: "ArrowLeft" });
    const layout = w.findComponent(NqDetailLayout);
    expect(layout.emitted("update:activeTab")![0]).toEqual(["settings"]);
    spy.mockRestore();
    w.unmount();
  });

  it("loading shows skeletons and a loading state", () => {
    const w = make({ loading: true });
    expect(w.find('[data-slot="detail-hero"]').attributes("aria-hidden")).toBe("true");
    expect(w.find('[data-slot="detail-hero"] h1').exists()).toBe(false);
    expect(w.find('[data-slot="loading-state"]').exists()).toBe(true);
    w.unmount();
  });

  it("error replaces hero and content, with a retry", async () => {
    const onRetry = vi.fn();
    const w = make({ error: true, onRetry });
    expect(w.find('[data-slot="error-state"]').text()).toContain("This page could not load");
    expect(w.find('[data-slot="detail-content"]').exists()).toBe(false);
    await w.find('[data-slot="error-state"] button').trigger("click");
    expect(onRetry).toHaveBeenCalledOnce();
    w.unmount();
    const msg = make({ error: "Boom" });
    expect(msg.find('[data-slot="error-state"]').text()).toContain("Boom");
    expect(msg.find('[data-slot="error-state"] button').exists()).toBe(false);
    msg.unmount();
  });
});
