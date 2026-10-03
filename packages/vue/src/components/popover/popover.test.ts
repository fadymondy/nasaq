import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent } from "vue";
import { NqPopover, NqPopoverClose, NqPopoverContent, NqPopoverDescription, NqPopoverTitle, NqPopoverTrigger, physicalSide } from ".";

const Demo = defineComponent({
  components: { NqPopover, NqPopoverClose, NqPopoverContent, NqPopoverDescription, NqPopoverTitle, NqPopoverTrigger },
  template: `<NqPopover><NqPopoverTrigger>Details</NqPopoverTrigger><NqPopoverContent class="w-96">
    <NqPopoverTitle>Deployment window</NqPopoverTitle><NqPopoverDescription>Sunday to Thursday.</NqPopoverDescription>
    <NqPopoverClose>Got it</NqPopoverClose></NqPopoverContent></NqPopover>`,
});

const content = () => document.querySelector<HTMLElement>('[data-slot="popover-content"]');

describe("NqPopover", () => {
  it("opens with the React classes, wires title and description, and closes", async () => {
    const w = mount(Demo, { attachTo: document.body });
    expect(content()).toBeNull();
    const trigger = w.find('[data-slot="popover-trigger"]');
    await trigger.trigger("click");
    await flushPromises();
    const el = content()!;
    expect(el).not.toBeNull();
    expect(el.className).toContain("rounded-floating");
    expect(el.className).toContain("w-96");
    expect(el.className).not.toMatch(/\bw-72\b/);
    expect(el.hasAttribute("data-open")).toBe(true);
    expect(trigger.attributes("aria-expanded")).toBe("true");
    const title = document.querySelector('[data-slot="popover-title"]')!;
    expect(el.getAttribute("aria-labelledby")).toBe(title.id);
    expect(el.getAttribute("aria-describedby")).toBe(document.querySelector('[data-slot="popover-description"]')!.id);

    document.querySelector<HTMLElement>('[data-slot="popover-close"]')!.click();
    await flushPromises();
    await new Promise((r) => setTimeout(r, 100));
    expect(content()).toBeNull();
    w.unmount();
  });

  it("maps logical sides by direction", () => {
    expect(physicalSide("inline-start", false)).toBe("left");
    expect(physicalSide("inline-start", true)).toBe("right");
    expect(physicalSide("inline-end", true)).toBe("left");
    expect(physicalSide("top", true)).toBe("top");
  });
});
