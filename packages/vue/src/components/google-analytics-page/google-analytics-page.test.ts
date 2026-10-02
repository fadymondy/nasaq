import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { h } from "vue";
import { NasaqProvider } from "../../provider";
import type { IntegrationService } from "../integration-connector";
import { NqGoogleAnalyticsPage, type GoogleAnalyticsData } from ".";

afterEach(() => {
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

const service: IntegrationService = { id: "ga", name: "Google Analytics", scopes: [{ id: "r", label: "Read", required: true }], status: "connected", connectedAs: "o@nasaq.dev" };
const total = (value: number, previous?: number) => ({ value, previous });
const data: GoogleAnalyticsData = {
  summary: { users: total(1000, 900), sessions: total(1500, 1400), engagementRate: total(0.61, 0.58), engagementSeconds: total(134, 121), conversions: total(40, 50) },
  series: [{ date: "2026-09-28", users: 10, sessions: 15, conversions: 1 }],
  realtime: { active: 12, pages: [{ id: "p", label: "/", value: 5 }], countries: [{ code: "SA", value: 7 }] },
  channels: [{ id: "organic", label: "Organic Search", value: 100 }],
  sourceMedium: [{ id: "g", label: "google / organic", value: 90 }],
  pages: [{ id: "home", label: "/", value: 80 }],
  countries: [{ code: "SA", value: 60 }],
  devices: [{ id: "m", label: "Mobile", value: 70 }],
  daily: [{ date: "2026-09-28", count: 15 }],
};
const base = { service, data, period: 28, range: { from: "2026-09-01", to: "2026-09-29" }, onConnect: async () => ({ ok: true }), onDisconnect: async () => ({ ok: true }) };

describe("NqGoogleAnalyticsPage", () => {
  it("renders five tiles, the live counter and the three tabs", () => {
    const w = mount(NqGoogleAnalyticsPage, { props: { ...base, property: "nasaq.dev", class: "extra" } as never });
    expect(w.attributes("data-slot")).toBe("analytics-page");
    expect(w.classes()).toContain("extra");
    expect(w.get("h1").text()).toBe("Google Analytics");
    expect(w.text()).toContain("Traffic and engagement for nasaq.dev");
    expect(w.findAll('[data-slot="metric-tiles"] [data-metric]').map((t) => t.attributes("data-metric"))).toEqual(["users", "sessions", "engagementRate", "engagementSeconds", "conversions"]);
    expect(w.get('[data-metric="engagementSeconds"]').text()).toContain("2m 14s");
    expect(w.find('[data-slot="realtime-counter"]').exists()).toBe(true);
    expect(w.findAll('[role="tab"]').map((t) => t.text())).toEqual(["Sources", "Pages", "Audience"]);
  });

  it("emits update:period from the toggle", async () => {
    const w = mount(NqGoogleAnalyticsPage, { props: base as never });
    expect(w.findAll("[data-slot=toggle]").slice(0, 3).map((t) => t.text())).toEqual(["7 days", "28 days", "90 days"]);
    await w.findAll("[data-slot=toggle]")[2]!.trigger("click");
    expect(w.emitted("update:period")?.[0]).toEqual([90]);
  });

  it("omits the live counter without realtime data", () => {
    const w = mount(NqGoogleAnalyticsPage, { props: { ...base, data: { ...data, realtime: undefined } } as never });
    expect(w.find('[data-slot="realtime-counter"]').exists()).toBe(false);
  });

  it("shows skeletons without data, the connect screen when disconnected and an error with retry", async () => {
    const loading = mount(NqGoogleAnalyticsPage, { props: { ...base, data: undefined } as never });
    expect(loading.find('[data-slot="metric-tiles"]').attributes("aria-busy")).toBe("true");
    const out = mount(NqGoogleAnalyticsPage, { props: { ...base, service: { ...service, status: "disconnected" } } as never });
    expect(out.find('[data-slot="metric-tiles"]').exists()).toBe(false);
    const onRetry = vi.fn();
    const failed = mount(NqGoogleAnalyticsPage, { props: { ...base, error: "Boom", onRetry } as never });
    await failed.findAll("button").find((b) => b.text() === "Try again")!.trigger("click");
    expect(onRetry).toHaveBeenCalled();
  });

  it("speaks Arabic", () => {
    const w = mount({ render: () => h(NasaqProvider, { locale: "ar" }, () => h(NqGoogleAnalyticsPage, base as never)) });
    expect(w.findAll('[role="tab"]').map((t) => t.text())).toEqual(["المصادر", "الصفحات", "الجمهور"]);
  });
});
