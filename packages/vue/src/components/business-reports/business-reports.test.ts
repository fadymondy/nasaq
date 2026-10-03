import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import {
  businessReportsAttainment,
  businessReportsKpiStatus,
  businessReportsMarginBand,
  businessReportsProfitTotals,
  businessReportsWinRate,
  NqEmployeeKpiDashboard,
  NqPipelineReport,
  NqProfitabilityReport,
  NqSupportStatsReport,
} from ".";

const money = { style: "currency", currency: "USD", maximumFractionDigits: 0 } as const;

describe("business report maths", () => {
  it("computes margins, bands, attainment and win rate", () => {
    expect(businessReportsProfitTotals([{ revenue: 100, cost: 60 }, { revenue: 50, cost: 70 }])).toMatchObject({ revenue: 150, cost: 130, profit: 20, losing: 1 });
    expect(businessReportsMarginBand(-0.1)).toBe("loss");
    expect(businessReportsMarginBand(0.1)).toBe("thin");
    expect(businessReportsMarginBand(0.4)).toBe("healthy");
    expect(businessReportsAttainment(8, 10)).toBe(0.8);
    expect(businessReportsKpiStatus(0.5)).toBe("behind");
    expect(businessReportsWinRate([{ id: "a", count: 10, value: 1 }, { id: "b", count: 2, value: 1, won: true }])).toBe(0.2);
  });
});

describe("NqProfitabilityReport", () => {
  const rows = [
    { id: "p1", name: "Website rebuild", revenue: 120000, cost: 78000, hours: 410 },
    { id: "p2", name: "Mobile app", revenue: 90000, cost: 96000, hours: 520 },
  ];
  it("totals, bands each margin with a word and lists the rows", () => {
    const w = mount(NqProfitabilityReport, { props: { rows, format: money } });
    expect(w.attributes("data-slot")).toBe("profitability-report");
    expect(w.findAll('[data-slot="stat-card"]')).toHaveLength(4);
    expect(w.text()).toContain("$210,000");
    expect(w.text()).toContain("Healthy");
    expect(w.text()).toContain("Loss");
    expect(w.text()).toContain("Website rebuild");
    expect(w.find('[data-slot="segment-bar"]').exists()).toBe(true);
  });
  it("shows the empty state", () => {
    const w = mount(NqProfitabilityReport, { props: { rows: [], format: money } });
    expect(w.text()).toContain("Nothing to report for this period.");
    expect(w.find('[data-slot="segment-bar"]').exists()).toBe(false);
  });
});

describe("NqEmployeeKpiDashboard", () => {
  const employees = [
    { id: "e1", name: "Sara", role: "Designer", target: 140, actual: 152 },
    { id: "e2", name: "Omar", target: 100, actual: 40 },
  ];
  it("shows a card per person with a status word and the team summary", () => {
    const w = mount(NqEmployeeKpiDashboard, { props: { employees, measure: "Billable hours" } });
    expect(w.attributes("data-slot")).toBe("employee-kpi-dashboard");
    expect(w.findAll('[data-slot="progress-ring"]')).toHaveLength(2);
    expect(w.text()).toContain("Ahead");
    expect(w.text()).toContain("Behind");
    expect(w.text()).toContain("Team attainment: Billable hours");
  });
  it("adds a more button only when there are actions", () => {
    expect(mount(NqEmployeeKpiDashboard, { props: { employees } }).find('button[aria-label^="Actions for"]').exists()).toBe(false);
    const w = mount(NqEmployeeKpiDashboard, { props: { employees, actions: (e: { name: string }) => [{ id: "o", label: `Open ${e.name}`, onSelect: () => {} }] } });
    expect(w.find('button[aria-label="Actions for Sara"]').exists()).toBe(true);
  });
});

describe("NqPipelineReport", () => {
  const stages = [
    { id: "lead", label: "Leads", count: 240, value: 960000 },
    { id: "won", label: "Won", count: 24, value: 210000, won: true },
  ];
  it("switches between the funnel and the table", async () => {
    const w = mount(NqPipelineReport, { props: { stages, format: money } });
    expect(w.find('[data-slot="funnel-steps"]').exists()).toBe(true);
    expect(w.text()).toContain("10%");
    const toggles = w.findAll("button");
    await toggles.find((b) => b.text() === "Table")!.trigger("click");
    expect(w.emitted("update:view")?.[0]).toEqual([["table"]].flat());
    expect(w.find('[data-slot="funnel-steps"]').exists()).toBe(false);
    expect(w.find("table").exists()).toBe(true);
  });
  it("opens as a table with defaultView", () => {
    const w = mount(NqPipelineReport, { props: { stages, format: money, defaultView: "table" } });
    expect(w.find("table").exists()).toBe(true);
  });
});

describe("NqSupportStatsReport", () => {
  it("shows durations, the status mix and the agents", () => {
    const w = mount(NqSupportStatsReport, {
      props: {
        summary: { open: 42, firstResponseMinutes: 38, resolutionMinutes: 310, csat: 0.92, slaRate: 0.87 },
        volume: [{ date: "2026-09-27", created: 3, resolved: 2 }, { date: "2026-09-28", created: 4, resolved: 5 }],
        byStatus: [{ id: "o", label: "Open", value: 4 }],
        agents: [{ id: "a1", name: "Omar", assigned: 60, resolved: 52, firstResponseMinutes: 25, csat: 0.94 }],
      },
    });
    expect(w.attributes("data-slot")).toBe("support-stats-report");
    expect(w.text()).toContain("38 min");
    expect(w.text()).toContain("5.2 hr");
    expect(w.text()).toContain("92%");
    expect(w.text()).toContain("Omar");
    expect(w.find('[data-slot="segment-bar"]').exists()).toBe(true);
  });
});
