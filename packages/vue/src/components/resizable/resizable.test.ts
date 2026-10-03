import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent } from "vue";
import { NqResizableHandle, NqResizablePanel, NqResizablePanelGroup, parseSize } from ".";
import { NasaqProvider } from "../../provider";

const Demo = defineComponent({
  components: { NqResizableHandle, NqResizablePanel, NqResizablePanelGroup },
  props: { orientation: { type: String, default: "horizontal" }, grip: Boolean },
  template: `<NqResizablePanelGroup :orientation="orientation" class="h-72"><NqResizablePanel id="nav" default-size="30%" min-size="15%">Nav</NqResizablePanel>
    <NqResizableHandle :with-grip="grip" /><NqResizablePanel id="main" default-size="70%">Main</NqResizablePanel></NqResizablePanelGroup>`,
});

describe("NqResizable", () => {
  it("renders the group, panels and a labelled separator with the React classes", async () => {
    const w = mount(Demo, { props: { grip: true }, attachTo: document.body });
    await flushPromises();
    expect(w.find('[data-slot="resizable-group"]').classes()).toEqual(expect.arrayContaining(["size-full", "h-72"]));
    expect(w.findAll('[data-slot="resizable-panel"]')).toHaveLength(2);
    expect(w.find('[data-slot="resizable-panel"]').classes()).toContain("min-w-0");
    const handle = w.find('[data-slot="resizable-handle"]');
    expect(handle.attributes("role")).toBe("separator");
    expect(handle.attributes("aria-label")).toBe("Resize panels");
    expect(handle.attributes("data-separator")).toBe("inactive");
    expect(handle.attributes("data-orientation")).toBe("horizontal");
    expect(handle.classes()).toEqual(expect.arrayContaining(["w-px", "bg-border"]));
    expect(w.find('[data-slot="resizable-grip"]').classes()).toEqual(expect.arrayContaining(["h-6", "w-3"]));
    w.unmount();
  });

  it("vertical groups use the horizontal-rule classes and the Arabic label", async () => {
    const App = defineComponent({
      components: { NasaqProvider, Demo },
      template: `<NasaqProvider target="scope" default-locale="ar"><Demo orientation="vertical" grip /></NasaqProvider>`,
    });
    const w = mount(App, { attachTo: document.body });
    await flushPromises();
    const handle = w.find('[data-slot="resizable-handle"]');
    expect(handle.classes()).toContain("h-px");
    expect(handle.attributes("aria-label")).toBe("تغيير حجم اللوحات");
    expect(w.find('[data-slot="resizable-grip"]').classes()).toEqual(expect.arrayContaining(["h-3", "w-6"]));
    w.unmount();
  });

  it("parses sizes", () => {
    expect(parseSize("30%")).toEqual({ value: 30, unit: "%" });
    expect(parseSize("20rem")).toEqual({ value: 320, unit: "px" });
    expect(parseSize(240)).toEqual({ value: 240, unit: "px" });
    expect(parseSize(undefined)).toBeUndefined();
  });
});
