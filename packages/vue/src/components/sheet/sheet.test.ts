import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent } from "vue";
import { NqSheet, NqSheetClose, NqSheetContent, NqSheetDescription, NqSheetTitle, NqSheetTrigger } from ".";

const Demo = defineComponent({
  components: { NqSheet, NqSheetClose, NqSheetContent, NqSheetDescription, NqSheetTitle, NqSheetTrigger },
  props: { side: { type: String, default: "end" } },
  template: `<NqSheet><NqSheetTrigger>Open</NqSheetTrigger><NqSheetContent :side="side" class="w-96">
    <NqSheetTitle>Edit</NqSheetTitle><NqSheetDescription>Saves on Save.</NqSheetDescription>
    <NqSheetClose>Cancel</NqSheetClose></NqSheetContent></NqSheet>`,
});

describe("NqSheet", () => {
  it("opens a labelled side panel with the React classes and data-side, then closes", async () => {
    const w = mount(Demo, { attachTo: document.body });
    expect(document.querySelector('[data-slot="sheet-content"]')).toBeNull();
    await w.find('[data-slot="sheet-trigger"]').trigger("click");
    await flushPromises();
    const content = document.querySelector<HTMLElement>('[data-slot="sheet-content"]')!;
    expect(content.getAttribute("role")).toBe("dialog");
    expect(content.getAttribute("data-side")).toBe("end");
    expect(content.getAttribute("aria-labelledby")).toBe(document.querySelector('[data-slot="sheet-title"]')!.id);
    expect(content.className).toContain("end-0");
    expect(content.className).toContain("rtl:data-starting-style:-translate-x-8");
    expect(content.className).toContain("w-96");
    expect(content.className).not.toContain("w-[min(24rem,100vw)]");
    expect(document.querySelector('[data-slot="sheet-backdrop"]')).not.toBeNull();
    expect(document.querySelector('[data-slot="sheet-close"][aria-label="Close"]')).not.toBeNull();
    document.querySelector<HTMLElement>('[data-slot="sheet-close"]:not([aria-label])')!.click();
    await flushPromises();
    await new Promise((r) => setTimeout(r, 300));
    expect(document.querySelector('[data-slot="sheet-content"]')).toBeNull();
    w.unmount();
  });

  it("side variants", async () => {
    const w = mount(Demo, { props: { side: "bottom" }, attachTo: document.body });
    await w.find('[data-slot="sheet-trigger"]').trigger("click");
    await flushPromises();
    const content = document.querySelector<HTMLElement>('[data-slot="sheet-content"]')!;
    expect(content.getAttribute("data-side")).toBe("bottom");
    expect(content.className).toContain("rounded-t-floating");
    w.unmount();
  });
});
