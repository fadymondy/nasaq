import { mount } from "@vue/test-utils";
import { ArrowRight, Search } from "lucide-vue-next";
import { describe, expect, it } from "vitest";
import { NqBdi, NqBidiText, NqIcon, NqLtr, isolate } from ".";

describe("NqIcon", () => {
  it("mirrors directional icons in RTL and is decorative by default", () => {
    const w = mount(NqIcon, { props: { icon: ArrowRight }, attrs: { class: "size-5" } });
    expect(w.attributes("data-slot")).toBe("icon");
    expect(w.attributes("aria-hidden")).toBe("true");
    expect(w.classes()).toEqual(expect.arrayContaining(["rtl:-scale-x-100", "size-5"]));
  });

  it("never mirrors a non-directional icon, unless forced", () => {
    expect(mount(NqIcon, { props: { icon: Search } }).classes()).not.toContain("rtl:-scale-x-100");
    expect(mount(NqIcon, { props: { icon: Search, directional: true } }).classes()).toContain("rtl:-scale-x-100");
    expect(mount(NqIcon, { props: { icon: ArrowRight, directional: false } }).classes()).not.toContain("rtl:-scale-x-100");
  });

  it("a label makes it an img", () => {
    const w = mount(NqIcon, { props: { icon: Search, label: "Search" } });
    expect(w.attributes("role")).toBe("img");
    expect(w.attributes("aria-label")).toBe("Search");
    expect(w.attributes("aria-hidden")).toBeUndefined();
  });
});

describe("bidi helpers", () => {
  it("Ltr, Bdi and BidiText", () => {
    const ltr = mount(NqLtr, { slots: { default: "a@b.co" } });
    expect(ltr.attributes("dir")).toBe("ltr");
    expect(ltr.classes()).toContain("[unicode-bidi:isolate]");
    expect(mount(NqBdi).element.tagName).toBe("BDI");
    const p = mount(NqBidiText);
    expect(p.attributes("dir")).toBe("auto");
    expect(p.classes()).toEqual(expect.arrayContaining(["[unicode-bidi:plaintext]", "text-start"]));
  });

  it("isolate wraps text in Unicode isolate marks", () => {
    expect(isolate("x", "ltr")).toBe("⁦x⁩");
    expect(isolate("x")).toBe("⁨x⁩");
  });
});
