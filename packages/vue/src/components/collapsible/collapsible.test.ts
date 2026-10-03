import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent } from "vue";
import { NqCollapsible, NqCollapsiblePanel, NqCollapsibleTrigger } from ".";

const Demo = defineComponent({
  components: { NqCollapsible, NqCollapsiblePanel, NqCollapsibleTrigger },
  props: { defaultOpen: Boolean },
  template: `<NqCollapsible :default-open="defaultOpen"><NqCollapsibleTrigger>Advanced</NqCollapsibleTrigger>
    <NqCollapsiblePanel class="py-2"><p>Only shown when open.</p></NqCollapsiblePanel></NqCollapsible>`,
});

describe("NqCollapsible", () => {
  it("toggles the panel, aria-expanded and the open attributes", async () => {
    const w = mount(Demo, { attachTo: document.body });
    const trigger = w.find('[data-slot="collapsible-trigger"]');
    expect(trigger.attributes("aria-expanded")).toBe("false");
    expect(w.find('[data-slot="collapsible-panel"]').exists()).toBe(false);
    expect(w.find('[data-slot="collapsible"]').attributes("data-closed")).toBe("");

    await trigger.trigger("click");
    await flushPromises();
    const panel = w.find('[data-slot="collapsible-panel"]');
    expect(panel.exists()).toBe(true);
    expect(panel.classes()).toContain("h-(--collapsible-panel-height)");
    expect(panel.classes()).toContain("py-2");
    expect(trigger.attributes("aria-expanded")).toBe("true");
    expect(trigger.attributes("data-panel-open")).toBe("");
    expect(w.find('[data-slot="collapsible"]').attributes("data-open")).toBe("");

    await trigger.trigger("click");
    await flushPromises();
    await new Promise((r) => setTimeout(r, 300));
    expect(w.find('[data-slot="collapsible-panel"]').exists()).toBe(false);
    w.unmount();
  });

  it("starts open with default-open", () => {
    const w = mount(Demo, { props: { defaultOpen: true } });
    expect(w.find('[data-slot="collapsible-panel"]').exists()).toBe(true);
    w.unmount();
  });
});
