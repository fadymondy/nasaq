import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, ref } from "vue";
import {
  NqDropdownMenu,
  NqDropdownMenuCheckboxItem,
  NqDropdownMenuContent,
  NqDropdownMenuGroup,
  NqDropdownMenuItem,
  NqDropdownMenuLabel,
  NqDropdownMenuRadioGroup,
  NqDropdownMenuRadioItem,
  NqDropdownMenuSeparator,
  NqDropdownMenuTrigger,
} from ".";

const Demo = defineComponent({
  components: { NqDropdownMenu, NqDropdownMenuCheckboxItem, NqDropdownMenuContent, NqDropdownMenuGroup, NqDropdownMenuItem, NqDropdownMenuLabel, NqDropdownMenuRadioGroup, NqDropdownMenuRadioItem, NqDropdownMenuSeparator, NqDropdownMenuTrigger },
  setup: () => ({ picked: ref(""), checked: ref(false), radio: ref("a") }),
  methods: { pick(n: string) { this.picked = n; } },
  template: `<NqDropdownMenu><NqDropdownMenuTrigger>Actions</NqDropdownMenuTrigger>
    <NqDropdownMenuContent><NqDropdownMenuGroup><NqDropdownMenuLabel>Doc</NqDropdownMenuLabel>
    <NqDropdownMenuItem shortcut="E" @select="pick('edit')">Edit</NqDropdownMenuItem>
    <NqDropdownMenuItem variant="danger" @select="pick('del')">Delete</NqDropdownMenuItem></NqDropdownMenuGroup>
    <NqDropdownMenuSeparator />
    <NqDropdownMenuCheckboxItem v-model="checked">Pin</NqDropdownMenuCheckboxItem>
    <NqDropdownMenuRadioGroup v-model="radio"><NqDropdownMenuRadioItem value="a">A</NqDropdownMenuRadioItem><NqDropdownMenuRadioItem value="b">B</NqDropdownMenuRadioItem></NqDropdownMenuRadioGroup>
    </NqDropdownMenuContent></NqDropdownMenu><p id="out">{{ picked }}|{{ checked }}|{{ radio }}</p>`,
});

afterEach(() => {
  document.body.innerHTML = "";
});

async function open(w: ReturnType<typeof mount>) {
  const trigger = w.find('[data-slot="dropdown-menu-trigger"]');
  await trigger.trigger("click", { button: 0, ctrlKey: false });
  await flushPromises();
  return trigger;
}

describe("NqDropdownMenu", () => {
  it("opens with the React classes, slots and attributes", async () => {
    const w = mount(Demo, { attachTo: document.body });
    await flushPromises();
    const trigger = await open(w);
    expect(trigger.attributes("data-popup-open")).toBe("");
    const content = document.querySelector<HTMLElement>('[data-slot="dropdown-menu-content"]')!;
    expect(content.className).toContain("rounded-floating");
    expect(content.hasAttribute("data-open")).toBe(true);
    const items = [...document.querySelectorAll<HTMLElement>('[data-slot="dropdown-menu-item"]')];
    expect(items).toHaveLength(2);
    expect(items[0]!.getAttribute("role")).toBe("menuitem");
    expect(items[1]!.getAttribute("data-variant")).toBe("danger");
    expect(items[1]!.className).toContain("text-nq-danger-text");
    expect(items[0]!.querySelector('[data-slot="dropdown-menu-shortcut"]')!.getAttribute("dir")).toBe("ltr");
    expect(document.querySelector('[data-slot="dropdown-menu-separator"]')).not.toBeNull();
    expect(document.querySelector('[data-slot="dropdown-menu-label"]')!.textContent).toBe("Doc");
    expect(document.querySelector('[data-slot="dropdown-menu-group"]')!.getAttribute("aria-labelledby")).toBe(document.querySelector('[data-slot="dropdown-menu-label"]')!.id);
    w.unmount();
  });

  it("selects an item and closes", async () => {
    const w = mount(Demo, { attachTo: document.body });
    await flushPromises();
    await open(w);
    const item = document.querySelectorAll<HTMLElement>('[data-slot="dropdown-menu-item"]')[0]!;
    item.click();
    await flushPromises();
    expect(document.querySelector("#out")!.textContent).toContain("edit");
    w.unmount();
  });

  it("toggles checkbox and radio items without closing", async () => {
    const w = mount(Demo, { attachTo: document.body });
    await flushPromises();
    await open(w);
    const cb = document.querySelector<HTMLElement>('[data-slot="dropdown-menu-checkbox-item"]')!;
    expect(cb.getAttribute("role")).toBe("menuitemcheckbox");
    expect(cb.hasAttribute("data-unchecked")).toBe(true);
    cb.click();
    await flushPromises();
    expect(document.querySelector("#out")!.textContent).toContain("|true|");
    expect(document.querySelector('[data-slot="dropdown-menu-content"]')).not.toBeNull();
    const radios = document.querySelectorAll<HTMLElement>('[data-slot="dropdown-menu-radio-item"]');
    expect(radios[0]!.hasAttribute("data-checked")).toBe(true);
    radios[1]!.click();
    await flushPromises();
    expect(document.querySelector("#out")!.textContent).toContain("|b");
    w.unmount();
  });

  it("fades in with data-starting-style and out with data-ending-style, then unmounts", async () => {
    const style = document.createElement("style");
    style.textContent = "[data-slot=dropdown-menu-content]{transition-duration:60ms}";
    document.head.append(style);
    const w = mount(Demo, { attachTo: document.body });
    await flushPromises();
    const seen: string[] = [];
    const mo = new MutationObserver((list) => {
      for (const m of list) {
        const el = m.target as HTMLElement;
        if (m.attributeName && el.getAttribute?.("data-slot") === "dropdown-menu-content") seen.push(`${m.attributeName}=${m.oldValue === null ? "added" : "changed"}`);
      }
    });
    mo.observe(document.body, { attributes: true, attributeOldValue: true, subtree: true });
    await open(w);
    const content = () => document.querySelector<HTMLElement>('[data-slot="dropdown-menu-content"]');
    await new Promise((r) => setTimeout(r, 80));
    expect(content()!.hasAttribute("data-starting-style")).toBe(false);
    expect(content()!.hasAttribute("data-ending-style")).toBe(false);
    await Promise.resolve();
    expect(seen.filter((s) => s.startsWith("data-starting-style")), seen.join()).not.toHaveLength(0);
    expect(content()!.hasAttribute("data-starting-style")).toBe(false);
    document.querySelectorAll<HTMLElement>('[data-slot="dropdown-menu-item"]')[0]!.click();
    await flushPromises();
    expect(content()).not.toBeNull();
    expect(content()!.hasAttribute("data-ending-style")).toBe(true);
    expect(content()!.hasAttribute("data-closed")).toBe(true);
    await new Promise((r) => setTimeout(r, 200));
    await flushPromises();
    expect(content()).toBeNull();
    mo.disconnect();
    style.remove();
    w.unmount();
  });
});
