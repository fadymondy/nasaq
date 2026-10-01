import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent } from "vue";
import { NqDrawer, NqDrawerClose, NqDrawerContent, NqDrawerDescription, NqDrawerTitle, NqDrawerTrigger } from ".";

const Demo = defineComponent({
  components: { NqDrawer, NqDrawerClose, NqDrawerContent, NqDrawerDescription, NqDrawerTitle, NqDrawerTrigger },
  template: `<NqDrawer><NqDrawerTrigger>Open</NqDrawerTrigger><NqDrawerContent>
    <NqDrawerTitle>Edit</NqDrawerTitle><NqDrawerDescription>Drag down.</NqDrawerDescription>
    <NqDrawerClose>Cancel</NqDrawerClose></NqDrawerContent></NqDrawer>`,
});

let clock = 0;
const pointer = (type: string, y: number) => {
  const e = new Event(type, { bubbles: true });
  clock += 100; // slow drags, so velocity never closes by itself
  for (const [k, v] of Object.entries({ clientY: y, pointerId: 1, pointerType: "touch", button: 0, timeStamp: clock })) {
    Object.defineProperty(e, k, { value: v });
  }
  return e;
};

describe("NqDrawer", () => {
  it("opens a bottom drawer with a handle and the React classes", async () => {
    const w = mount(Demo, { attachTo: document.body });
    expect(document.querySelector('[data-slot="drawer-content"]')).toBeNull();
    await w.find('[data-slot="drawer-trigger"]').trigger("click");
    await flushPromises();
    const content = document.querySelector<HTMLElement>('[data-slot="drawer-content"]')!;
    expect(content.getAttribute("role")).toBe("dialog");
    expect(content.getAttribute("aria-labelledby")).toBe(document.querySelector('[data-slot="drawer-title"]')!.id);
    expect(content.className).toContain("rounded-t-floating");
    expect(content.className).toContain("max-w-xl");
    expect(document.querySelector('[data-slot="drawer-handle"]')).not.toBeNull();
    expect(document.querySelector('[data-slot="drawer-backdrop"]')).not.toBeNull();
    expect(document.querySelector('[data-slot="drawer-close"][aria-label="Close"]')).not.toBeNull();
    w.unmount();
  });

  it("follows a drag on the handle, snaps back when short, and closes on a long drag", async () => {
    const w = mount(Demo, { attachTo: document.body });
    await w.find('[data-slot="drawer-trigger"]').trigger("click");
    await flushPromises();
    const content = () => document.querySelector<HTMLElement>('[data-slot="drawer-content"]');
    const handle = document.querySelector<HTMLElement>('[data-slot="drawer-handle"]')!;
    Object.defineProperty(content()!, "offsetHeight", { value: 400 });

    handle.dispatchEvent(pointer("pointerdown", 100));
    handle.dispatchEvent(pointer("pointermove", 140));
    await flushPromises();
    expect(content()!.hasAttribute("data-dragging")).toBe(true);
    expect(content()!.style.translate).toBe("0 40px");
    handle.dispatchEvent(pointer("pointerup", 140));
    await flushPromises();
    expect(content()!.hasAttribute("data-dragging")).toBe(false);
    expect(content()!.style.translate).toBe("");

    handle.dispatchEvent(pointer("pointerdown", 100));
    handle.dispatchEvent(pointer("pointermove", 300));
    handle.dispatchEvent(pointer("pointerup", 300));
    await flushPromises();
    await new Promise((r) => setTimeout(r, 600));
    expect(content()).toBeNull();
    w.unmount();
  });
});
