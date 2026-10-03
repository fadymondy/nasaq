import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { h } from "vue";
import { NasaqProvider } from "../../provider";
import { NqPrice } from ".";

describe("NqPrice", () => {
  it("formats USD with a period suffix and merges classes", () => {
    const w = mount(NqPrice, { props: { amount: 12, period: "seat-month", class: "mt-2" } });
    expect(w.attributes("data-slot")).toBe("price");
    expect(w.find("bdi").text()).toBe("$12");
    expect(w.find("bdi").classes()).toEqual(expect.arrayContaining(["tabular-nums", "font-medium"]));
    expect(w.text()).toContain("/seat/mo");
    expect(w.classes()).toEqual(expect.arrayContaining(["inline-flex", "mt-2"]));
  });

  it("shows two decimals for fractions and the struck-through original", () => {
    const w = mount(NqPrice, { props: { amount: 9.5, compareAt: 12, size: "lg" } });
    expect(w.find("bdi").text()).toBe("$9.50");
    expect(w.find("bdi").classes()).toContain("text-h2");
    const s = w.find("s");
    expect(s.text()).toContain("was");
    expect(s.find("bdi").text()).toBe("$12");
  });

  it("renders the free label for 0", () => {
    const w = mount(NqPrice, { props: { amount: 0 } });
    expect(w.attributes("data-free")).toBe("");
    expect(w.text()).toBe("Free");
    expect(mount(NqPrice, { props: { amount: 0, freeLabel: "On us" } }).text()).toBe("On us");
  });

  it("is SAR in Arabic and takes an explicit currency", () => {
    const ar = mount(NasaqProvider, { props: { defaultLocale: "ar", target: "scope" }, slots: { default: () => h(NqPrice, { amount: 12, period: "month" }) } });
    expect(ar.text()).toMatch(/SAR|ر\.س/);
    expect(ar.text()).toContain("/شهريًا");
    expect(mount(NqPrice, { props: { amount: 5, currency: "EUR" } }).text()).toContain("€");
  });
});
