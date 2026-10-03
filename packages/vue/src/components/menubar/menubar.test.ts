import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, ref } from "vue";
import {
  NqMenubar,
  NqMenubarCheckboxItem,
  NqMenubarContent,
  NqMenubarGroup,
  NqMenubarItem,
  NqMenubarLabel,
  NqMenubarMenu,
  NqMenubarRadioGroup,
  NqMenubarRadioItem,
  NqMenubarSeparator,
  NqMenubarTrigger,
} from ".";

const Demo = defineComponent({
  components: { NqMenubar, NqMenubarCheckboxItem, NqMenubarContent, NqMenubarGroup, NqMenubarItem, NqMenubarLabel, NqMenubarMenu, NqMenubarRadioGroup, NqMenubarRadioItem, NqMenubarSeparator, NqMenubarTrigger },
  setup: () => ({ picked: ref(""), checked: ref(false), radio: ref("a") }),
  methods: { pick(n: string) { this.picked = n; } },
  template: `<NqMenubar aria-label="App"><NqMenubarMenu><NqMenubarTrigger>File</NqMenubarTrigger>
    <NqMenubarContent><NqMenubarGroup><NqMenubarLabel>Doc</NqMenubarLabel>
    <NqMenubarItem :shortcut="['Ctrl','N']" @select="pick('new')">New</NqMenubarItem>
    <NqMenubarItem variant="danger" shortcut="Q" @select="pick('quit')">Quit</NqMenubarItem></NqMenubarGroup>
    <NqMenubarSeparator />
    <NqMenubarCheckboxItem v-model="checked">Pin</NqMenubarCheckboxItem>
    <NqMenubarRadioGroup v-model="radio"><NqMenubarRadioItem value="a">A</NqMenubarRadioItem><NqMenubarRadioItem value="b">B</NqMenubarRadioItem></NqMenubarRadioGroup>
    </NqMenubarContent></NqMenubarMenu></NqMenubar><p id="out">{{ picked }}|{{ checked }}|{{ radio }}</p>`,
});

afterEach(() => {
  document.body.innerHTML = "";
});

async function open(w: ReturnType<typeof mount>) {
  const trigger = w.find('[data-slot="menubar-trigger"]');
  await trigger.trigger("pointerdown", { button: 0, ctrlKey: false });
  await flushPromises();
  return trigger;
}

describe("NqMenubar", () => {
  it("renders the bar and trigger classes", async () => {
    const w = mount(Demo, { attachTo: document.body });
    await flushPromises();
    expect(w.find('[data-slot="menubar"]').classes()).toContain("rounded-control");
    expect(w.find('[data-slot="menubar-trigger"]').classes()).toContain("h-full");
    w.unmount();
  });

  it("opens with the React slots and attributes", async () => {
    const w = mount(Demo, { attachTo: document.body });
    await flushPromises();
    const trigger = await open(w);
    expect(trigger.attributes("data-popup-open")).toBe("");
    const content = document.querySelector<HTMLElement>('[data-slot="menubar-content"]')!;
    expect(content.className).toContain("min-w-56");
    expect(content.hasAttribute("data-open")).toBe(true);
    const items = [...document.querySelectorAll<HTMLElement>('[data-slot="menubar-item"]')];
    expect(items).toHaveLength(2);
    expect(items[1]!.getAttribute("data-variant")).toBe("danger");
    const sc = items[0]!.querySelector('[data-slot="menubar-shortcut"]')!;
    expect(sc.getAttribute("dir")).toBe("ltr");
    expect(sc.querySelectorAll('[data-slot="kbd"]')).toHaveLength(2);
    expect(document.querySelector('[data-slot="menubar-separator"]')).not.toBeNull();
    expect(document.querySelector('[data-slot="menubar-group"]')!.getAttribute("aria-labelledby")).toBe(document.querySelector('[data-slot="menubar-label"]')!.id);
    w.unmount();
  });

  it("selecting an item runs the handler and closes the menu", async () => {
    const w = mount(Demo, { attachTo: document.body });
    await flushPromises();
    await open(w);
    document.querySelector<HTMLElement>('[data-slot="menubar-item"]')!.click();
    await flushPromises();
    expect(w.find("#out").text().startsWith("new")).toBe(true);
    w.unmount();
  });
});
