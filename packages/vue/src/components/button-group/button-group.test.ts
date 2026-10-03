import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent } from "vue";
import { NqButton } from "../button";
import { NqButtonGroup, NqButtonGroupSeparator } from ".";

const Demo = defineComponent({
  components: { NqButton, NqButtonGroup },
  template: `<NqButtonGroup aria-label="Period"><NqButton>Day</NqButton><NqButton>Week</NqButton></NqButtonGroup>`,
});

describe("NqButtonGroup", () => {
  it("is a labelled group that joins its buttons with logical corners", () => {
    const w = mount(Demo);
    const group = w.find('[data-slot="button-group"]');
    expect(group.attributes("role")).toBe("group");
    expect(group.attributes("data-orientation")).toBe("horizontal");
    expect(group.attributes("aria-label")).toBe("Period");
    expect(group.classes()).toEqual(
      expect.arrayContaining(["flex", "w-fit", "[&>[data-slot=button]]:first-child:rounded-s-control", "[&>[data-slot=button]]:last-child:rounded-e-control"]),
    );
    expect(w.findAll('[data-slot="button"]')).toHaveLength(2);
  });

  it("vertical stacks", () => {
    const w = mount(NqButtonGroup, { props: { orientation: "vertical" } });
    expect(w.classes()).toContain("flex-col");
    expect(w.classes()).toContain("[&>[data-slot=button]]:first-child:rounded-t-control");
  });

  it("separator", () => {
    const w = mount(NqButtonGroupSeparator);
    expect(w.attributes("role")).toBe("separator");
    expect(w.attributes("data-slot")).toBe("button-group-separator");
    expect(w.classes()).toContain("w-px");
  });
});
