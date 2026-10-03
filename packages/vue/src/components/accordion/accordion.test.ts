import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, ref } from "vue";
import { NqAccordion, NqAccordionItem, NqAccordionPanel, NqAccordionTrigger } from ".";

const Demo = defineComponent({
  components: { NqAccordion, NqAccordionItem, NqAccordionPanel, NqAccordionTrigger },
  props: { multiple: Boolean },
  setup: () => ({ value: ref<string[]>(["plan"]) }),
  template: `<NqAccordion v-model="value" :multiple="multiple" class="max-w-md">
    <NqAccordionItem value="plan"><NqAccordionTrigger>Plan?</NqAccordionTrigger><NqAccordionPanel>Yes.</NqAccordionPanel></NqAccordionItem>
    <NqAccordionItem value="pay"><NqAccordionTrigger>Pay?</NqAccordionTrigger><NqAccordionPanel>Mada.</NqAccordionPanel></NqAccordionItem>
    <NqAccordionItem value="off" disabled><NqAccordionTrigger>Off</NqAccordionTrigger><NqAccordionPanel>Never.</NqAccordionPanel></NqAccordionItem>
  </NqAccordion><p id="out">{{ value.join(',') }}</p>`,
});

const wait = (ms = 300) => new Promise((r) => setTimeout(r, ms));

describe("NqAccordion", () => {
  it("renders the React classes, slots and open state", async () => {
    const w = mount(Demo, { attachTo: document.body });
    const root = w.find('[data-slot="accordion"]');
    expect(root.classes()).toEqual(expect.arrayContaining(["rounded-card", "border", "bg-card", "max-w-md"]));
    const items = w.findAll('[data-slot="accordion-item"]');
    expect(items[0]!.classes()).toContain("border-b");
    expect(items[0]!.attributes("data-open")).toBe("");
    expect(items[1]!.attributes("data-open")).toBeUndefined();
    expect(w.find('[data-slot="accordion-header"]').classes()).toEqual(expect.arrayContaining(["m-0", "flex"]));
    const [t1, t2] = w.findAll('[data-slot="accordion-trigger"]');
    expect(t1!.attributes("aria-expanded")).toBe("true");
    expect(t1!.attributes("data-panel-open")).toBe("");
    expect(t2!.attributes("data-panel-open")).toBeUndefined();
    expect(t1!.classes()).toContain("group");
    expect(t1!.find("svg").classes()).toContain("group-data-panel-open:rotate-180");
    const panel = w.find('[data-slot="accordion-panel"]');
    expect(panel.attributes("role")).toBe("region");
    expect(panel.attributes("aria-labelledby")).toBe(t1!.attributes("id"));
    expect(t1!.attributes("aria-controls")).toBe(panel.attributes("id"));
    expect(w.findAll('[data-slot="accordion-panel"]')).toHaveLength(1);
    w.unmount();
  });

  it("opens one at a time by default, and a click on the open one closes it", async () => {
    const w = mount(Demo, { attachTo: document.body });
    const t2 = w.findAll('[data-slot="accordion-trigger"]')[1]!;
    await t2.trigger("click");
    await flushPromises();
    expect(w.find("#out").text()).toBe("pay");
    await wait();
    expect(w.findAll('[data-slot="accordion-panel"]')).toHaveLength(1);
    await t2.trigger("click");
    await flushPromises();
    expect(w.find("#out").text()).toBe("");
    w.unmount();
  });

  it("keeps several open with multiple, and ignores a disabled item", async () => {
    const w = mount(Demo, { props: { multiple: true }, attachTo: document.body });
    const triggers = w.findAll('[data-slot="accordion-trigger"]');
    await triggers[1]!.trigger("click");
    await flushPromises();
    expect(w.find("#out").text()).toBe("plan,pay");
    expect(triggers[2]!.attributes("data-disabled")).toBe("");
    await triggers[2]!.trigger("click");
    await flushPromises();
    expect(w.find("#out").text()).toBe("plan,pay");
    w.unmount();
  });
});
