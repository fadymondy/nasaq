import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { h } from "vue";
import { NasaqProvider } from "../../provider";
import { NqBreakdownTable, type BreakdownRow } from ".";

const rows: BreakdownRow[] = [
  { id: "direct", label: "Direct", value: 13400, previous: 14100 },
  { id: "organic", label: "Organic Search", value: 28100, previous: 24800, href: "/organic" },
  { id: "social", label: "Social", value: 6000 },
];
const base = { title: "Channels", dimensionLabel: "Channel", valueLabel: "Sessions", rows };
const many: BreakdownRow[] = Array.from({ length: 10 }, (_, i) => ({ id: `r${i}`, label: `Row ${i}`, value: 100 - i }));

// The Arabic provider writes lang and dir to <html>; put them back so later tests read English.
afterEach(() => {
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

describe("NqBreakdownTable", () => {
  it("sorts by value and shows the value, share and change", () => {
    const w = mount(NqBreakdownTable, { props: { ...base, class: "extra" } });
    expect(w.attributes("data-slot")).toBe("breakdown-table");
    expect(w.classes()).toContain("extra");
    expect(w.find('[data-slot="table-container"]').attributes("aria-label")).toBe("Channels");
    const ids = w.findAll("tbody tr").map((r) => r.attributes("data-row"));
    expect(ids).toEqual(["organic", "direct", "social"]);
    const first = w.findAll("tbody tr")[0]!;
    expect(first.text()).toContain("Organic Search");
    expect(first.text()).toContain("28,100");
    expect(first.text()).toContain("59.2%");
    expect(first.text()).toContain("+13.3%");
    expect(first.find(".text-nq-success-text").exists()).toBe(true);
    expect(w.findAll("tbody tr")[1]!.find(".text-nq-danger-text").exists()).toBe(true);
    expect(w.findAll("tbody tr")[2]!.text()).toContain("–");
    expect(w.findAll("thead th").map((t) => t.text())).toEqual(["Channel", "Sessions", "Share", "Change"]);
  });

  it("sizes the bar against the largest value and links rows with an href", () => {
    const w = mount(NqBreakdownTable, { props: base });
    const bars = w.findAll('[data-slot="breakdown-bar"] > span');
    expect(bars[0]!.attributes("style")).toContain("width: 100%");
    expect(bars[0]!.attributes("style")).toContain("--bar: var(--primary)");
    expect(bars[2]!.attributes("style")).toContain("width: 21.352");
    expect(w.find("a").attributes("href")).toBe("/organic");
  });

  it("inverts the tone, hides share and change columns, and keeps labels left to right", () => {
    const w = mount(NqBreakdownTable, { props: { ...base, invert: true, showShare: false, ltrLabels: true } });
    expect(w.findAll("thead th").map((t) => t.text())).toEqual(["Channel", "Sessions", "Change"]);
    expect(w.findAll("tbody tr")[0]!.find(".text-nq-danger-text").exists()).toBe(true);
    expect(w.find("bdi[dir=ltr]").exists()).toBe(true);
    const plain = mount(NqBreakdownTable, { props: { ...base, rows: rows.map((r) => ({ id: r.id, label: r.label, value: r.value })) } });
    expect(plain.findAll("thead th").map((t) => t.text())).toEqual(["Channel", "Sessions", "Share"]);
    expect(plain.find("span[dir=auto]").exists()).toBe(true);
  });

  it("limits the rows and expands with Show all", async () => {
    const w = mount(NqBreakdownTable, { props: { ...base, rows: many } });
    expect(w.findAll("tbody tr")).toHaveLength(8);
    const button = w.find('[data-slot="button"]');
    expect(button.text()).toBe("Show all 10");
    expect(button.attributes("aria-expanded")).toBe("false");
    await button.trigger("click");
    expect(w.findAll("tbody tr")).toHaveLength(10);
    expect(button.text()).toBe("Show fewer");
    expect(button.attributes("aria-expanded")).toBe("true");
  });

  it("renders extra columns from a function or a slot", () => {
    const w = mount(NqBreakdownTable, {
      props: {
        ...base,
        columns: [
          { id: "bounce", header: "Bounce", align: "end" as const, cell: (r: BreakdownRow) => `${r.id}!` },
          { id: "x", header: "X" },
        ],
      },
      slots: { "cell-x": ({ row }: { row: BreakdownRow }) => h("b", row.label) },
    });
    expect(w.findAll("thead th").map((t) => t.text())).toContain("Bounce");
    expect(w.findAll("tbody tr")[0]!.text()).toContain("organic!");
    expect(w.findAll("tbody tr")[0]!.find("b").text()).toBe("Organic Search");
    expect(w.findAll("thead th")[4]!.classes()).toContain("text-end");
  });

  it("shows skeletons while loading and the empty message with no rows", () => {
    const loading = mount(NqBreakdownTable, { props: { ...base, loading: true } });
    expect(loading.attributes("aria-busy")).toBe("true");
    expect(loading.findAll('[data-slot="skeleton"]')).toHaveLength(5);
    expect(loading.find("table").exists()).toBe(false);
    expect(mount(NqBreakdownTable, { props: { ...base, rows: [] } }).text()).toContain("No data for this period");
  });

  it("is Arabic inside an Arabic provider", () => {
    const w = mount({ components: { NasaqProvider, NqBreakdownTable }, setup: () => ({ base }), template: '<NasaqProvider locale="ar"><NqBreakdownTable v-bind="base" /></NasaqProvider>' });
    expect(w.text()).toContain("النسبة");
    expect(w.text()).toContain("التغيّر");
    w.unmount();
  });
});
