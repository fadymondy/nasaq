import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { NasaqProvider } from "../../provider";
import { h } from "vue";
import { NqGeoList } from ".";

afterEach(() => {
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

const rows = [
  { code: "EG", value: 8100, previous: 8600 },
  { code: "SA", value: 12400, previous: 11200 },
];

describe("NqGeoList", () => {
  it("shows a flag and the localised country name, on a breakdown table", () => {
    const w = mount(NqGeoList, { props: { rows, valueLabel: "Users", class: "extra" } });
    expect(w.attributes("data-slot")).toBe("breakdown-table");
    expect(w.classes()).toContain("extra");
    expect(w.text()).toContain("Countries");
    const first = w.findAll("tbody tr")[0]!;
    expect(first.attributes("data-row")).toBe("SA");
    expect(first.text()).toContain("Saudi Arabia");
    expect(first.find('[aria-hidden="true"].text-base').text()).toBe("🇸🇦");
    expect(w.findAll("thead th")[0]!.text()).toBe("Country");
    expect(first.text()).toContain("12,400");
    expect(first.text()).toContain("+10.7%");
  });

  it("falls back to Unknown without a flag", () => {
    const w = mount(NqGeoList, { props: { rows: [{ code: "ZZZ", value: 310 }], valueLabel: "Users" } });
    expect(w.find("tbody tr").text()).toContain("Unknown");
    expect(w.find("tbody .text-base").exists()).toBe(false);
  });

  it("names countries in Arabic and takes label overrides", () => {
    const w = mount({ render: () => h(NasaqProvider, { locale: "ar" }, () => h(NqGeoList, { rows, valueLabel: "المستخدمون", labels: { title: "المناطق" } })) });
    expect(w.text()).toContain("المناطق");
    expect(w.find("tbody tr").text()).toContain("السعودية");
    expect(w.findAll("thead th")[0]!.text()).toBe("الدولة");
  });
});
