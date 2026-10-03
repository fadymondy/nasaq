import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NasaqProvider } from "../../provider";
import { NqInterimBadge } from ".";

describe("NqInterimBadge", () => {
  it("renders an outlined badge with a spinner and the word", () => {
    const w = mount(NqInterimBadge);
    const el = w.find('[data-slot="interim-badge"]');
    expect(el.exists()).toBe(true);
    expect(el.attributes("data-pending")).toBe("true");
    expect(el.classes()).toEqual(expect.arrayContaining(["border-nq-brand/40", "text-foreground"]));
    expect(w.find('[data-slot="spinner"]').exists()).toBe(true);
    expect(el.text()).toContain("Interim");
  });

  it("drops the spinner and data-pending when pending is false", () => {
    const w = mount(NqInterimBadge, { props: { pending: false, label: "Final" } });
    const el = w.find('[data-slot="interim-badge"]');
    expect(el.attributes("data-pending")).toBeUndefined();
    expect(w.find('[data-slot="spinner"]').exists()).toBe(false);
    expect(el.text()).toBe("Final");
  });

  it("speaks Arabic in an Arabic provider", () => {
    const w = mount(
      { components: { NqInterimBadge, NasaqProvider }, template: `<NasaqProvider locale="ar" target="scope"><NqInterimBadge /></NasaqProvider>` },
    );
    expect(w.find('[data-slot="interim-badge"]').text()).toContain("مبدئي");
  });
});
