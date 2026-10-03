import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { defineComponent, ref } from "vue";
import { NqSidebarCustomize, NqSidebarSortable, NqSidebarSortableItem, useSidebarLayout } from ".";

const ITEMS = [
  { id: "home", label: "Home", required: true },
  { id: "inbox", label: "Inbox" },
  { id: "issues", label: "Issues" },
];

const Demo = defineComponent({
  components: { NqSidebarCustomize, NqSidebarSortable, NqSidebarSortableItem },
  setup() {
    const open = ref(true);
    const layout = useSidebarLayout("test-nav", ITEMS.map((i) => i.id));
    return { open, layout, ITEMS };
  },
  template: `<div>
    <NqSidebarSortable :ids="layout.visible" :on-move="layout.move">
      <div data-test="list">
        <NqSidebarSortableItem v-for="id in layout.visible" :id="id" :key="id" class="extra"><a :href="'/' + id">{{ id }}</a></NqSidebarSortableItem>
      </div>
    </NqSidebarSortable>
    <NqSidebarCustomize v-model:open="open" :sections="[{ id: 'main', items: ITEMS, layout }]" />
  </div>`,
});

const order = (w: ReturnType<typeof mount>) => w.findAll('[data-slot="sidebar-sortable-item"]').map((e) => e.attributes("data-sortable-id"));
const handles = () => [...document.querySelectorAll<HTMLButtonElement>('button[aria-keyshortcuts]')];
const wait = (ms = 30) => new Promise((r) => setTimeout(r, ms));

beforeEach(() => localStorage.clear());
afterEach(() => (document.body.innerHTML = ""));

describe("NqSidebarSortableItem", () => {
  it("renders the React markup and merges the class", async () => {
    const w = mount(Demo, { attachTo: document.body });
    await flushPromises();
    const item = w.find('[data-slot="sidebar-sortable-item"]');
    expect(item.classes()).toEqual(expect.arrayContaining(["relative", "extra", "data-dragging:z-10"]));
    expect(order(w)).toEqual(["home", "inbox", "issues"]);
    w.unmount();
  });

  it("drags an item to a new place with the pointer", async () => {
    const w = mount(Demo, { attachTo: document.body });
    await flushPromises();
    const els = w.findAll('[data-slot="sidebar-sortable-item"]').map((e) => e.element as HTMLElement);
    els.forEach((el, i) => {
      el.getClientRects = () => [{}] as unknown as DOMRectList;
      el.getBoundingClientRect = () => ({ top: i * 40, height: 40, left: 0, width: 100, right: 100, bottom: i * 40 + 40, x: 0, y: i * 40 }) as DOMRect;
    });
    const down = new MouseEvent("pointerdown", { clientX: 5, clientY: 5, button: 0, bubbles: true });
    Object.assign(down, { pointerId: 1, pointerType: "mouse" });
    els[0]!.dispatchEvent(down);
    const move = (y: number) => {
      const e = new MouseEvent("pointermove", { clientX: 5, clientY: y, bubbles: true, cancelable: true });
      Object.assign(e, { pointerId: 1, pointerType: "mouse" });
      window.dispatchEvent(e);
    };
    move(12); // past the 4px threshold: the drag starts
    expect(els[0]!.hasAttribute("data-dragging")).toBe(true);
    move(85); // centre now over the third slot
    const up = new MouseEvent("pointerup", { bubbles: true });
    Object.assign(up, { pointerId: 1, pointerType: "mouse" });
    window.dispatchEvent(up);
    await flushPromises();
    expect(order(w)).toEqual(["inbox", "issues", "home"]);
    expect(JSON.parse(localStorage.getItem("test-nav")!).order).toEqual(["inbox", "issues", "home"]);
    // the click that ends the drag is swallowed
    let clicked = false;
    els[0]!.querySelector("a")!.addEventListener("click", () => (clicked = true));
    els[0]!.querySelector("a")!.click();
    expect(clicked).toBe(false);
    w.unmount();
  });
});

