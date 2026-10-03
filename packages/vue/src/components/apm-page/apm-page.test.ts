import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { h } from "vue";
import { NasaqProvider } from "../../provider";
import type { IntegrationService } from "../integration-connector";
import { NqApmPage, type ApmData } from ".";

afterEach(() => {
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

const service: IntegrationService = { id: "apm", name: "Nasaq APM", scopes: [{ id: "apm.read", label: "Read traces", required: true }], status: "connected", connectedAs: "ops@nasaq.dev" };
const total = (value: number, previous?: number) => ({ value, previous });
const data: ApmData = {
  summary: { requests: total(184200, 171900), throughput: total(512, 478), p95: total(486, 540), errorRate: total(0.0042, 0.0061) },
  latency: [{ time: "2026-09-29T09:00", p50: 118, p95: 470, p99: 1050 }],
  errors: [{ time: "2026-09-29T09:00", requests: 1000, errors: 4 }],
  throughput: [{ date: "2026-09-29T09:00", rpm: 500 }],
  endpoints: [{ id: "e1", method: "GET", route: "/api/orders/:id", requests: 100, p50: 80, p95: 1400, errorRate: 0.01 }],
  traces: [{ id: "t1", method: "POST", name: "/api/checkout", status: 200, durationMs: 1800, startedAt: "2026-09-29T09:00:00Z", spans: [{ id: "s1", name: "POST /api/checkout", service: "api", startMs: 0, durationMs: 1800 }] }],
};
const base = { service, data, period: 6, onConnect: async () => ({ ok: true }), onDisconnect: async () => ({ ok: true }) };

describe("NqApmPage", () => {
  it("renders the report: heading, four tiles, panels and tabs", () => {
    const w = mount(NqApmPage, { props: { ...base, app: "api.nasaq.dev", class: "extra" } as never });
    expect(w.attributes("data-slot")).toBe("analytics-page");
    expect(w.classes()).toContain("extra");
    expect(w.get("h1").text()).toBe("Application performance");
    expect(w.text()).toContain("Latency, errors and traces for api.nasaq.dev");
    expect(w.findAll('[data-slot="metric-tiles"] [data-metric]').map((t) => t.attributes("data-metric"))).toEqual(["requests", "throughput", "p95", "errorRate"]);
    expect(w.get('[data-metric="p95"]').text()).toContain("486 ms");
    expect(w.find('[data-slot="latency-percentiles"]').exists()).toBe(true);
    const tabs = w.findAll('[role="tab"]');
    expect(tabs.map((t) => t.text())).toEqual(["Slow endpoints", "Traces"]);
    expect(tabs[0]!.attributes("aria-selected")).toBe("true");
  });

  it("emits update:period from the window toggle", async () => {
    const w = mount(NqApmPage, { props: base as never });
    expect(w.findAll("[data-slot=toggle]").map((t) => t.text())).toEqual(["1 hour", "6 hours", "24 hours"]);
    await w.findAll("[data-slot=toggle]")[2]!.trigger("click");
    expect(w.emitted("update:period")?.[0]).toEqual([24]);
  });

  it("shows skeletons without data and the connect screen when disconnected", () => {
    const loading = mount(NqApmPage, { props: { ...base, data: undefined } as never });
    expect(loading.find('[data-slot="metric-tiles"]').attributes("aria-busy")).toBe("true");
    const out = mount(NqApmPage, { props: { ...base, service: { ...service, status: "disconnected" } } as never });
    expect(out.find('[data-slot="metric-tiles"]').exists()).toBe(false);
  });

  it("shows an error with retry", async () => {
    const onRetry = vi.fn();
    const w = mount(NqApmPage, { props: { ...base, error: "Boom", onRetry } as never });
    expect(w.text()).toContain("Boom");
    await w.findAll("button").find((b) => b.text() === "Try again")!.trigger("click");
    expect(onRetry).toHaveBeenCalled();
  });

  it("speaks Arabic", () => {
    const w = mount({ render: () => h(NasaqProvider, { locale: "ar" }, () => h(NqApmPage, base as never)) });
    expect(w.get("h1").text()).toBe("أداء التطبيق");
    expect(w.findAll('[role="tab"]').map((t) => t.text())).toEqual(["النقاط البطيئة", "التتبّعات"]);
  });
});
