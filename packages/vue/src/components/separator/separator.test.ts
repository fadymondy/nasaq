import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NqSeparator } from ".";

describe("NqSeparator", () => {
  it("is a horizontal separator by default", () => {
    const w = mount(NqSeparator);
    expect(w.attributes("data-slot")).toBe("separator");
    expect(w.attributes("role")).toBe("separator");
    expect(w.attributes("data-orientation")).toBe("horizontal");
    expect(w.classes()).toEqual(expect.arrayContaining(["h-px", "w-full", "bg-border", "shrink-0"]));
  });

  it("vertical swaps the size classes and merges the caller class", () => {
    const w = mount(NqSeparator, { props: { orientation: "vertical" }, attrs: { class: "h-6" } });
    expect(w.attributes("data-orientation")).toBe("vertical");
    expect(w.attributes("aria-orientation")).toBe("vertical");
    expect(w.classes()).toEqual(expect.arrayContaining(["w-px", "self-center", "h-6"]));
    expect(w.classes()).not.toContain("h-4");
  });
});
