import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  computeUptime,
  formatUptime,
  isOpenUptimeIncident,
  NqIncidentList,
  NqUptimeBadge,
  NqUptimeBar,
  NqUptimeMonitors,
  uptimeIncidentMinutes,
  uptimeOverallStatus,
  uptimeResponseLabel,
  uptimeTone,
  type Incident,
  type UptimeMonitor,
} from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const monitors: UptimeMonitor[] = [
  { id: "1", name: "Storefront", target: "https://example.com", kind: "http", status: "up", uptime: { "24h": 100, "7d": 99.95, "30d": 99.97 }, checks: ["up", "up", "degraded", "none", "down"], responseMs: 180, intervalSec: 60 },
  { id: "2", name: "Checkout API", target: "https://api.example.com/health", kind: "http", status: "down", uptime: { "30d": 97.2 }, responseMs: 2400 },
  { id: "3", name: "Mail", target: "mail.example.com:25", kind: "tcp", status: "paused", uptime: { "30d": null } },
];
const incidents: Incident[] = [
  {
    id: "i1",
    title: "Checkout failing",
    status: "investigating",
    impact: "major",
    startedAt: Date.now() - 3_600_000,
    services: ["Checkout API"],
    updates: [{ at: Date.now() - 3_000_000, status: "investigating", body: "We are looking into it." }],
  },
  { id: "i2", title: "Slow pages", status: "resolved", impact: "minor", startedAt: Date.now() - 86_400_000, resolvedAt: Date.now() - 86_400_000 + 42 * 60_000 },
];

describe("uptime helpers", () => {
  it("computes, formats and tones uptime", () => {
    expect(computeUptime(["up", "down", "none", "degraded"])).toBeCloseTo(66.666, 2);
    expect(computeUptime(["none"])).toBeNull();
    expect(formatUptime(99.996)).toBe("99.99%");
    expect(formatUptime(null)).toBe("–");
    expect(uptimeTone(99.95)).toBe("success");
    expect(uptimeTone(99.5)).toBe("warning");
    expect(uptimeTone(90)).toBe("danger");
    expect(uptimeOverallStatus(["up", "down"])).toBe("partial-outage");
    expect(uptimeOverallStatus(["down", "down"])).toBe("major-outage");
    expect(uptimeOverallStatus(["up", "paused"])).toBe("operational");
    expect(uptimeIncidentMinutes(0, 42 * 60_000)).toBe(42);
    expect(uptimeResponseLabel(2400)).toBe("2.4 s");
    expect(isOpenUptimeIncident({ status: "resolved" })).toBe(false);
  });
});

describe("NqUptimeBar / NqUptimeBadge", () => {
  it("draws one segment per check and a spoken summary", () => {
    const w = mount(NqUptimeBar, { props: { checks: ["up", "down", "none", "degraded"] } });
    expect(w.attributes("data-slot")).toBe("uptime-bar");
    expect(w.attributes("role")).toBe("img");
    expect(w.findAll("span")).toHaveLength(4);
    expect(w.attributes("aria-label")).toBe("2 of 3 recent checks were up");
  });

  it("shows the figure and the period", () => {
    const w = mount(NqUptimeBadge, { props: { percent: 99.95, period: "30d" } });
    expect(w.attributes("data-slot")).toBe("uptime-badge");
    expect(w.text()).toContain("99.95%");
    expect(w.text()).toContain("30d");
  });
});

describe("NqIncidentList", () => {
  it("lists incidents newest first with updates", () => {
    const w = mount(NqIncidentList, { props: { incidents } });
    const items = w.findAll('[data-slot="incident"]');
    expect(items.map((i) => i.attributes("data-status"))).toEqual(["investigating", "resolved"]);
    expect(items[0]!.text()).toContain("We are looking into it.");
    expect(items[1]!.text()).toContain("Lasted 42 min");
  });

  it("shows the empty text", () => {
    const w = mount(NqIncidentList, { props: { incidents: [] } });
    expect(w.text()).toContain("No incidents in this period.");
  });
});

describe("NqUptimeMonitors", () => {
  it("renders the card, the overall status, the rows and the incidents", () => {
    const w = mount(NqUptimeMonitors, { props: { monitors, incidents, class: "max-w-3xl" } });
    expect(w.attributes("data-slot")).toBe("uptime-monitors");
    expect(w.classes()).toEqual(expect.arrayContaining(["w-full", "max-w-3xl"]));
    expect(w.text()).toContain("Partial outage");
    expect(w.text()).toContain("Storefront");
    expect(w.text()).toContain("99.97%");
    expect(w.text()).toContain("1 Open");
    expect(w.findAll('[data-slot="incident"]')).toHaveLength(2);
  });

  it("switches the uptime period", async () => {
    const w = mount(NqUptimeMonitors, { props: { monitors, incidents } });
    const btn = w.findAll("button").find((b) => b.attributes("aria-label") === "24 hours")!;
    await btn.trigger("click");
    await flushPromises();
    expect(w.text()).toContain("100%");
  });

  it("shows the empty state when there are no monitors", () => {
    const w = mount(NqUptimeMonitors, { props: { monitors: [], incidents: [] } });
    expect(w.text()).toContain("No monitors yet");
  });

  it("validates and saves a new monitor", async () => {
    const onSave = vi.fn(async () => {});
    const w = mount(NqUptimeMonitors, { props: { monitors, incidents, onSave }, attachTo: document.body });
    const add = w.findAll("button").find((b) => b.text().includes("Add monitor"))!;
    await add.trigger("click");
    await flushPromises();
    const form = document.querySelector<HTMLFormElement>('[data-slot="monitor-dialog"] form')!;
    expect(form).not.toBeNull();
    form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    await flushPromises();
    expect(onSave).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("This field is required.");
    const inputs = form.querySelectorAll<HTMLInputElement>("input");
    inputs[0]!.value = "Docs";
    inputs[0]!.dispatchEvent(new Event("input", { bubbles: true }));
    inputs[1]!.value = "https://docs.example.com";
    inputs[1]!.dispatchEvent(new Event("input", { bubbles: true }));
    await flushPromises();
    form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    await flushPromises();
    expect(onSave).toHaveBeenCalledWith({ name: "Docs", target: "https://docs.example.com", kind: "http", intervalSec: 60 }, undefined);
  });
});
