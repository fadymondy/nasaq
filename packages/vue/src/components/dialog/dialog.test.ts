import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent } from "vue";
import { NqDialog, NqDialogClose, NqDialogContent, NqDialogDescription, NqDialogTitle, NqDialogTrigger } from ".";

const Demo = defineComponent({
  components: { NqDialog, NqDialogClose, NqDialogContent, NqDialogDescription, NqDialogTitle, NqDialogTrigger },
  template: `<NqDialog><NqDialogTrigger>Open</NqDialogTrigger><NqDialogContent class="max-w-sm">
    <NqDialogTitle>Delete?</NqDialogTitle><NqDialogDescription>Gone for good.</NqDialogDescription>
    <NqDialogClose>Keep</NqDialogClose></NqDialogContent></NqDialog>`,
});

describe("NqDialog", () => {
  it("opens into a labelled modal with the React classes and closes again", async () => {
    const w = mount(Demo, { attachTo: document.body });
    expect(document.querySelector('[data-slot="dialog-content"]')).toBeNull();
    await w.find('[data-slot="dialog-trigger"]').trigger("click");
    await flushPromises();
    const content = document.querySelector<HTMLElement>('[data-slot="dialog-content"]')!;
    expect(content.getAttribute("role")).toBe("dialog");
    expect(content.getAttribute("aria-labelledby")).toBe(document.querySelector('[data-slot="dialog-title"]')!.id);
    expect(content.className).toContain("rounded-floating");
    expect(content.className).toContain("max-w-sm");
    expect(content.className).not.toMatch(/\bmax-w-lg\b/);
    expect(document.querySelector('[data-slot="dialog-backdrop"]')).not.toBeNull();
    expect(document.querySelector('[data-slot="dialog-close"][aria-label="Close"]')).not.toBeNull();
    (document.querySelector('[data-slot="dialog-close"]:not([aria-label])') as HTMLElement).click();
    await flushPromises();
    await new Promise((r) => setTimeout(r, 250));
    expect(document.querySelector('[data-slot="dialog-content"]')).toBeNull();
    w.unmount();
  });
});
