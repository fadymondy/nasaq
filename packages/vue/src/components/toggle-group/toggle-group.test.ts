import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
const btn = (w: ReturnType<typeof mount>) => w.find("button");
import { defineComponent } from "vue";
import { NqToggle, NqToggleGroup } from ".";

const Demo = defineComponent({
  components: { NqToggle, NqToggleGroup },
  props: { variant: { type: String, default: "segmented" }, multiple: Boolean },
  template: `<NqToggleGroup :default-value="['list']" :variant="variant" :multiple="multiple" aria-label="View mode">
    <NqToggle value="list">List</NqToggle><NqToggle value="grid">Grid</NqToggle></NqToggleGroup>`,
});

describe("NqToggleGroup", () => {
  it("segmented: tinted track, pressed item raised", () => {
    const w = mount(Demo);
    const group = w.find('[data-slot="toggle-group"]');
    expect(group.attributes("data-variant")).toBe("segmented");
    expect(group.classes()).toEqual(expect.arrayContaining(["bg-secondary", "p-0.5"]));
    const [list, grid] = w.findAll('[data-slot="toggle"]');
    expect(list!.attributes("aria-pressed")).toBe("true");
    expect(list!.attributes("data-pressed")).toBe("");
    expect(grid!.attributes("data-pressed")).toBeUndefined();
    expect(list!.classes()).toContain("data-pressed:bg-card");
  });

  it("outline variant joins the items", () => {
    const w = mount(Demo, { props: { variant: "outline" } });
    expect(w.find('[data-slot="toggle"]').classes()).toContain("first:rounded-s-control");
  });

  it("single mode swaps the pressed item, multiple adds to it", async () => {
    const single = mount(Demo, { attachTo: document.body });
    let [list, grid] = single.findAll('[data-slot="toggle"]');
    await grid!.trigger("click");
    await flushPromises();
    expect(grid!.attributes("data-pressed")).toBe("");
    expect(list!.attributes("data-pressed")).toBeUndefined();
    single.unmount();

    const multi = mount(Demo, { props: { multiple: true }, attachTo: document.body });
    [list, grid] = multi.findAll('[data-slot="toggle"]');
    await grid!.trigger("click");
    await flushPromises();
    expect(list!.attributes("data-pressed")).toBe("");
    expect(grid!.attributes("data-pressed")).toBe("");
    multi.unmount();
  });

  it("v-model is the source of truth: the parent can clear the group", async () => {
    const w = mount(
      defineComponent({
        components: { NqToggle, NqToggleGroup },
        data: () => ({ v: ["list"] as string[] }),
        template: `<NqToggleGroup v-model="v" aria-label="View"><NqToggle value="list">List</NqToggle><NqToggle value="grid">Grid</NqToggle></NqToggleGroup>`,
      }),
    );
    const pressed = () => w.findAll("button").map((b) => b.attributes("aria-pressed"));
    expect(pressed()).toEqual(["true", "false"]);
    (w.vm as unknown as { v: string[] }).v = [];
    await flushPromises();
    expect(pressed()).toEqual(["false", "false"]);
  });

  it("a standalone toggle looks like an outline button and toggles", async () => {
    const w = mount(NqToggle, { slots: { default: "Bold" } });
    expect(btn(w).classes()).toContain("rounded-control");
    expect(btn(w).attributes("aria-pressed")).toBe("false");
    await btn(w).trigger("click");
    expect(btn(w).attributes("data-pressed")).toBe("");
    expect(w.emitted("update:modelValue")![0]).toEqual([true]);
  });
});
