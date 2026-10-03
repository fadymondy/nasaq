import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent } from "vue";
import { NqScrollArea } from ".";

const Demo = defineComponent({
  components: { NqScrollArea },
  props: { orientation: { type: String, default: "vertical" } },
  template: `<NqScrollArea aria-label="Notes" class="h-64 w-72" viewport-class="p-2" :orientation="orientation"><ul><li>One</li><li>Two</li></ul></NqScrollArea>`,
});

describe("NqScrollArea", () => {
  it("renders a named focusable region with the React classes", async () => {
    const w = mount(Demo, { attachTo: document.body });
    await flushPromises();
    const root = w.find('[data-slot="scroll-area"]');
    expect(root.classes()).toEqual(expect.arrayContaining(["relative", "overflow-hidden", "h-64", "w-72"]));
    const viewport = w.find('[data-slot="scroll-area-viewport"]');
    expect(viewport.attributes("role")).toBe("region");
    expect(viewport.attributes("aria-label")).toBe("Notes");
    expect(viewport.attributes("tabindex")).toBe("0");
    expect(viewport.classes()).toContain("p-2");
    expect(w.text()).toContain("One");
    const bars = w.findAll('[data-slot="scroll-area-scrollbar"]');
    expect(bars).toHaveLength(1);
    expect(bars[0]!.classes()).toContain("end-0");
    w.unmount();
  });

  it("shows the scrollbar on hover and renders both axes with a corner", async () => {
    const w = mount(Demo, { props: { orientation: "both" }, attachTo: document.body });
    await flushPromises();
    const bars = w.findAll('[data-slot="scroll-area-scrollbar"]');
    expect(bars).toHaveLength(2);
    expect(bars[0]!.attributes("data-hovering")).toBeUndefined();
    await w.find('[data-slot="scroll-area"]').trigger("pointerenter");
    expect(bars[0]!.attributes("data-hovering")).toBe("");
    w.unmount();
  });
});
