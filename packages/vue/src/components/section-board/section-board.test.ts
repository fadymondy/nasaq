import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref } from "vue";
import { NasaqProvider } from "../../provider";
import { boardSectionChanged, duplicateSectionSettingKeys, NqSectionBoard, sectionDropIndex, sectionSettingRows, sectionSettingsFromRows, type BoardSection } from ".";

const mounted: Array<{ unmount: () => void }> = [];
afterEach(() => {
  for (const w of mounted.splice(0)) w.unmount();
  document.body.innerHTML = "";
});

const sections = (): BoardSection[] => [
  { id: "a", title: "News", badge: "Daily", prompt: "Summarise the news", model: "fast", settings: { topic: "tech" }, content: "Headlines" },
  { id: "b", title: "Weather", content: "Sunny" },
  { id: "c", title: "Sport" },
];
const models = [{ value: "fast", label: "Fast" }, { value: "deep", label: "Deep reasoning" }];

function make(extra: Record<string, unknown> = {}, locale = "en") {
  const list = ref<BoardSection[]>(sections());
  const onChange = vi.fn((next: BoardSection[]) => (list.value = next));
  const Host = defineComponent({
    setup: () => () => h(NasaqProvider, { locale }, () => h(NqSectionBoard, { sections: list.value, onChange, models, ...extra })),
  });
  const w = mount(Host, { attachTo: document.body });
  mounted.push(w);
  return { list, onChange, w };
}

const items = (w: ReturnType<typeof mount>) => w.findAll('[data-slot="section-board-section"]');
const names = (w: ReturnType<typeof mount>) => items(w).map((li) => li.attributes("data-section"));

describe("section-board logic", () => {
  it("round-trips settings rows and flags repeated keys", () => {
    expect(sectionSettingRows({ a: "1" })).toEqual([{ key: "a", value: "1" }]);
    expect(sectionSettingsFromRows([{ key: " a ", value: "1" }, { key: "", value: "x" }, { key: "a", value: "2" }])).toEqual({ a: "2" });
    expect([...duplicateSectionSettingKeys([{ key: "a", value: "" }, { key: "a ", value: "" }, { key: "b", value: "" }])]).toEqual(["a"]);
  });
  it("detects edits", () => {
    const a = sections()[0]!;
    expect(boardSectionChanged(a, { ...a })).toBe(false);
    expect(boardSectionChanged(a, { ...a, prompt: "x" })).toBe(true);
    expect(boardSectionChanged(a, { ...a, settings: { topic: "sport" } })).toBe(true);
  });
  it("picks the closest centre in a grid", () => {
    const c = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 0, y: 100 }, { x: 100, y: 100 }];
    expect(sectionDropIndex(c, 0, 90, 5)).toBe(1);
    expect(sectionDropIndex(c, 0, 10, 95)).toBe(2);
    expect(sectionDropIndex(c, 3, -90, -90)).toBe(0);
    expect(sectionDropIndex(c, 1, 1, 1)).toBe(1);
  });
});

