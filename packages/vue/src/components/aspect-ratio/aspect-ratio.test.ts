import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NqAspectRatio } from ".";

describe("NqAspectRatio", () => {
  it("defaults to 16 / 9 and merges classes and style", () => {
    const w = mount(NqAspectRatio, { attrs: { class: "rounded-card", style: "color: red" }, slots: { default: '<img src="/a.jpg" alt="" />' } });
    expect(w.attributes("data-slot")).toBe("aspect-ratio");
    expect(w.classes()).toEqual(expect.arrayContaining(["relative", "w-full", "overflow-hidden", "rounded-card"]));
    const style = w.attributes("style")!;
    expect(style).toContain("aspect-ratio");
    expect(style).toContain(String(16 / 9));
    expect(style).toContain("color: red");
  });

  it("takes a custom ratio", () => {
    const w = mount(NqAspectRatio, { props: { ratio: 1 } });
    expect(w.attributes("style")).toMatch(/aspect-ratio: 1/);
  });
});
