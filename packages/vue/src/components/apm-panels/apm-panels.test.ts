import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqEndpointTable, NqErrorRatePanel, NqLatencyPercentiles, NqTraceList, type EndpointRow, type TraceSummary } from ".";

const latency = [
  { time: "2026-09-29T09:00", p50: 118, p95: 470, p99: 1050 },
  { time: "2026-09-29T09:05", p50: 124, p95: 492, p99: 1210 },
];
const endpoints: EndpointRow[] = [
  { id: "a", method: "GET", route: "/api/orders", requests: 12000, p50: 80, p95: 420, errorRate: 0.01 },
  { id: "b", method: "POST", route: "/api/checkout", requests: 900, p50: 300, p95: 2100, errorRate: 0.07 },
];
const traces: TraceSummary[] = [
  {
    id: "t1",
    method: "POST",
    name: "/api/checkout",
    status: 500,
    durationMs: 1800,
    startedAt: "2026-09-29T09:00:00Z",
    spans: [
      { id: "s1", name: "POST /api/checkout", service: "api", startMs: 0, durationMs: 1800 },
      { id: "s2", parentId: "s1", name: "SELECT orders", service: "postgres", startMs: 100, durationMs: 400, error: true },
    ],
  },
  { id: "t2", method: "GET", name: "/api/orders", status: 200, durationMs: 120, startedAt: "2026-09-29T09:01:00Z" },
];

describe("NqLatencyPercentiles", () => {
  it("shows the three figures, deltas and the chart with a target guide", () => {
    const w = mount(NqLatencyPercentiles, { props: { data: latency, summary: { p50: 121, p95: 486, p99: 1140 }, previous: { p50: 130, p95: 480, p99: 1000 }, targetMs: 500 } });
    expect(w.attributes("data-slot")).toBe("latency-percentiles");
    expect(w.get('[data-percentile="p95"]').text()).toContain("486");
    expect(w.get('[data-percentile="p50"]').text()).toContain("-6.9%");
    expect(w.get('[data-slot="chart"]').attributes("aria-label")).toBe("Latency percentiles over time");
    expect(w.text()).toContain("Target p95 500");
  });

  it("shows loading, empty and error states", async () => {
    expect(mount(NqLatencyPercentiles, { props: { data: [], loading: true } }).attributes("aria-busy")).toBe("true");
    expect(mount(NqLatencyPercentiles, { props: { data: [] } }).text()).toContain("No data for this period");
    const onRetry = vi.fn();
    const w = mount(NqLatencyPercentiles, { props: { data: latency, error: true, onRetry } });
    await w.get("button").trigger("click");
    expect(onRetry).toHaveBeenCalled();
  });
});

describe("NqErrorRatePanel", () => {
  it("tones the rate against the objective and lists top errors", async () => {
    const onErrorClick = vi.fn();
    const w = mount(NqErrorRatePanel, {
      props: {
        data: [{ time: "2026-09-29T09:00", requests: 1000, errors: 20 }],
        slo: 0.01,
        topErrors: [{ id: "e1", message: "TimeoutError", count: 12, endpoint: "POST /api/checkout" }],
        onErrorClick,
      },
    });
    expect(w.attributes("data-over-slo")).toBe("true");
    expect(w.text()).toContain("2%");
    expect(w.text()).toContain("Over target");
    await w.get("ul button").trigger("click");
    expect(onErrorClick).toHaveBeenCalledWith(expect.objectContaining({ id: "e1" }));
  });
});

describe("NqEndpointTable", () => {
  it("sorts the slowest first and flags slow endpoints", () => {
    const w = mount(NqEndpointTable, { props: { rows: endpoints } });
    expect(w.attributes("data-slot")).toBe("endpoint-table");
    const rows = w.findAll("tbody tr");
    expect(rows[0]!.text()).toContain("/api/checkout");
    expect(rows[0]!.text()).toContain("Slow");
    expect(rows[1]!.text()).not.toContain("Slow");
  });
});

describe("NqTraceList", () => {
  it("lists the slowest first and opens the waterfall on select", async () => {
    const onSelect = vi.fn();
    const w = mount(NqTraceList, { props: { traces, onSelect } });
    const buttons = w.findAll("button");
    expect(buttons[0]!.text()).toContain("/api/checkout");
    expect(w.find('[data-slot="trace-waterfall"]').exists()).toBe(false);
    await buttons[0]!.trigger("click");
    expect(buttons[0]!.attributes("aria-pressed")).toBe("true");
    expect(w.find('[data-slot="trace-waterfall"]').exists()).toBe(true);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "t1" }));
    await buttons[0]!.trigger("click");
    expect(w.find('[data-slot="trace-waterfall"]').exists()).toBe(false);
  });
});
