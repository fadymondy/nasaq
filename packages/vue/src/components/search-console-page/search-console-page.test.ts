import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { h } from "vue";
import { NasaqProvider } from "../../provider";
import type { IntegrationService } from "../integration-connector";
import { NqSearchConsolePage, type SearchConsoleData } from ".";

afterEach(() => {
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

const service: IntegrationService = { id: "gsc", name: "Search Console", scopes: [{ id: "r", label: "Read", required: true }], status: "connected" };
const total = (value: number, previous?: number) => ({ value, previous });
const data: SearchConsoleData = {
  summary: { clicks: total(900, 800), impressions: total(20000, 19000), ctr: total(0.045, 0.042), position: total(11.8, 12.6) },
  series: [{ date: "2026-09-28", clicks: 30, impressions: 700, ctr: 0.043, position: 11.8 }],
  queries: [{ id: "q1", label: "nasaq design", clicks: 120, impressions: 2000, position: 3.2 }],
  pages: [{ id: "p1", label: "https://nasaq.dev/", clicks: 300, impressions: 4000, position: 4.1 }],
  countries: [{ code: "SA", value: 400 }],
  devices: [{ id: "m", label: "Mobile", value: 600 }],
};
const base = { service, data, period: 28, site: "nasaq.dev", onConnect: async () => ({ ok: true }), onDisconnect: async () => ({ ok: true }) };

describe("NqSearchConsolePage", () => {
  it("renders four tiles, the chart and four tabs", () => {
    const w = mount(NqSearchConsolePage, { props: base as never });
    expect(w.get("h1").text()).toBe("Search Console");
    expect(w.text()).toContain("How nasaq.dev performs in Google Search");
    expect(w.findAll('[data-slot="metric-tiles"] [data-metric]').map((t) => t.attributes("data-metric"))).toEqual(["clicks", "impressions", "ctr", "position"]);
    expect(w.findAll('[role="tab"]').map((t) => t.text())).toEqual(["Queries", "Pages", "Countries", "Devices"]);
    expect(w.find('[data-slot="search-performance-table"]').exists()).toBe(true);
  });

  it("emits update:period with the 7, 28 and 90 day options", async () => {
    const w = mount(NqSearchConsolePage, { props: base as never });
    expect(w.findAll("[data-slot=toggle]").slice(0, 3).map((t) => t.text())).toEqual(["7 days", "28 days", "90 days"]);
    await w.findAll("[data-slot=toggle]")[0]!.trigger("click");
    expect(w.emitted("update:period")?.[0]).toEqual([7]);
  });

  it("lets a tile choose the chart metric", async () => {
    const w = mount(NqSearchConsolePage, { props: base as never });
    expect(w.get('[data-metric="clicks"]').element.closest("button")!.getAttribute("aria-pressed")).toBe("true");
    await w.get('[data-metric="position"]').element.closest("button")!.click();
    expect(w.get('[data-metric="position"]').element.closest("button")!.getAttribute("aria-pressed")).toBe("true");
    expect(w.get('[data-metric="clicks"]').element.closest("button")!.getAttribute("aria-pressed")).toBe("false");
  });

  it("passes the row and its kind to onRowClick", async () => {
    const onRowClick = vi.fn();
    const w = mount(NqSearchConsolePage, { props: { ...base, onRowClick } as never });
    await w.get("tbody tr").trigger("click");
    expect(onRowClick).toHaveBeenCalledWith(expect.objectContaining({ id: "q1" }), "query");
  });

  it("shows skeletons without data and the connect screen when disconnected", () => {
    const loading = mount(NqSearchConsolePage, { props: { ...base, data: undefined } as never });
    expect(loading.find('[data-slot="metric-tiles"]').attributes("aria-busy")).toBe("true");
    const out = mount(NqSearchConsolePage, { props: { ...base, service: { ...service, status: "disconnected" } } as never });
    expect(out.find('[data-slot="metric-tiles"]').exists()).toBe(false);
  });

  it("speaks Arabic", () => {
    const w = mount({ render: () => h(NasaqProvider, { locale: "ar" }, () => h(NqSearchConsolePage, base as never)) });
    expect(w.findAll('[role="tab"]').map((t) => t.text())).toEqual(["عبارات البحث", "الصفحات", "الدول", "الأجهزة"]);
  });
});