describe("NqSectionBoard", () => {
  it("view mode shows only titles, tags and content", () => {
    const { w } = make({ editing: false });
    expect(w.find('[data-slot="section-board"]').attributes("data-editing")).toBeUndefined();
    expect(w.find("ol").attributes("aria-label")).toBe("Sections");
    expect(names(w)).toEqual(["a", "b", "c"]);
    expect(w.find("h3").text()).toBe("News");
    expect(w.text()).toContain("Daily");
    expect(w.text()).toContain("Headlines");
    expect(w.text()).toContain("Nothing to show yet.");
    expect(w.find('[aria-label="Edit News"]').exists()).toBe(false);
    expect(w.find('[data-slot="section-board-prompt"]').exists()).toBe(false);
    expect(w.find('[data-slot="section-board-content"]').attributes("inert")).toBeUndefined();
  });

  it("without onChange it stays read only even when editing", () => {
    const w = mount(NasaqProvider, { slots: { default: () => h(NqSectionBoard, { sections: sections(), editing: true }) }, attachTo: document.body });
    mounted.push(w);
    expect(w.find('[data-slot="section-board"]').attributes("data-editing")).toBeUndefined();
    expect(w.find('[aria-label="Remove News"]').exists()).toBe(false);
  });

  it("edit mode adds handles, edit and remove, the prompt footer and inert content", () => {
    const { w } = make({ editing: true });
    expect(w.find('[data-slot="section-board"]').attributes("data-editing")).toBe("true");
    expect(w.find('[aria-label="Move News"]').exists()).toBe(true);
    expect(w.find('[aria-label="Edit News"]').exists()).toBe(true);
    expect(w.find('[aria-label="Remove News"]').exists()).toBe(true);
    expect(w.find('[data-slot="section-board-content"]').attributes("inert")).toBeDefined();
    const footer = w.find('[data-slot="section-board-prompt"]');
    expect(footer.text()).toContain("Fast");
    expect(footer.text()).toContain("Summarise the news");
  });

  it("the arrow keys move a section and announce the new position", async () => {
    const { w, onChange } = make({ editing: true });
    await w.find('[aria-label="Move News"]').trigger("keydown", { key: "ArrowDown" });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(names(w)).toEqual(["b", "a", "c"]);
    expect(w.find('[role="status"]').text()).toBe("News is now at position 2 of 3");
    await w.find('[aria-label="Move News"]').trigger("keydown", { key: "End" });
    expect(names(w)).toEqual(["b", "c", "a"]);
    await w.find('[aria-label="Move News"]').trigger("keydown", { key: "End" });
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("dragging the handle onto another section reorders", async () => {
    const { w, onChange } = make({ editing: true });
    const rects = [10, 110, 210];
    items(w).forEach((li, i) => {
      li.element.getBoundingClientRect = () => ({ left: 0, top: rects[i]!, width: 100, height: 80, right: 100, bottom: rects[i]! + 80, x: 0, y: rects[i]!, toJSON: () => ({}) });
    });
    const handle = w.find('[aria-label="Move News"]');
    await handle.trigger("pointerdown", { clientX: 10, clientY: 20, pointerId: 1, button: 0, pointerType: "mouse" });
    window.dispatchEvent(new PointerEvent("pointermove", { clientX: 10, clientY: 215, pointerId: 1 }));
    await flushPromises();
    expect(items(w)[0]!.attributes("data-dragging")).toBe("true");
    expect(items(w)[2]!.attributes("data-over")).toBe("");
    window.dispatchEvent(new PointerEvent("pointerup", { clientX: 10, clientY: 215, pointerId: 1 }));
    await flushPromises();
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(names(w)).toEqual(["b", "c", "a"]);
  });

  it("remove drops the section", async () => {
    const { w, list } = make({ editing: true });
    await w.find('[aria-label="Remove Weather"]').trigger("click");
    expect(list.value.map((s) => s.id)).toEqual(["a", "c"]);
    expect(w.find('[role="status"]').text()).toBe("Weather removed");
  });

  it("the editor edits a section and Save stays off until something changed", async () => {
    const { w, list } = make({ editing: true });
    await w.find('[aria-label="Edit News"]').trigger("click");
    await flushPromises();
    const dialog = document.body.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog).not.toBeNull();
    const save = [...dialog.querySelectorAll("button")].find((b) => b.textContent!.trim() === "Save")!;
    expect(save.hasAttribute("disabled")).toBe(true);
    const title = dialog.querySelector<HTMLInputElement>("input")!;
    expect(title.value).toBe("News");
    title.value = "Headlines";
    title.dispatchEvent(new Event("input", { bubbles: true }));
    await flushPromises();
    expect(save.hasAttribute("disabled")).toBe(false);
    dialog.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await flushPromises();
    expect(list.value[0]!.title).toBe("Headlines");
    expect(list.value[0]!.settings).toEqual({ topic: "tech" });
  });

  it("the editor flags a missing title and repeated keys", async () => {
    const { w, list } = make({ editing: true });
    await w.find('[aria-label="Edit News"]').trigger("click");
    await flushPromises();
    const dialog = document.body.querySelector<HTMLElement>('[role="dialog"]')!;
    const setting = () => dialog.querySelectorAll<HTMLInputElement>('[data-slot="section-board-setting"] input');
    const add = [...dialog.querySelectorAll("button")].find((b) => b.textContent!.trim() === "Add setting")!;
    add.click();
    await flushPromises();
    const keyInput = setting()[2]!;
    keyInput.value = "topic";
    keyInput.dispatchEvent(new Event("input", { bubbles: true }));
    await flushPromises();
    expect(dialog.textContent).toContain('"topic" is used more than once');
    const save = [...dialog.querySelectorAll("button")].find((b) => b.textContent!.trim() === "Save")!;
    expect(save.hasAttribute("disabled")).toBe(true);
    expect(list.value[0]!.title).toBe("News");
  });

  it("onAdd shows the Add section button; an empty board shows the empty state", async () => {
    const onAdd = vi.fn();
    const { w } = make({ editing: true, onAdd });
    await w.findAll("button").find((b) => b.text() === "Add section")!.trigger("click");
    expect(onAdd).toHaveBeenCalled();
    const empty = mount(NasaqProvider, { slots: { default: () => h(NqSectionBoard, { sections: [] }) }, attachTo: document.body });
    mounted.push(empty);
    expect(empty.text()).toContain("No sections");
  });

  it("columns=2, a custom content slot, heading level and Arabic", () => {
    const { w } = make({ columns: 2, headingAs: "h2" }, "ar");
    expect(w.find("ol").classes()).toContain("sm:grid-cols-2");
    expect(w.find("h2").exists()).toBe(true);
    expect(w.find("ol").attributes("aria-label")).toBe("الأقسام");
    const slotted = mount(NasaqProvider, {
      slots: { default: () => h(NqSectionBoard, { sections: sections() }, { content: ({ section }: { section: BoardSection }) => h("em", `custom ${section.id}`) }) },
      attachTo: document.body,
    });
    mounted.push(slotted);
    expect(slotted.text()).toContain("custom a");
  });
});
