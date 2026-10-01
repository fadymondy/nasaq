import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, ref } from "vue";
import { NqTooltip } from ".";

const Demo = defineComponent({
  components: { NqTooltip },
  setup: () => ({ open: ref(false) }),
  template: `<NqTooltip content="Settings" v-model:open="open"><button aria-label="Settings">S</button></NqTooltip>`,
});

const content = () => document.querySelector<HTMLElement>('[data-slot="tooltip-content"]');

describe("NqTooltip", () => {
  it("shows the inverted surface when open and hides when closed", async () => {
    const w = mount(Demo, { attachTo: document.body });
    expect(content()).toBeNull();
    const trigger = w.find("button");
    expect(trigger.attributes("data-slot")).toBe("tooltip-trigger");
    (w.vm as unknown as { open: boolean }).open = true;
    await flushPromises();
    const el = content()!;
    expect(el).not.toBeNull();
    expect(el.textContent).toContain("Settings");
    expect(el.className).toContain("bg-foreground");
    expect(el.className).toContain("text-background");
    expect(el.hasAttribute("data-open")).toBe(true);
    expect(trigger.attributes("data-popup-open")).toBe("");

    (w.vm as unknown as { open: boolean }).open = false;
    await flushPromises();
    await new Promise((r) => setTimeout(r, 100));
    expect(content()).toBeNull();
    w.unmount();
  });

  it("opens on keyboard focus", async () => {
    const w = mount(Demo, { attachTo: document.body });
    await w.find("button").trigger("focus");
    await flushPromises();
    expect(content()).not.toBeNull();
    w.unmount();
  });
});
