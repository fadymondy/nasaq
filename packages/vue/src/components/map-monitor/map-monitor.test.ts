import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NasaqProvider } from "../../provider";
import { h } from "vue";
import { countMapAlerts, filterMapAlerts, isMapRegionView, mapAlertTime, NqMapMonitor, type MapAlert } from ".";

beforeEach(() => {
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
    observe() {}
    disconnect() {}
    unobserve() {}
  };
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 800 });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => 450 });
});
afterEach(() => {
  document.body.innerHTML = "";
});

const NOW = Date.UTC(2026, 8, 29, 9);
const HOUR = 3_600_000;
const alerts: MapAlert[] = [
  { id: "a", lat: 24.71, lng: 46.68, title: "Road closed", titleAr: "طريق مغلق", severity: "critical", at: NOW - HOUR },
  { id: "b", lat: 24.77, lng: 46.74, title: "Outage", severity: "high", at: NOW - 5 * HOUR },
  { id: "c", lat: 21.5, lng: 39.1, title: "Old news", severity: "low", at: NOW - 72 * HOUR },
];
const regions = [
  { id: "ksa", label: "Saudi Arabia", labelAr: "السعودية", center: { lat: 23.9, lng: 45.1 }, zoom: 5 },
  { id: "riyadh", label: "Riyadh", center: { lat: 24.71, lng: 46.67 }, zoom: 10 },
];

describe("map monitor maths", () => {
  it("filters, sorts, counts and reads times", () => {
    expect(filterMapAlerts(alerts, 24 * HOUR, NOW).map((a) => a.id)).toEqual(["a", "b"]);
    expect(filterMapAlerts(alerts, null, NOW).map((a) => a.id)).toEqual(["a", "b", "c"]);
    expect(countMapAlerts(alerts)).toEqual({ critical: 1, high: 1, medium: 0, low: 1 });
    expect(mapAlertTime("2026-09-29T09:00:00Z")).toBe(NOW);
    expect(isMapRegionView({ center: regions[0]!.center, zoom: 5 }, regions[0]!)).toBe(true);
    expect(isMapRegionView(null, regions[0]!)).toBe(false);
  });
});

describe("NqMapMonitor", () => {
  const make = (props: Record<string, unknown> = {}) => mount(NqMapMonitor, { props: { alerts, regions, now: NOW, ...props }, attachTo: document.body });

  it("lists every alert under All and filters by range", async () => {
    const w = make();
    expect(w.attributes("data-slot")).toBe("map-monitor");
    expect(w.findAll('[data-slot="map-monitor-alert"]')).toHaveLength(3);
    await w.find('[data-range="24h"]').trigger("click");
    await flushPromises();
    expect(w.findAll('[data-slot="map-monitor-alert"]').map((e) => e.attributes("data-alert"))).toEqual(["a", "b"]);
    expect(w.emitted("rangeChange")?.[0]).toEqual(["24h"]);
    w.unmount();
  });

  it("reports the visible alerts", async () => {
    const w = make({ defaultRange: "24h" });
    expect((w.emitted("visibleAlertsChange")![0]![0] as MapAlert[]).map((a) => a.id)).toEqual(["a", "b"]);
    w.unmount();
  });

  it("selects an alert and its pin together", async () => {
    const w = make();
    await w.find('[data-alert="b"] button').trigger("click");
    await flushPromises();
    expect(w.emitted("select")?.[0]).toEqual(["b"]);
    expect(w.find('[data-alert="b"] button').attributes("aria-current")).toBe("true");
    w.unmount();
  });

  it("jumps to a region and highlights it", async () => {
    const w = make();
    await w.find('[data-region="riyadh"]').trigger("click");
    await flushPromises();
    expect(w.emitted("regionChange")?.[0]).toEqual(["riyadh"]);
    expect(w.find('[data-region="riyadh"]').attributes("data-state")).toBe("on");
    w.unmount();
  });

  it("toggles the alerts panel", async () => {
    const w = make();
    const aside = () => w.find('[data-slot="map-monitor-alerts"]');
    expect(aside().attributes("hidden")).toBeUndefined();
    const button = w.findAll("button").find((b) => b.attributes("aria-controls") === aside().attributes("id"))!;
    expect(button.attributes("aria-expanded")).toBe("true");
    await button.trigger("click");
    expect(aside().attributes("hidden")).toBeDefined();
    expect(w.emitted("update:alertsOpen")?.[0]).toEqual([false]);
    w.unmount();
  });

  it("shows an empty message", () => {
    const e = make({ alerts: [] });
    expect(e.text()).toContain("No alerts in this time range.");
    e.unmount();
  });

  it("uses Arabic strings and titles under an Arabic provider", () => {
    const w = mount(
      { render: () => h(NasaqProvider, { locale: "ar" }, () => h(NqMapMonitor, { alerts: [alerts[0]!], now: NOW, defaultRange: "24h" })) },
      { attachTo: document.body },
    );
    expect(w.text()).toContain("الخريطة المباشرة");
    expect(w.text()).toContain("طريق مغلق");
    w.unmount();
  });
});
