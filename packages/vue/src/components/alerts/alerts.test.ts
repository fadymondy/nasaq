import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NasaqProvider } from "../../provider";
import { NqAlertList, NqSecurityAlerts, type AlertItem, type SecurityAlertItem } from ".";

const now = Date.now();
const alerts: AlertItem[] = [
  { id: "a1", title: "API latency", severity: "critical", status: "open", source: "api", createdAt: now - 60_000 },
  { id: "a2", title: "Disk full", severity: "high", status: "acknowledged", source: "db", createdAt: now - 120_000 },
  { id: "a3", title: "Cert renewed", severity: "low", status: "resolved", source: "edge", createdAt: now - 180_000 },
];

describe("NqAlertList", () => {
  it("opens on the open tab and shows only open alerts", () => {
    const w = mount(NqAlertList, { props: { alerts } });
    expect(w.attributes("data-slot")).toBe("alert-list");
    const rows = w.findAll('[data-slot="alert-row"]');
    expect(rows).toHaveLength(1);
    expect(rows[0]!.attributes("data-severity")).toBe("critical");
    expect(rows[0]!.attributes("data-status")).toBe("open");
    expect(w.text()).toContain("API latency");
  });

  it("runs onAcknowledge for the alert", async () => {
    const onAcknowledge = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqAlertList, { props: { alerts, onAcknowledge } });
    const btn = w.findAll("button").find((b) => b.text() === "Acknowledge");
    expect(btn).toBeTruthy();
    await btn!.trigger("click");
    expect(onAcknowledge).toHaveBeenCalledWith("a1");
  });

  it("shows the empty state with no alerts", () => {
    const w = mount(NqAlertList, { props: { alerts: [] } });
    expect(w.findAll('[data-slot="alert-row"]')).toHaveLength(0);
  });
});

describe("NqSecurityAlerts", () => {
  it("shows ip, category and the recommendation after expanding", async () => {
    const sec: SecurityAlertItem[] = [{ ...alerts[0]!, category: "auth", ip: "10.0.0.1", recommendation: "Block it" }];
    const w = mount(NqSecurityAlerts, { props: { alerts: sec } });
    expect(w.attributes("data-slot")).toBe("security-alerts");
    const toggle = w.findAll("button").find((b) => b.text() === "Show details")!;
    await toggle.trigger("click");
    expect(w.text()).toContain("10.0.0.1");
    expect(w.text()).toContain("Block it");
  });

  it("is Arabic inside an Arabic provider", () => {
    const w = mount({
      components: { NasaqProvider, NqAlertList },
      setup: () => ({ alerts }),
      template: '<NasaqProvider locale="ar"><NqAlertList :alerts="alerts" /></NasaqProvider>',
    });
    expect(w.text()).toMatch(/[؀-ۿ]/);
  });
});
