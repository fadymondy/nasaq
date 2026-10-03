import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqButton } from ".";

describe("NqButton", () => {
  it("renders the React classes for variant and size", () => {
    const w = mount(NqButton, { props: { variant: "primary", size: "sm" }, slots: { default: "Save" } });
    expect(w.element.tagName).toBe("BUTTON");
    expect(w.attributes("type")).toBe("button");
    expect(w.classes()).toEqual(expect.arrayContaining(["bg-primary", "h-control-sm", "rounded-control"]));
    expect(w.text()).toBe("Save");
  });

  it("loading shows a spinner, sets aria-busy and swallows clicks", async () => {
    const onClick = vi.fn();
    const w = mount(NqButton, { props: { loading: true }, attrs: { onClick }, slots: { default: "Save" } });
    expect(w.attributes("aria-busy")).toBe("true");
    expect(w.find('[data-slot="spinner"]').exists()).toBe(true);
    await w.trigger("click");
    expect(onClick).not.toHaveBeenCalled();
  });

  it("as-child renders the child (an Inertia Link, a router-link) with the button classes", () => {
    const w = mount(NqButton, { props: { asChild: true, variant: "link" }, slots: { default: '<a href="/x">Go</a>' } });
    expect(w.element.tagName).toBe("A");
    expect(w.classes()).toContain("underline");
    expect(w.attributes("type")).toBeUndefined();
  });
});

describe("NqButton shape", () => {
  it("pill is fully rounded with extra padding and a data-shape hook", () => {
    const w = mount(NqButton, { props: { shape: "pill", variant: "primary" }, slots: { default: "Go" } });
    expect(w.attributes("data-shape")).toBe("pill");
    expect(w.classes()).toContain("rounded-full");
    expect(w.classes()).toContain("px-5");
    expect(w.classes()).not.toContain("rounded-control");
  });

  it("the default shape keeps the control radius and no hook", () => {
    const w = mount(NqButton, { slots: { default: "Go" } });
    expect(w.attributes("data-shape")).toBeUndefined();
    expect(w.classes()).toContain("rounded-control");
  });

  it("a pill link keeps the control radius and no padding", () => {
    const w = mount(NqButton, { props: { shape: "pill", variant: "link" }, slots: { default: "Go" } });
    expect(w.classes()).toContain("rounded-control");
    expect(w.classes()).not.toContain("rounded-full");
  });
});
