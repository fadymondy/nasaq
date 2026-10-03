import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { NqMapView, mapCluster, mapFit, mapFromScreen, mapProject, mapToScreen, type MapPin } from ".";

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

const pins: MapPin[] = [
  { id: "a", lat: 24.7136, lng: 46.6753, label: "Van 12", labelAr: "شاحنة 12", layer: "vans", tone: "info", status: "Moving", meta: [{ label: "Speed", value: 42 }] },
  { id: "b", lat: 24.75, lng: 46.72, label: "Van 7", layer: "vans" },
];
const layers = [{ id: "vans", label: "Vans" }];

describe("geo", () => {
  it("round-trips screen coordinates", () => {
    const size = { width: 800, height: 450 };
    const view = { center: { lat: 24.7, lng: 46.7 }, zoom: 12 };
    const p = mapToScreen({ lat: 24.71, lng: 46.71 }, view, size);
    const back = mapFromScreen(p, view, size);
    expect(back.lat).toBeCloseTo(24.71, 5);
    expect(mapProject({ lat: 0, lng: 0 }, 1).x).toBe(256);
    expect(mapFit(pins, size, {}).zoom).toBeGreaterThan(5);
    expect(mapCluster(pins, 3, {}).some((i) => i.type === "cluster")).toBe(true);
  });
});

describe("NqMapView", () => {
  it("renders pins, grid and zoom buttons", async () => {
    const w = mount(NqMapView, { props: { pins, layers }, attachTo: document.body });
    await nextTick();
    expect(w.attributes("data-slot")).toBe("map-view");
    expect(w.attributes("dir")).toBe("ltr");
    expect(w.findAll("[data-pin]")).toHaveLength(2);
    expect(w.find("[data-slot=map-grid]").exists()).toBe(true);
    expect(w.find("button[aria-label='Zoom in']").exists()).toBe(true);
  });

  it("selects a pin and shows the card with a layer toggle", async () => {
    const w = mount(NqMapView, { props: { pins, layers }, attachTo: document.body });
    await nextTick();
    await w.find("[data-pin=a]").trigger("click");
    expect(w.emitted("select")![0]).toEqual(["a"]);
    expect(w.emitted("pinClick")).toHaveLength(1);
    expect(w.find("[data-slot=map-card]").text()).toContain("Van 12");
    expect(w.find("[data-slot=map-card]").text()).toContain("42");
    await w.find("[data-slot=map-card] button[aria-label='Close']").trigger("click");
    expect(w.find("[data-slot=map-card]").exists()).toBe(false);
  });

  it("hides a layer from the legend", async () => {
    const w = mount(NqMapView, { props: { pins, layers, layersPanel: "expanded" }, attachTo: document.body });
    await nextTick();
    await w.find("[data-slot=map-legend] [role=checkbox]").trigger("click");
    expect(w.emitted("update:visibleLayers")![0]).toEqual([[]]);
    expect(w.findAll("[data-pin]")).toHaveLength(0);
  });

  it("zooms with the keyboard and the buttons", async () => {
    const w = mount(NqMapView, { props: { pins, layers }, attachTo: document.body });
    await nextTick();
    await w.trigger("keydown", { key: "+" });
    expect(w.emitted("update:view")).toHaveLength(1);
    await w.find("button[aria-label='Zoom out']").trigger("click");
    expect(w.emitted("update:view")).toHaveLength(2);
  });

  it("renders Arabic labels", async () => {
    const w = mount(NqMapView, { props: { pins, layers, locale: "ar" }, attachTo: document.body });
    await nextTick();
    expect(w.attributes("aria-label")).toBe("الخريطة");
    expect(w.find("[data-pin=a]").attributes("aria-label")).toBe("شاحنة 12");
  });

  it("clusters when forced", async () => {
    const w = mount(NqMapView, { props: { pins, cluster: true, clusterRadius: 100000, view: { center: { lat: 24.73, lng: 46.7 }, zoom: 3 } }, attachTo: document.body });
    await nextTick();
    expect(w.find("[data-cluster]").exists()).toBe(true);
  });

  it("adds vertices while editing", async () => {
    const w = mount(NqMapView, { props: { editing: true }, attachTo: document.body });
    await nextTick();
    await w.trigger("keydown", { key: "Enter" });
    expect(w.emitted("areaChange")![0]![0]).toHaveLength(1);
    expect(w.find("[data-vertex]").exists()).toBe(true);
  });
});
