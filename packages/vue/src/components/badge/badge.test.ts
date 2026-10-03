import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NqBadge } from ".";

describe("NqBadge", () => {
  it("renders the neutral React classes by default", () => {
    const w = mount(NqBadge, { slots: { default: "Draft" } });
    expect(w.element.tagName).toBe("SPAN");
    expect(w.attributes("data-slot")).toBe("badge");
    expect(w.classes()).toEqual(expect.arrayContaining(["h-5", "bg-secondary", "border-border"]));
    expect(w.text()).toBe("Draft");
  });

  it("status variants and class merging", () => {
    const w = mount(NqBadge, { props: { variant: "warning" }, attrs: { class: "h-6" } });
    expect(w.classes()).toEqual(expect.arrayContaining(["bg-nq-warning-soft", "text-nq-warning-text", "h-6"]));
    expect(w.classes()).not.toContain("h-5");
  });

  it("tag variant sets the hue variables, keeps a caller style", () => {
    const w = mount(NqBadge, { props: { variant: "tag", hue: "blue" }, attrs: { style: "margin: 2px" } });
    const style = w.attributes("style")!;
    expect(style).toContain("--tag-solid: var(--nq-tag-blue)");
    expect(style).toContain("--tag-soft: var(--nq-tag-blue-soft)");
    expect(style).toContain("margin: 2px");
  });
});
