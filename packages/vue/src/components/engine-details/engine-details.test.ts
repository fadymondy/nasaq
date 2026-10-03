import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqEngineDetails, NqEngineHistoryStrip } from ".";

const hydration = { engine: "hydration", state: "idle", totalMl: 1500, dailyCapMl: 5000, unitMl: 250, unitsLogged: 6, unitsTotal: 20 } as const;
const history = [
  { date: "2026-09-26", verdict: "unevaluated", entries: 0 },
  { date: "2026-09-27", verdict: "on_protocol", entries: 5 },
  { date: "2026-09-28", verdict: "on_protocol", entries: 6 },
  { date: "2026-09-29", verdict: "off_protocol", entries: 1 },
] as const;

describe("NqEngineDetails", () => {
  it("renders the live card, counts, chart, strip, record and protocol", () => {
    const w = mount(NqEngineDetails, {
      props: { snapshot: hydration, history, backHref: "/health", records: [{ id: "1", at: "2026-09-29T07:10:00Z", title: "250 mL logged", tone: "success" }], class: "extra" },
    });
    expect(w.attributes("data-slot")).toBe("engine-details");
    expect(w.attributes("data-engine")).toBe("hydration");
    expect(w.classes()).toContain("extra");
    expect(w.find("h1").text()).toBe("Hydration");
    expect(w.find('[data-slot="engine-details-back"]').attributes("href")).toBe("/health");
    expect(w.find('[data-slot="engine-card"]').exists()).toBe(true);
    expect(w.text()).toContain("2 days");
    expect(w.text()).toContain("Days not judged");
    expect(w.find('[data-slot="chart"]').attributes("role")).toBe("img");
    expect(w.findAll('[data-slot="chart-bar"]')).toHaveLength(4);
    expect(w.findAll("[data-verdict]")).toHaveLength(4);
    expect(w.text()).toContain("250 mL logged");
    expect(w.text()).toContain("5,000 mL");
    expect(w.text()).toContain("30 seconds");
  });

  it("says a ledger engine does not judge days, and shows its protocol", () => {
    const w = mount(NqEngineDetails, { props: { snapshot: { engine: "medication", graceMinutes: 60, doses: [] } } });
    expect(w.text()).toContain("This engine keeps a ledger");
    expect(w.text()).toContain("60 minutes");
    expect(w.text()).toContain("Nothing recorded yet.");
  });

  it("calls onWindowChange when another window is chosen", async () => {
    const onWindowChange = vi.fn();
    const w = mount(NqEngineDetails, { props: { snapshot: hydration, history, windows: [4, 30], onWindowChange } });
    const buttons = w.findAll('[data-slot="toggle"]');
    expect(buttons[0]!.attributes("aria-pressed")).toBe("true");
    await buttons[1]!.trigger("click");
    expect(onWindowChange).toHaveBeenCalledWith(30);
  });

  it("shows loading, error with retry, and empty history", async () => {
    expect(mount(NqEngineDetails, { props: { snapshot: hydration, historyLoading: true } }).find('[data-slot="engine-details-history-skeleton"]').exists()).toBe(true);
    const onRetry = vi.fn();
    const e = mount(NqEngineDetails, { props: { snapshot: hydration, historyError: "Server down", onRetry } });
    expect(e.text()).toContain("Server down");
    await e.findAll("button").find((b) => b.text() === "Try again")!.trigger("click");
    expect(onRetry).toHaveBeenCalled();
    expect(mount(NqEngineDetails, { props: { snapshot: hydration, history: [] } }).text()).toContain("No history yet");
  });
});

describe("NqEngineHistoryStrip", () => {
  it("groups days by month, each cell with a full sentence", () => {
    const w = mount(NqEngineHistoryStrip, { props: { days: [...history, { date: "2026-10-01", verdict: "on_protocol", entries: 1 }] } });
    expect(w.findAll("section")).toHaveLength(2);
    const cell = w.find('[data-date="2026-09-29"]');
    expect(cell.attributes("data-verdict")).toBe("off_protocol");
    expect(cell.attributes("title")).toContain("Off protocol, 1 entry");
  });
});
