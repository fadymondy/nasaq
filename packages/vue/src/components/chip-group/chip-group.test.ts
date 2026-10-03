import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, ref } from "vue";
import { NqChip, NqChipGroup } from ".";

const Demo = defineComponent({
  components: { NqChip, NqChipGroup },
  setup: () => ({ v: ref("all") }),
  template: `<NqChipGroup v-model="v" aria-label="Categories" class="mt-2"><NqChip value="all">All</NqChip><NqChip value="fin">Finance</NqChip></NqChipGroup>`,
});

describe("NqChipGroup", () => {
  it("renders the group and marks the selected chip", () => {
    const w = mount(Demo);
    const root = w.get('[data-slot="chip-group"]');
    expect(root.attributes("role")).toBe("group");
    expect(root.attributes("aria-label")).toBe("Categories");
    expect(root.classes()).toEqual(expect.arrayContaining(["overflow-x-auto", "mt-2"]));
    const chips = w.findAll('[data-slot="chip"]');
    expect(chips[0]!.attributes("aria-pressed")).toBe("true");
    expect(chips[0]!.attributes("data-selected")).toBeDefined();
    expect(chips[1]!.attributes("aria-pressed")).toBe("false");
    expect(chips[1]!.attributes("data-selected")).toBeUndefined();
    expect(chips[0]!.classes()).toEqual(expect.arrayContaining(["rounded-full", "data-selected:bg-nq-selected"]));
  });

  it("clicking a chip selects it", async () => {
    const w = mount(Demo);
    await w.findAll('[data-slot="chip"]')[1]!.trigger("click");
    expect(w.findAll('[data-slot="chip"]')[1]!.attributes("aria-pressed")).toBe("true");
    expect(w.findAll('[data-slot="chip"]')[0]!.attributes("aria-pressed")).toBe("false");
  });

  it("a chip outside a group throws", () => {
    expect(() => mount(NqChip, { props: { value: "x" } })).toThrow();
  });
});
