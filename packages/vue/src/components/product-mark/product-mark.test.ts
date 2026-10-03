import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqProductLogo, NqProductMark } from ".";

describe("NqProductMark", () => {
  it("draws the brand lattice as an accessible svg, accent cube from 20px up", () => {
    const w = mount(NqProductMark, { props: { brand: "mahaam", size: 32, class: "x" } });
    expect(w.element.tagName.toLowerCase()).toBe("svg");
    expect(w.attributes("data-slot")).toBe("product-mark");
    expect(w.attributes("role")).toBe("img");
    expect(w.attributes("aria-label")).toBe("Mahaam");
    expect(w.attributes("width")).toBe("32");
    expect(w.classes()).toEqual(expect.arrayContaining(["shrink-0", "x"]));
    expect(new Set(w.findAll("rect").map((r) => r.attributes("fill"))).size).toBe(2);
    const small = mount(NqProductMark, { props: { brand: "mahaam", size: 16 } });
    expect(new Set(small.findAll("rect").map((r) => r.attributes("fill"))).size).toBe(1);
  });

  it("hides from assistive tech with an empty title", () => {
    const w = mount(NqProductMark, { props: { brand: "nasaq", title: "" } });
    expect(w.attributes("aria-hidden")).toBe("true");
    expect(w.attributes("role")).toBeUndefined();
  });

  it("warns and falls back for an unknown brand", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const w = mount(NqProductMark, { props: { brand: "nope" } });
    expect(warn).toHaveBeenCalled();
    expect(w.attributes("aria-label")).toBeTruthy();
    warn.mockRestore();
  });

  it("shows a custom logo image and falls back to the mark when it fails", async () => {
    const w = mount(NqProductMark, { props: { brand: "zekra", src: "/logo.png" } });
    expect(w.element.tagName).toBe("IMG");
    expect(w.attributes("data-custom")).toBe("");
    await w.trigger("error");
    expect(w.element.tagName.toLowerCase()).toBe("svg");
  });

  it("the logo pairs the mark with the typeset name", () => {
    const w = mount(NqProductLogo, { props: { brand: "zekra", size: 20 } });
    expect(w.attributes("data-slot")).toBe("product-logo");
    expect(w.text()).toBe("ZEKRA");
    expect(w.find("[dir=ltr]").classes()).toContain("uppercase");
    const ar = mount(NqProductLogo, { props: { brand: "zekra", arabic: true } });
    expect(ar.text()).toBe("ذكرى");
    expect(ar.find("[lang=ar]").classes()).toContain("font-arabic");
  });
});