describe("NqSidebarCustomize", () => {
  it("opens as a labelled dialog with a row, handle and switch per item", async () => {
    const w = mount(Demo, { attachTo: document.body });
    await flushPromises();
    const dialog = document.querySelector('[data-slot="dialog-content"]')!;
    expect(dialog.textContent).toContain("Customize sidebar");
    expect(dialog.textContent).toContain("Reset to default");
    expect(handles().map((h) => h.getAttribute("aria-label"))).toEqual(["Reorder Home", "Reorder Inbox", "Reorder Issues"]);
    const switches = [...document.querySelectorAll<HTMLElement>('[data-slot="switch"]')];
    expect(switches.map((s) => s.getAttribute("aria-label"))).toEqual(["Home", "Inbox", "Issues"]);
    expect(switches[0]!.hasAttribute("data-disabled")).toBe(true);
    expect(document.querySelector('[aria-live="polite"]')).not.toBeNull();
    w.unmount();
  });

  it("reorders with the keyboard, announces it and persists", async () => {
    const w = mount(Demo, { attachTo: document.body });
    await flushPromises();
    const key = (k: string, i: number) => handles()[i]!.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));
    key("ArrowDown", 0);
    await flushPromises();
    expect(order(w)).toEqual(["inbox", "home", "issues"]);
    expect(document.querySelector('[aria-live="polite"]')!.textContent).toBe("Home, position 2 of 3");
    key("End", 0); // Inbox is now first
    await flushPromises();
    expect(order(w)).toEqual(["home", "issues", "inbox"]);
    key("Home", 2);
    await flushPromises();
    expect(order(w)).toEqual(["inbox", "home", "issues"]);
    expect(JSON.parse(localStorage.getItem("test-nav")!).order).toEqual(["inbox", "home", "issues"]);
    w.unmount();
  });

  it("hides items from the sidebar with the switch and resets", async () => {
    const w = mount(Demo, { attachTo: document.body });
    await flushPromises();
    const reset = () => [...document.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.trim() === "Reset to default")!;
    expect(reset().disabled).toBe(true);
    (document.querySelectorAll('[data-slot="switch"]')[1] as HTMLElement).click();
    await flushPromises();
    expect(order(w)).toEqual(["home", "issues"]);
    expect(JSON.parse(localStorage.getItem("test-nav")!).hidden).toEqual(["inbox"]);
    expect(reset().disabled).toBe(false);
    reset().click();
    await flushPromises();
    expect(order(w)).toEqual(["home", "inbox", "issues"]);
    expect(localStorage.getItem("test-nav")).toBeNull();
    w.unmount();
  });

  it("closes from Done", async () => {
    const w = mount(Demo, { attachTo: document.body });
    await flushPromises();
    [...document.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.trim() === "Done")!.click();
    await flushPromises();
    await wait(250);
    expect(document.querySelector('[data-slot="dialog-content"]')).toBeNull();
    w.unmount();
  });
});

describe("useSidebarLayout", () => {
  it("normalises saved state, ignores a bad shape and honours defaultHidden", async () => {
    localStorage.setItem("a", JSON.stringify({ order: ["c", "x", "a"], hidden: ["x", "a"] }));
    localStorage.setItem("b", JSON.stringify({ nope: true }));
    const C = defineComponent({
      setup() {
        const a = useSidebarLayout("a", ["a", "b", "c", "d"], { defaultHidden: ["d"] });
        const b = useSidebarLayout("b", ["a", "b"]);
        return { a, b };
      },
      template: "<i />",
    });
    const w = mount(C);
    await flushPromises();
    const { a, b } = w.vm as unknown as { a: ReturnType<typeof useSidebarLayout>; b: ReturnType<typeof useSidebarLayout> };
    expect(a.order).toEqual(["c", "a", "b", "d"]);
    expect(a.hidden).toEqual(["a", "d"]);
    expect(a.visible).toEqual(["c", "b"]);
    expect(a.isDefault).toBe(false);
    expect(b.order).toEqual(["a", "b"]);
    expect(b.isDefault).toBe(true);
  });
});
