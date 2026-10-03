import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NqBrandGuidelines, NqBrandSwatch, brandMarkDownloads, brandPalette } from ".";

describe("brand data", () => {
  it("builds the palette and the two mark downloads from the brand package", () => {
    expect(brandPalette("nasaq").map((c) => c.id)).toEqual(["brand-light", "brand-dark", "action-light", "action-dark", "accent"]);
    expect(brandPalette("nope")).toEqual([]);
    const dl = brandMarkDownloads("nasaq", { light: "L", dark: "D" });
    expect(dl.map((d) => d.filename)).toEqual(["nasaq-mark.svg", "nasaq-mark-on-dark.svg"]);
    expect(dl[0]!.href.startsWith("data:image/svg+xml")).toBe(true);
  });
});

describe("NqBrandGuidelines", () => {
  it("renders the logo, colour, usage sections and the section nav", () => {
    const w = mount(NqBrandGuidelines, { props: { brand: "nasaq", intro: "Intro text" } });
    expect(w.attributes("data-slot")).toBe("brand-guidelines");
    expect(w.text()).toContain("Brand guidelines");
    expect(w.text()).toContain("Intro text");
    expect(w.findAll('[data-slot="brand-asset-card"]')).toHaveLength(2);
    expect(w.findAll('[data-slot="brand-swatch"]')).toHaveLength(5);
    expect(w.find('[data-slot="brand-do-dont"]').exists()).toBe(true);
    expect(w.find("nav").exists()).toBe(true);
    expect(w.find("a[download]").attributes("download")).toBe("nasaq-mark.svg");
  });
  it("hides sections that have nothing, and draws a live social card", () => {
    const w = mount(NqBrandGuidelines, { props: { brand: "nasaq", assets: [], colors: [], dos: [], donts: [], ogCards: [{ id: "a", title: "Hello", href: "/a.png", filename: "a.png" }] } });
    expect(w.findAll('[data-slot="brand-swatch"]')).toHaveLength(0);
    expect(w.find('[data-slot="brand-og-card"]').text()).toContain("1200 × 630");
    expect(w.find("nav").exists()).toBe(false);
  });
  it("a swatch shows the value as written and a copy button", () => {
    const w = mount(NqBrandSwatch, { props: { color: { id: "brand-light", value: "#15694A", onColor: "#fff" } } });
    expect(w.text()).toContain("#15694A");
    expect(w.text()).toContain("Brand, light");
    expect(w.find('[data-slot="copy-button"]').exists()).toBe(true);
  });
});
