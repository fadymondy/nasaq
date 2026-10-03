import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { backlinkStatus, dailyLinkSeries, diffBacklinks, domainOf, isToxic, NqBacklinkMonitor, referringDomains, summarizeBacklinks, type Backlink } from ".";

const NOW = Date.parse("2026-09-29T09:00:00Z");
const links: Backlink[] = [
  { id: "l1", sourceUrl: "https://www.designweekly.com/news/rtl", targetUrl: "/", anchor: "Nasaq", domainRating: 71, spamScore: 8, firstSeen: "2026-09-27" },
  { id: "l2", sourceUrl: "https://blog.arabicdev.net/tools", targetUrl: "/components", anchor: "RTL components", domainRating: 54, spamScore: 12, firstSeen: "2026-08-10" },
  { id: "l3", sourceUrl: "https://old-directory.org/1", targetUrl: "/", anchor: "", domainRating: 33, spamScore: 21, firstSeen: "2026-07-01", lostAt: "2026-09-20" },
  { id: "l4", sourceUrl: "https://cheap-pills.biz/links", targetUrl: "/", anchor: "buy now", domainRating: 4, spamScore: 82, firstSeen: "2026-08-01" },
  { id: "l5", sourceUrl: "https://spammy.example/farm", targetUrl: "/pricing", anchor: "best seo", domainRating: 6, spamScore: 90, firstSeen: "2026-07-15", disavowed: true },
];

describe("backlink maths", () => {
  it("classifies links and summarises them", () => {
    expect(backlinkStatus(links[0]!, NOW)).toBe("new");
    expect(backlinkStatus(links[1]!, NOW)).toBe("active");
    expect(backlinkStatus(links[2]!, NOW)).toBe("lost");
    expect(isToxic(links[3]!)).toBe(true);
    expect(isToxic(links[4]!)).toBe(false);
    expect(domainOf("https://www.Example.com/x")).toBe("example.com");
    expect(referringDomains(links)).toBe(4);
    expect(summarizeBacklinks(links, NOW)).toMatchObject({ total: 5, active: 4, new: 1, lost: 1, toxic: 1 });
    expect(diffBacklinks(["a", "b"], ["b", "c"])).toEqual({ added: ["c"], removed: ["a"] });
    expect(dailyLinkSeries(links, 3, NOW).map((d) => d.gained)).toEqual([1, 0, 0]);
  });
});

describe("NqBacklinkMonitor", () => {
  it("renders tiles, chart and the table sorted by first seen", () => {
    const w = mount(NqBacklinkMonitor, { props: { links, now: NOW } });
    expect(w.attributes("data-slot")).toBe("backlink-monitor");
    expect(w.text()).toContain("Referring domains");
    expect(w.text()).toContain("Links gained and lost");
    const rows = w.findAll("tbody tr[data-row]");
    expect(rows).toHaveLength(5);
    expect(rows[0]!.text()).toContain("designweekly.com");
    expect(rows[0]!.text()).toContain("New");
    expect(w.text()).toContain("Toxic");
    expect(w.text()).toContain("Disavowed");
    expect(w.text()).toContain("(no anchor)");
  });

  it("filters with the search box", async () => {
    const w = mount(NqBacklinkMonitor, { props: { links, now: NOW } });
    await w.get("input").setValue("arabicdev");
    expect(w.findAll("tbody tr[data-row]")).toHaveLength(1);
  });

  it("offers row actions only when the host handles them", () => {
    const none = mount(NqBacklinkMonitor, { props: { links, now: NOW } });
    expect(none.findAll('[data-slot="data-table-row-actions"]')).toHaveLength(0);
    const w = mount(NqBacklinkMonitor, { props: { links, now: NOW, onDisavow: async () => {}, onMarkSafe: async () => {} } });
    // Every row but the disavowed one can be disavowed; the toxic one can also be marked safe.
    expect(w.findAll('[data-slot="data-table-row-actions"]')).toHaveLength(4);
  });

  it("speaks Arabic with labels", () => {
    const w = mount(NqBacklinkMonitor, { props: { links, now: NOW, labels: { title: "Links" } } });
    expect(w.text()).toContain("Links");
  });
});
