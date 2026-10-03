import Alpine from "alpinejs";
import { beforeAll, describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 800 });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => 450 });
});

const q = (host: HTMLElement, sel: string) => host.querySelector(sel) as HTMLElement;
const qa = (host: HTMLElement, sel: string) => [...host.querySelectorAll<HTMLElement>(sel)];
const visible = (el: Element | null) => !!el && (el as HTMLElement).style.display !== "none";
const alertIds = (host: HTMLElement) => qa(host, "[data-slot=map-monitor-alert]").map((e) => e.getAttribute("data-alert"));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (el: Element): any => Alpine.$data(el as HTMLElement);

async function boot() {
  const host = await mount("map-monitor");
  const root = q(host, "[data-slot=map-monitor]");
  return { host, root };
}

describe("map-monitor (alpine)", () => {
  it("lists the alerts inside the default range, most severe first", async () => {
    const { host, root } = await boot();
    expect(root.querySelectorAll("[data-slot=map-view]").length).toBe(1);
    // Default 7 days: the 72 hour old alert is in, nothing is older.
    expect(alertIds(host)).toEqual(["a1", "a2", "a3"]);
    expect(q(host, "[data-alert=a1]").getAttribute("data-severity")).toBe("critical");
    expect(q(host, "[data-alert=a1]").textContent).toContain("Road closed");
    expect(q(host, "[data-alert=a1]").textContent).toContain("King Fahd Rd");
  });

  it("narrows by time range and reports the visible alerts", async () => {
    const { host, root } = await boot();
    const seen: string[][] = [];
    root.addEventListener("map-monitor-visible", (e) => seen.push((e as CustomEvent).detail.alerts.map((a: { id: string }) => a.id)));
    const ranges: string[] = [];
    root.addEventListener("map-monitor-range", (e) => ranges.push((e as CustomEvent).detail.id));
    q(host, "[data-range=24h]").click();
    await tick();
    expect(alertIds(host)).toEqual(["a1", "a2"]);
    expect(ranges).toEqual(["24h"]);
    expect(seen.at(-1)).toEqual(["a1", "a2"]);
    // The map got the matching pins.
    expect(data(q(host, "[data-slot=map-view]")).pins.map((p: { id: string }) => p.id)).toEqual(["a1", "a2"]);
    // Pressing the pressed range keeps it.
    q(host, "[data-range=24h]").click();
    await tick();
    expect(alertIds(host)).toEqual(["a1", "a2"]);
    expect(q(host, "[data-range=24h]").getAttribute("aria-pressed")).toBe("true");
  });

  it("selects an alert on the map and centres on it", async () => {
    const { host } = await boot();
    q(host, "[data-alert=a2] button").click();
    await tick();
    expect(q(host, "[data-alert=a2] button").getAttribute("aria-current")).toBe("true");
    const map = data(q(host, "[data-slot=map-view]"));
    expect(map.selectedId).toBe("a2");
    expect(map.own.center.lat).toBeCloseTo(24.77);
    expect(map.own.zoom).toBeGreaterThanOrEqual(10);
  });

  it("selecting a pin on the map selects its alert", async () => {
    const { host } = await boot();
    data(q(host, "[data-slot=map-view]")).select("a1");
    await tick();
    expect(q(host, "[data-alert=a1] button").getAttribute("aria-current")).toBe("true");
  });

  it("jumps to a region and keeps it highlighted until the map moves", async () => {
    const { host } = await boot();
    const region = q(host, "[data-region=riyadh]");
    expect(region.getAttribute("aria-pressed")).toBe("false");
    region.click();
    await tick();
    expect(region.getAttribute("aria-pressed")).toBe("true");
    const map = data(q(host, "[data-slot=map-view]"));
    expect(map.own).toMatchObject({ center: { lat: 24.71, lng: 46.67 }, zoom: 10 });
    map.setView({ center: { lat: 20, lng: 40 }, zoom: 6 });
    await tick();
    expect(region.getAttribute("aria-pressed")).toBe("false");
  });

  it("shows and hides the alerts panel", async () => {
    const { host } = await boot();
    const aside = q(host, "[data-slot=map-monitor-alerts]");
    const button = qa(host, "button").find((b) => b.getAttribute("aria-controls") === aside.id)!;
    expect(aside.hasAttribute("hidden")).toBe(false);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(button.getAttribute("aria-label")).toBe("Hide alerts, 3 alerts");
    button.click();
    await tick();
    expect(aside.hasAttribute("hidden")).toBe(true);
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(button.getAttribute("aria-label")).toBe("Show alerts, 3 alerts");
  });

  it("counts the alerts and picks the badge tone", async () => {
    const { host } = await boot();
    const badges = qa(host, "[data-slot=badge]");
    const danger = badges.find((b) => b.textContent?.trim() === "3" && visible(b));
    expect(danger).toBeTruthy();
    expect(qa(host, "[data-slot=map-monitor-alerts] [data-slot=badge]").filter(visible).map((b) => b.textContent!.replace(/\s+/g, " ").trim())).toEqual(["Critical: 1", "High: 1", "Low: 1"]);
  });
});
