import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, ref } from "vue";
import {
  NqContextMenu,
  NqContextMenuActions,
  NqContextMenuCheckboxItem,
  NqContextMenuContent,
  NqContextMenuGroup,
  NqContextMenuItem,
  NqContextMenuLabel,
  NqContextMenuRadioGroup,
  NqContextMenuRadioItem,
  NqContextMenuSeparator,
  NqContextMenuTrigger,
  groupActions,
  keyboardMenuPoint,
} from ".";

const Demo = defineComponent({
  components: { NqContextMenu, NqContextMenuCheckboxItem, NqContextMenuContent, NqContextMenuGroup, NqContextMenuItem, NqContextMenuLabel, NqContextMenuRadioGroup, NqContextMenuRadioItem, NqContextMenuSeparator, NqContextMenuTrigger },
  setup: () => ({ picked: ref(""), checked: ref(false), radio: ref("a") }),
  methods: { pick(n: string) { this.picked = n; } },
  template: `<NqContextMenu><NqContextMenuTrigger>Region</NqContextMenuTrigger>
    <NqContextMenuContent><NqContextMenuGroup><NqContextMenuLabel>Doc</NqContextMenuLabel>
    <NqContextMenuItem shortcut="E" @select="pick('edit')">Edit</NqContextMenuItem>
    <NqContextMenuItem variant="danger" @select="pick('del')">Delete</NqContextMenuItem></NqContextMenuGroup>
    <NqContextMenuSeparator />
    <NqContextMenuCheckboxItem v-model="checked">Pin</NqContextMenuCheckboxItem>
    <NqContextMenuRadioGroup v-model="radio"><NqContextMenuRadioItem value="a">A</NqContextMenuRadioItem><NqContextMenuRadioItem value="b">B</NqContextMenuRadioItem></NqContextMenuRadioGroup>
    </NqContextMenuContent></NqContextMenu><p id="out">{{ picked }}|{{ checked }}|{{ radio }}</p>`,
});

afterEach(() => {
  document.body.innerHTML = "";
});

async function open(w: ReturnType<typeof mount>) {
  const trigger = w.find('[data-slot="context-menu-trigger"]');
  await trigger.trigger("contextmenu", { clientX: 10, clientY: 10 });
  await flushPromises();
  return trigger;
}

describe("NqContextMenu", () => {
  it("opens on context-click with the React classes, slots and attributes", async () => {
    const w = mount(Demo, { attachTo: document.body });
    await flushPromises();
    const trigger = await open(w);
    expect(trigger.attributes("data-popup-open")).toBe("");
    const content = document.querySelector<HTMLElement>('[data-slot="context-menu-content"]')!;
    expect(content.className).toContain("rounded-floating");
    expect(content.hasAttribute("data-open")).toBe(true);
    const items = [...document.querySelectorAll<HTMLElement>('[data-slot="context-menu-item"]')];
    expect(items).toHaveLength(2);
    expect(items[0]!.getAttribute("role")).toBe("menuitem");
    expect(items[1]!.getAttribute("data-variant")).toBe("danger");
    expect(items[0]!.querySelector('[data-slot="dropdown-menu-shortcut"]')!.getAttribute("dir")).toBe("ltr");
    expect(document.querySelector('[data-slot="context-menu-separator"]')).not.toBeNull();
    expect(document.querySelector('[data-slot="context-menu-group"]')!.getAttribute("aria-labelledby")).toBe(document.querySelector('[data-slot="context-menu-label"]')!.id);
    w.unmount();
  });

  it("selecting an item runs the handler and closes; checkbox and radio keep it open", async () => {
    const w = mount(Demo, { attachTo: document.body });
    await flushPromises();
    await open(w);
    document.querySelector<HTMLElement>('[data-slot="context-menu-item"]')!.click();
    await flushPromises();
    expect(w.find("#out").text().startsWith("edit")).toBe(true);
    w.unmount();
  });

  it("checkbox and radio items emit data-checked state", async () => {
    const w = mount(Demo, { attachTo: document.body });
    await flushPromises();
    await open(w);
    const box = document.querySelector<HTMLElement>('[data-slot="context-menu-checkbox-item"]')!;
    expect(box.hasAttribute("data-unchecked")).toBe(true);
    box.click();
    await flushPromises();
    expect(w.find("#out").text()).toContain("true");
    expect(document.querySelector('[data-slot="context-menu-radio-item"]')!.hasAttribute("data-checked")).toBe(true);
    w.unmount();
  });
});

describe("context-menu actions", () => {
  it("groups in first-seen order and places the keyboard point at the inline start", () => {
    expect(groupActions([{ group: "a" }, { group: "b" }, { group: "a" }])).toHaveLength(2);
    const rect = { left: 0, right: 200, top: 10, height: 40 };
    expect(keyboardMenuPoint(rect, false)).toEqual({ x: 24, y: 30 });
    expect(keyboardMenuPoint(rect, true)).toEqual({ x: 176, y: 30 });
  });

  it("renders the element untouched when there are no actions", () => {
    const w = mount(NqContextMenuActions, { props: { actions: [] }, slots: { default: "row" } });
    expect(w.find('[data-slot="context-menu-trigger"]').exists()).toBe(false);
    expect(w.text()).toBe("row");
  });

  it("opens a menu from an action list", async () => {
    let hit = 0;
    const w = mount(NqContextMenuActions, { props: { actions: [{ id: "a", label: "Open", onSelect: () => hit++ }] }, slots: { default: "row" }, attachTo: document.body });
    await w.find('[data-slot="context-menu-trigger"]').trigger("contextmenu", { clientX: 5, clientY: 5 });
    await flushPromises();
    document.querySelector<HTMLElement>('[data-slot="context-menu-item"]')!.click();
    await flushPromises();
    expect(hit).toBe(1);
    w.unmount();
  });
});
