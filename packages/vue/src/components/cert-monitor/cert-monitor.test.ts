import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { certDaysLeft, certStatus, certTone, isValidCertHost, NqCertificateMonitor, NqDaysLeftBadge, summarizeCerts, type CertificateRecord } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const now = Date.UTC(2026, 8, 29, 9);
const day = 86_400_000;
const certs: CertificateRecord[] = [
  { id: "1", host: "app.example.com", issuer: "Let's Encrypt", validTo: now + 60 * day, autoRenew: true },
  { id: "2", host: "api.example.com", issuer: "DigiCert", validTo: now + 5 * day },
  { id: "3", host: "old.example.com", validTo: now - 3 * day },
  { id: "4", host: "down.example.com", error: "Connection refused" },
];

describe("cert helpers", () => {
  it("computes days, status and tone", () => {
    expect(certDaysLeft(now + 5 * day, now)).toBe(5);
    expect(certDaysLeft("nope", now)).toBeNull();
    expect(certStatus(60)).toBe("valid");
    expect(certStatus(20)).toBe("expiring");
    expect(certStatus(3)).toBe("critical");
    expect(certStatus(-1)).toBe("expired");
    expect(certStatus(null)).toBe("error");
    expect(certTone("expired")).toBe("danger");
    expect(summarizeCerts([60, 20, 3, -1, null])).toEqual({ total: 5, valid: 1, expiring: 1, critical: 1, expired: 1, error: 1 });
    expect(isValidCertHost("*.example.com")).toBe(true);
    expect(isValidCertHost("nope")).toBe(false);
  });
});

describe("NqDaysLeftBadge", () => {
  it("carries the status and a spoken label", () => {
    const w = mount(NqDaysLeftBadge, { props: { days: 5, host: "api.example.com" } });
    expect(w.attributes("data-slot")).toBe("days-left-badge");
    expect(w.attributes("data-status")).toBe("critical");
    expect(w.attributes("aria-label")).toBe("api.example.com: 5 days left");
    expect(w.text()).toBe("5 d");
  });
});

describe("NqCertificateMonitor", () => {
  it("renders the card, the summary and the rows soonest first", () => {
    const w = mount(NqCertificateMonitor, { props: { certificates: certs, now, class: "max-w-2xl" } });
    expect(w.attributes("data-slot")).toBe("certificate-monitor");
    expect(w.classes()).toEqual(expect.arrayContaining(["w-full", "max-w-2xl"]));
    expect(w.text()).toContain("4 monitored, 3 need attention");
    const hosts = w.findAll("tbody tr").map((r) => r.text());
    expect(hosts[0]).toContain("old.example.com");
    expect(hosts[hosts.length - 1]).toContain("down.example.com");
    expect(w.findAll('[data-slot="days-left-badge"]').map((b) => b.attributes("data-status"))).toEqual(["expired", "critical", "valid", "error"]);
  });

  it("blocks an invalid host and adds a good one", async () => {
    const onAdd = vi.fn(async () => {});
    const w = mount(NqCertificateMonitor, { props: { certificates: certs, now, onAdd } });
    const input = w.find("form input");
    await input.setValue("nope");
    await w.find("form").trigger("submit");
    expect(onAdd).not.toHaveBeenCalled();
    expect(w.text()).toContain("Enter a hostname");
    await input.setValue("New.Example.com");
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(onAdd).toHaveBeenCalledWith("new.example.com");
  });

  it("shows a callback error in an alert", async () => {
    const onAdd = vi.fn(async () => ({ error: "Already monitored" }));
    const w = mount(NqCertificateMonitor, { props: { certificates: certs, now, onAdd } });
    await w.find("form input").setValue("x.example.com");
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(w.text()).toContain("Already monitored");
  });

  it("shows the empty state", () => {
    const w = mount(NqCertificateMonitor, { props: { certificates: [], now } });
    expect(w.text()).toContain("No certificates monitored yet");
  });
});
