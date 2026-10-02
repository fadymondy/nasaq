import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { h } from "vue";
import { NasaqProvider } from "../../provider";
import type { IntegrationService } from "../integration-connector";
import { NqWebVitalsPage, type WebVitalsData } from ".";

afterEach(() => {
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

const service: IntegrationService = { id: "crux", name: "CrUX", scopes: [{ id: "r", label: "Read", required: true }], status: "connected", connectedAs: "ops@nasaq.dev" };
const data = (lcp = 2300): WebVitalsData => ({
  vitals: { LCP: { p75: lcp }, INP: { p75: 180 }, CLS: { p75: 0.08 }, FCP: { p75: 1600 }, TTFB: { p75: 700 } },
  series: [{ date: "2026-09-29", LCP: lcp, INP: 180, CLS: 0.08, FCP: 1600, TTFB: 700 }],
  pages: [{ id: "p1", url: "/pricing", loads: 9120, vitals: { LCP: 3400, INP: 320, CLS: 0.21 } }],
});
const base = { service, data: data(), period: 28, onConnect: async () => ({ ok: true }), onDisconnect: async () => ({ ok: true }) };

describe("NqWebVitalsPage", () => {
  it("renders the verdict, five gauges and the pages table", () => {
    const w = mount(NqWebVitalsPage, { props: { ...base, site: "nasaq.dev", class: "extra" } as never });
    expect(w.attributes("data-slot")).toBe("analytics-page");
    expect(w.classes()).toContain("extra");
    expect(w.get("h1").text()).toBe("Web vitals");
    expect(w.get('[data-slot="web-vitals-verdict"]').text()).toContain("Passes Core Web Vitals");
    expect(w.get('[data-slot="web-vitals-verdict"]').attributes("data-pass")).toBe("true");
    expect(w.text()).toContain("/pricing");
    expect(w.text()).toContain("Pages to fix first");
  });

  it("fails the verdict when a core metric is not good", () => {
    const w = mount(NqWebVitalsPage, { props: { ...base, data: data(4500) } as never });
    expect(w.get('[data-slot="web-vitals-verdict"]').text()).toContain("Does not pass Core Web Vitals");
  });

  it("emits update:period and shows the device switch only when device is set", async () => {
    const w = mount(NqWebVitalsPage, { props: { ...base, device: "mobile" } as never });
    const toggles = w.findAll("[data-slot=toggle]");
    expect(toggles.map((t) => t.text())).toContain("Desktop");
    await toggles.find((t) => t.text() === "Desktop")!.trigger("click");
    expect(w.emitted("update:device")?.[0]).toEqual(["desktop"]);
    expect(mount(NqWebVitalsPage, { props: base as never }).text()).not.toContain("Desktop");
  });

  it("shows the connect screen when disconnected", () => {
    const w = mount(NqWebVitalsPage, { props: { ...base, service: { ...service, status: "disconnected" } } as never });
    expect(w.find('[data-slot="web-vitals-verdict"]').exists()).toBe(false);
  });

  it("speaks Arabic", () => {
    const w = mount({ render: () => h(NasaqProvider, { locale: "ar" }, () => h(NqWebVitalsPage, base as never)) });
    expect(w.get("h1").text()).toBe("مؤشرات الويب");
    expect(w.text()).toContain("يجتاز مؤشرات الويب الأساسية");
  });
});
