import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, ref } from "vue";
import { NqSelect, NqSelectContent, NqSelectGroup, NqSelectItem, NqSelectLabel, NqSelectSeparator, NqSelectTrigger, NqSelectValue } from ".";

const Demo = defineComponent({
  components: { NqSelect, NqSelectContent, NqSelectGroup, NqSelectItem, NqSelectLabel, NqSelectSeparator, NqSelectTrigger, NqSelectValue },
  props: { invalid: Boolean },
  setup: () => ({ value: ref("bug") }),
  template: `<NqSelect v-model="value" name="type"><NqSelectTrigger class="max-w-xs" :invalid="invalid"><NqSelectValue placeholder="Pick" /></NqSelectTrigger>
    <NqSelectContent><NqSelectGroup><NqSelectLabel>Kinds</NqSelectLabel>
    <NqSelectItem value="bug">Bug</NqSelectItem><NqSelectItem value="feature">Feature request</NqSelectItem><NqSelectItem value="gone" disabled>Gone</NqSelectItem>
    </NqSelectGroup><NqSelectSeparator /></NqSelectContent></NqSelect><p id="out">{{ value }}</p>`,
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("NqSelect", () => {
  it("shows the selected label on the trigger with the React classes", async () => {
    const w = mount(Demo, { attachTo: document.body });
    await flushPromises();
    const trigger = w.find('[data-slot="select-trigger"]');
    expect(trigger.attributes("role")).toBe("combobox");
    expect(trigger.classes()).toEqual(expect.arrayContaining(["h-control", "rounded-control", "max-w-xs"]));
    expect(trigger.attributes("data-popup-open")).toBeUndefined();
    expect(w.find('[data-slot="select-value"]').text()).toBe("Bug");
    expect(w.find('[data-slot="select-value"]').attributes("data-placeholder")).toBeUndefined();
    w.unmount();
  });

  it("opens, picks an item and closes", async () => {
    const w = mount(Demo, { attachTo: document.body });
    await flushPromises();
    const trigger = w.find('[data-slot="select-trigger"]');
    await trigger.trigger("pointerdown", { button: 0, ctrlKey: false, pointerType: "mouse" });
    await flushPromises();
    expect(trigger.attributes("data-popup-open")).toBe("");
    const content = document.querySelector<HTMLElement>('[data-slot="select-content"]')!;
    expect(content).not.toBeNull();
    expect(content.className).toContain("rounded-floating");
    expect(content.hasAttribute("data-open")).toBe(true);
    expect(document.querySelector('[data-slot="select-label"]')!.textContent).toBe("Kinds");
    expect(document.querySelector('[data-slot="select-separator"]')).not.toBeNull();
    const items = [...document.querySelectorAll<HTMLElement>('[data-slot="select-item"]')];
    expect(items).toHaveLength(3);
    expect(items[0]!.getAttribute("aria-selected")).toBe("true");
    expect(items[2]!.hasAttribute("data-disabled")).toBe(true);
    items[1]!.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerType: "mouse" }));
    await flushPromises();
    expect(document.querySelector("#out")!.textContent).toBe("feature");
    expect(w.find('[data-slot="select-value"]').text()).toBe("Feature request");
    w.unmount();
  });

  it("marks the trigger invalid", async () => {
    const d = mount(Demo, { props: { invalid: true }, attachTo: document.body });
    await flushPromises();
    expect(d.find('[data-slot="select-trigger"]').attributes("data-invalid")).toBe("");
    d.unmount();
  });

  it("marks the chosen item data-selected and the focused one data-highlighted", async () => {
    const w = mount(Demo, { attachTo: document.body });
    await flushPromises();
    await w.find('[data-slot="select-trigger"]').trigger("pointerdown", { button: 0, ctrlKey: false, pointerType: "mouse" });
    await flushPromises();
    const items = [...document.querySelectorAll<HTMLElement>('[data-slot="select-item"]')];
    expect(items[0]!.hasAttribute("data-selected")).toBe(true);
    expect(items[1]!.hasAttribute("data-selected")).toBe(false);
    expect(items[0]!.hasAttribute("data-highlighted")).toBe(true);
    expect(items[1]!.hasAttribute("data-highlighted")).toBe(false);
    items[1]!.focus();
    await flushPromises();
    expect(items[1]!.hasAttribute("data-highlighted")).toBe(true);
    expect(items[0]!.hasAttribute("data-highlighted")).toBe(false);
    w.unmount();
  });

  it("enters with data-starting-style and exits with data-ending-style before unmounting", async () => {
    const style = document.createElement("style");
    style.textContent = '[data-slot="select-content"]{transition-duration:150ms}';
    document.head.append(style);
    let sawStarting = false;
    let sawEnding = false;
    const watcher = new MutationObserver((records) => {
      for (const r of records) if (r.attributeName === "data-starting-style" && (r.target as Element).hasAttribute("data-starting-style")) sawStarting = true;
      for (const r of records) if (r.attributeName === "data-ending-style" && (r.target as Element).hasAttribute("data-ending-style")) sawEnding = true;
    });
    watcher.observe(document.body, { attributes: true, subtree: true });
    const w = mount(Demo, { attachTo: document.body });
    await flushPromises();
    const trigger = w.find('[data-slot="select-trigger"]');
    await trigger.trigger("pointerdown", { button: 0, ctrlKey: false, pointerType: "mouse" });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 80));
    const content = document.querySelector<HTMLElement>('[data-slot="select-content"]')!;
    expect(sawStarting).toBe(true);
    expect(content.hasAttribute("data-starting-style")).toBe(false);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    content.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await flushPromises();
    watcher.disconnect();
    expect(sawEnding).toBe(true);
    await new Promise((r) => setTimeout(r, 300));
    expect(document.querySelector('[data-slot="select-content"]')).toBeNull();
    w.unmount();
    style.remove();
  });
});
