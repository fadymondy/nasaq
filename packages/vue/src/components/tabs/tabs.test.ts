import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent } from "vue";
import { NqTabs, NqTabsIndicator, NqTabsList, NqTabsPanel, NqTabsTab } from ".";

const Demo = defineComponent({
  components: { NqTabs, NqTabsIndicator, NqTabsList, NqTabsPanel, NqTabsTab },
  props: { variant: { type: String, default: "segmented" } },
  template: `<NqTabs default-value="a"><NqTabsList :variant="variant"><NqTabsTab value="a">A</NqTabsTab><NqTabsTab value="b">B</NqTabsTab><NqTabsIndicator /></NqTabsList>
    <NqTabsPanel value="a">Panel A</NqTabsPanel><NqTabsPanel value="b">Panel B</NqTabsPanel></NqTabs>`,
});

describe("NqTabs", () => {
  it("marks the active tab with data-active and switches panels", async () => {
    const w = mount(Demo, { attachTo: document.body });
    const [a, b] = w.findAll('[data-slot="tabs-tab"]');
    expect(a!.attributes("data-active")).toBe("");
    expect(b!.attributes("data-active")).toBeUndefined();
    expect(a!.classes()).toContain("rounded-[calc(var(--radius-control)-2px)]");
    expect(w.text()).toContain("Panel A");
    await b!.trigger("mousedown", { button: 0 });
    await flushPromises();
    expect(b!.attributes("data-active")).toBe("");
    expect(w.text()).toContain("Panel B");
    expect(w.find('[data-slot="tabs-indicator"]').classes()).toContain("bg-background");
    w.unmount();
  });

  it("underline variant", () => {
    const w = mount(Demo, { props: { variant: "underline" } });
    expect(w.find('[data-slot="tabs-list"]').classes()).toContain("border-b");
    expect(w.find('[data-slot="tabs-indicator"]').classes()).toContain("bg-primary");
  });
});
