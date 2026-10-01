import { mount } from "@vue/test-utils";
import { Zap } from "lucide-vue-next";
import { describe, expect, it } from "vitest";
import { NqAppGlyph, NqProductArtwork } from ".";

describe("NqProductArtwork", () => {
  it("sets data-brand, the gradient field and draws the mark", () => {
    const w = mount(NqProductArtwork, { props: { brand: "mahaam", class: "aspect-[16/10] w-80" } });
    expect(w.attributes("data-slot")).toBe("product-artwork");
    expect(w.attributes("data-brand")).toBe("mahaam");
    expect(w.classes()).toEqual(expect.arrayContaining(["rounded-card", "overflow-hidden", "rtl:[--art-x:0%]", "w-80"]));
    const mark = w.find('[data-slot="product-mark"]');
    expect(mark.attributes("width")).toBe("48");
    expect(mark.attributes("aria-hidden")).toBe("true");
  });

  it("markSize resizes the mark and the slot replaces it", () => {
    expect(mount(NqProductArtwork, { props: { brand: "zekra", markSize: 64 } }).find("svg").attributes("width")).toBe("64");
    const w = mount(NqProductArtwork, { props: { brand: "zekra" }, slots: { default: "<em>banner</em>" } });
    expect(w.find("em").exists()).toBe(true);
    expect(w.find('[data-slot="product-mark"]').exists()).toBe(false);
  });
});

describe("NqAppGlyph", () => {
  it("renders a glyph on a brand tint at the chosen size", () => {
    const w = mount(NqAppGlyph, { props: { icon: Zap, size: "lg", brand: "zekra" } });
    expect(w.attributes("data-slot")).toBe("app-glyph");
    expect(w.attributes("data-brand")).toBe("zekra");
    expect(w.attributes("aria-hidden")).toBe("true");
    expect(w.classes()).toEqual(expect.arrayContaining(["size-11", "rounded-card", "text-nq-brand"]));
    expect(w.find("svg").exists()).toBe(true);
  });
});
