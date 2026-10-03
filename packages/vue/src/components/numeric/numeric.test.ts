import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NqDateTime, NqNum, formatDate, formatNumber, formatRelativeTime } from ".";

describe("numeric", () => {
  it("formats with Latin digits, also in Arabic, and isolates a Latin currency", () => {
    expect(formatNumber(1234.5, "en")).toBe("1,234.5");
    expect(formatNumber(1234.5, "ar")).toMatch(/^1[,٬]234[.٫]5$/);
    expect(formatNumber(1234.5, "ar", { numberingSystem: "arab" })).toMatch(/[٠-٩]/);
    expect(formatNumber(48210.5, "ar", { style: "currency", currency: "USD" })).toContain("⁦");
    expect(formatNumber(12, "en", { style: "currency", currency: "USD" })).toBe("$12.00");
  });

  it("formats dates and relative times", () => {
    expect(formatDate("2026-09-01T12:00:00Z", "en", { dateStyle: "medium", timeZone: "UTC" })).toBe("Sep 1, 2026");
    expect(formatDate("2026-09-01T12:00:00Z", "ar", { timeZone: "UTC", year: "numeric", month: "numeric", day: "numeric" })).not.toMatch(/[٠-٩]/);
    expect(formatRelativeTime(0, "en", { now: 3 * 3600 * 1000 })).toBe("3 hours ago");
  });

  it("NqNum renders a tabular bdi", () => {
    const w = mount(NqNum, { props: { value: 48210.5, format: { style: "currency", currency: "SAR" }, class: "font-bold" } });
    expect(w.element.tagName).toBe("BDI");
    expect(w.attributes("data-slot")).toBe("num");
    expect(w.attributes("data-numeric")).toBe("");
    expect(w.classes()).toEqual(expect.arrayContaining(["tabular-nums", "font-bold"]));
    expect(w.text()).toContain("48,210.50");
  });

  it("NqDateTime renders <time> with a machine-readable datetime", () => {
    const w = mount(NqDateTime, { props: { value: "2026-09-01T12:00:00Z", format: { dateStyle: "medium", timeZone: "UTC" } } });
    expect(w.element.tagName).toBe("TIME");
    expect(w.attributes("datetime")).toBe("2026-09-01T12:00:00.000Z");
    expect(w.attributes("dir")).toBe("auto");
    expect(w.text()).toBe("Sep 1, 2026");
    const rel = mount(NqDateTime, { props: { value: new Date(Date.now() - 3 * 3600 * 1000), relative: true } });
    expect(rel.text()).toBe("3 hours ago");
    expect(rel.attributes("title")).toBeTruthy();
  });
});
