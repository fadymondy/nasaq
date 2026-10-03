import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { h } from "vue";
import { NasaqProvider } from "../../provider";
import type { IntegrationService } from "../integration-connector";
import { NqYouTubeChannelPage, type YouTubeChannelData } from ".";

afterEach(() => {
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

const service: IntegrationService = { id: "yt", name: "YouTube", scopes: [{ id: "r", label: "Read", required: true }], status: "connected" };
const total = (value: number, previous?: number) => ({ value, previous });
const data: YouTubeChannelData = {
  channel: { name: "Nasaq Studio", subscribers: 48200 },
  summary: { views: total(1000, 900), watchHours: total(60, 50), subscribers: total(8, 7), avgSeconds: total(174, 160) },
  series: [{ date: "2026-09-28", views: 40, watchHours: 2, subscribers: 1 }],
  videos: [{ id: "v1", title: "Arabic-first design", views: 400, watchHours: 130, avgSeconds: 312 }],
  trafficSources: [{ id: "s", label: "YouTube search", value: 500 }],
  countries: [{ code: "SA", value: 400 }],
};
const base = { service, data, period: 28, onConnect: async () => ({ ok: true }), onDisconnect: async () => ({ ok: true }) };

describe("NqYouTubeChannelPage", () => {
  it("renders the channel line, four tiles and three tabs", () => {
    const w = mount(NqYouTubeChannelPage, { props: base as never });
    expect(w.get("h1").text()).toBe("YouTube");
    expect(w.text()).toContain("Nasaq Studio · 48.2K subscribers");
    expect(w.findAll('[data-slot="metric-tiles"] [data-metric]').map((t) => t.attributes("data-metric"))).toEqual(["views", "watchHours", "subscribers", "avgSeconds"]);
    expect(w.get('[data-metric="avgSeconds"]').text()).toContain("2m 54s");
    expect(w.findAll('[role="tab"]').map((t) => t.text())).toEqual(["Top videos", "Traffic sources", "Audience"]);
  });

  it("shows watch time and average duration columns for the videos", () => {
    const w = mount(NqYouTubeChannelPage, { props: base as never });
    const heads = w.findAll("thead th").map((h) => h.text());
    expect(heads).toContain("Watch time");
    expect(heads).toContain("Avg. duration");
    expect(w.get("tbody").text()).toContain("5m 12s");
    expect(w.get("tbody").text()).toContain("130");
  });

  it("emits update:period and lets a tile drive the chart", async () => {
    const w = mount(NqYouTubeChannelPage, { props: base as never });
    await w.findAll("[data-slot=toggle]")[0]!.trigger("click");
    expect(w.emitted("update:period")?.[0]).toEqual([7]);
    await w.get('[data-metric="subscribers"]').element.closest("button")!.click();
    expect(w.get('[data-metric="subscribers"]').element.closest("button")!.getAttribute("aria-pressed")).toBe("true");
  });

  it("shows skeletons without data and the connect screen when disconnected", () => {
    const loading = mount(NqYouTubeChannelPage, { props: { ...base, data: undefined } as never });
    expect(loading.find('[data-slot="metric-tiles"]').attributes("aria-busy")).toBe("true");
    const out = mount(NqYouTubeChannelPage, { props: { ...base, service: { ...service, status: "disconnected" } } as never });
    expect(out.find('[data-slot="metric-tiles"]').exists()).toBe(false);
  });

  it("speaks Arabic", () => {
    const w = mount({ render: () => h(NasaqProvider, { locale: "ar" }, () => h(NqYouTubeChannelPage, base as never)) });
    expect(w.findAll('[role="tab"]').map((t) => t.text())).toEqual(["أفضل الفيديوهات", "مصادر الزيارات", "الجمهور"]);
  });
});
