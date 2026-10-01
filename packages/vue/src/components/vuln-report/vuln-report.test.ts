import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NqSeverityTiles, NqVulnReport, countBySeverity, riskTone, topFindings, trend, type VulnFinding } from ".";

const findings: VulnFinding[] = [
  { id: "CVE-2024-1111", severity: "medium", cvss: 5.4, package: "lodash", installedVersion: "4.17.20", fixedVersion: "4.17.21", title: "Prototype pollution" },
  { id: "CVE-2024-2222", severity: "critical", cvss: 9.8, package: "openssl", installedVersion: "3.0.1" },
  { id: "GHSA-xxxx", severity: "low", package: "left-pad" },
];
const history = [
  { id: "a", at: "2026-09-01", counts: { high: 4, low: 2 } },
  { id: "b", at: "2026-09-15", counts: { critical: 1, medium: 1, low: 1 } },
];

describe("vuln helpers", () => {
  it("counts, ranks and compares", () => {
    expect(countBySeverity(findings)).toEqual({ critical: 1, high: 0, medium: 1, low: 1 });
    expect(topFindings(findings, 2).map((f) => f.id)).toEqual(["CVE-2024-2222", "CVE-2024-1111"]);
    expect(riskTone({ medium: 2 })).toBe("warning");
    expect(trend(history)).toBe(-3);
  });
});

describe("NqSeverityTiles", () => {
  it("spells severity out and colours only non-zero counts", () => {
    const w = mount(NqSeverityTiles, { props: { counts: { critical: 2 } } });
    expect(w.attributes("data-slot")).toBe("severity-tiles");
    expect(w.findAll("[data-severity]")).toHaveLength(4);
    expect(w.find('[data-severity="critical"]').text()).toContain("Critical");
    expect(w.find('[data-severity="critical"] dd').classes()).toContain("text-nq-danger");
    expect(w.find('[data-severity="low"] dd').classes()).toContain("text-foreground");
  });
});

describe("NqVulnReport", () => {
  it("shows the total, tiles, ranked findings and the trend", () => {
    const w = mount(NqVulnReport, { props: { findings, history, lastScanAt: Date.now() } });
    expect(w.attributes("data-slot")).toBe("vuln-report");
    expect(w.attributes("data-risk")).toBe("danger");
    expect(w.text()).toContain("Total findings");
    expect(w.text()).toContain("3 fewer than the previous scan");
    const rows = w.findAll('[data-slot="vuln-finding"]');
    expect(rows).toHaveLength(3);
    expect(rows[0]!.text()).toContain("CVE-2024-2222");
    expect(rows[0]!.text()).toContain("No fix yet");
    expect(rows[1]!.text()).toContain("lodash@4.17.20");
    expect(rows[1]!.text()).toContain("4.17.21");
    expect(rows[1]!.text()).toContain("CVSS 5.4");
    expect(w.findAll('[data-slot="copy-button"]')).toHaveLength(2);
    expect(w.findAll("ol li[role=img]")).toHaveLength(2);
  });

  it("shows Scan now only with a listener and emits scan, then the busy label", async () => {
    expect(mount(NqVulnReport, { props: { findings } }).text()).not.toContain("Scan now");
    const w = mount(NqVulnReport, { props: { findings, onScan: () => {} } });
    await w.find("button").trigger("click");
    expect(w.emitted("scan")).toHaveLength(1);
    await w.setProps({ scanning: true });
    expect(w.find("button").text()).toBe("Scanning");
    expect(w.find("button").attributes("aria-busy")).toBe("true");
  });

  it("opens a finding when a listener is attached", async () => {
    const w = mount(NqVulnReport, { props: { findings, onOpenFinding: () => {} } });
    const btn = w.find('[data-slot="vuln-finding"] button');
    await btn.trigger("click");
    expect((w.emitted("openFinding")![0] as VulnFinding[])[0]!.id).toBe("CVE-2024-2222");
  });

  it("says so when the scan is clean and when there is no scan", () => {
    const clean = mount(NqVulnReport, { props: { findings: [], lastScanAt: Date.now() } });
    expect(clean.attributes("data-risk")).toBe("success");
    expect(clean.text()).toContain("No vulnerabilities found");
    const none = mount(NqVulnReport, { props: { findings: [] } });
    expect(none.text()).toContain("No scan yet");
  });
});
