import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h, ref } from "vue";
import { NasaqProvider } from "../../provider";
import { NqRepeater } from ".";
import { dropIndex, keyTarget, moveItem, shiftFor } from "./repeater-math";

const mounted: Array<{ unmount: () => void }> = [];
afterEach(() => {
  for (const w of mounted.splice(0)) w.unmount();
  document.body.innerHTML = "";
});

type Row = { name: string };

function make(extra: Record<string, unknown> = {}, initial: Row[] = [{ name: "Sara" }, { name: "Omar" }], locale?: string) {
  const rows = ref<Row[]>(initial);
  const Host = defineComponent({
    setup: () => () =>
      h(NasaqProvider, { locale: locale ?? "en" }, () =>
        h(
          NqRepeater<Row>,
          {
            modelValue: rows.value,
            "onUpdate:modelValue": (v: Row[]) => (rows.value = v),
            createItem: () => ({ name: "" }),
            rowTitle: (r: Row) => r.name,
            ...extra,
          },
          { default: ({ item, update }: { item: Row; update: (n: Row) => void }) => h("input", { value: item.name, onInput: (e: Event) => update({ name: (e.target as HTMLInputElement).value }) }) },
        ),
      ),
  });
  const w = mount(Host, { attachTo: document.body });
  mounted.push(w);
  return { rows, w };
}

const rowEls = (w: ReturnType<typeof mount>) => w.findAll('[data-slot="repeater-row"]');
const titles = (w: ReturnType<typeof mount>) => rowEls(w).map((r) => r.find("button[aria-expanded] span, [data-slot=repeater-row-header] span").text());

describe("repeater math", () => {
  it("moves, targets keys and picks the closest drop slot", () => {
    expect(moveItem(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
    expect(keyTarget("ArrowUp", 0, 3)).toBe(0);
    expect(keyTarget("End", 0, 3)).toBe(2);
    expect(keyTarget("x", 0, 3)).toBeNull();
    expect(dropIndex([10, 60, 110], 0, 55)).toBe(1);
    expect(dropIndex([10, 60, 110], 2, -100)).toBe(0);
    expect(shiftFor(1, 0, 2, 50)).toBe(-50);
    expect(shiftFor(0, 2, 0, 50)).toBe(50);
  });
});

describe("NqRepeater", () => {
  it("renders a row per item with the title, count and a labelled list", () => {
    const { w } = make();
    expect(w.find('[data-slot="repeater"]').exists()).toBe(true);
    expect(rowEls(w)).toHaveLength(2);
    expect(w.find("ol").attributes("aria-label")).toBe("Items");
    expect(w.find('[data-slot="repeater-count"]').text()).toBe("2 items");
    expect(w.text()).toContain("Sara");
  });

  it("adds a row, announces it and respects max", async () => {
    const { w, rows } = make({ max: 3 });
    const add = w.findAll("button").find((b) => b.text() === "Add item")!;
    await add.trigger("click");
    await flushPromises();
    expect(rows.value).toHaveLength(3);
    expect(w.find('[role="status"]').text()).toContain("added");
    expect(add.attributes("disabled")).toBeDefined();
    expect(w.text()).toContain("Limit of 3 reached.");
  });

  it("removes a row but not below min", async () => {
    const { w, rows } = make({ min: 1 });
    await w.find('button[aria-label="Remove Sara"]').trigger("click");
    expect(rows.value.map((r) => r.name)).toEqual(["Omar"]);
    await flushPromises();
    expect(w.find('button[aria-label="Remove Omar"]').attributes("disabled")).toBeDefined();
  });

  it("duplicates a row after the source", async () => {
    const { w, rows } = make();
    await w.find('button[aria-label="Duplicate Sara"]').trigger("click");
    expect(rows.value.map((r) => r.name)).toEqual(["Sara", "Sara", "Omar"]);
  });

  it("edits a row through update()", async () => {
    const { w, rows } = make();
    const input = w.findAll("input")[0]!;
    await input.setValue("Layla");
    expect(rows.value[0]!.name).toBe("Layla");
  });

  it("reorders with the keyboard on the handle and announces the new position", async () => {
    const { w, rows } = make();
    await w.find('button[aria-label="Reorder Sara"]').trigger("keydown", { key: "ArrowDown" });
    await flushPromises();
    expect(rows.value.map((r) => r.name)).toEqual(["Omar", "Sara"]);
    expect(w.find('[role="status"]').text()).toBe("Sara moved to position 2 of 2");
    await w.find('button[aria-label="Reorder Omar"]').trigger("keydown", { key: "End" });
    expect(rows.value.map((r) => r.name)).toEqual(["Sara", "Omar"]);
  });

  it("reorders with native pointer events", async () => {
    const { w, rows } = make();
    const els = rowEls(w).map((r) => r.element as HTMLElement);
    els.forEach((el, i) => (el.getBoundingClientRect = () => ({ top: i * 60, bottom: i * 60 + 50, height: 50, left: 0, right: 100, width: 100, x: 0, y: i * 60, toJSON() {} }) as DOMRect));
    const handle = w.find('button[aria-label="Reorder Sara"]');
    const ev = (type: string, y: number) => {
      const e = new Event(type, { bubbles: true, cancelable: true }) as Event & Record<string, unknown>;
      Object.assign(e, { clientY: y, pointerId: 1, pointerType: "touch", button: 0 });
      return e;
    };
    handle.element.dispatchEvent(ev("pointerdown", 25));
    window.dispatchEvent(ev("pointermove", 70));
    await flushPromises();
    expect(rowEls(w)[0]!.attributes("data-dragging")).toBe("true");
    window.dispatchEvent(ev("pointerup", 70));
    await flushPromises();
    expect(rows.value.map((r) => r.name)).toEqual(["Omar", "Sara"]);
    expect(rowEls(w)[0]!.attributes("data-dragging")).toBeUndefined();
  });

  it("collapses a row and all rows", async () => {
    const { w } = make();
    const toggle = w.find('button[aria-label="Collapse Sara"]');
    expect(toggle.attributes("aria-expanded")).toBe("true");
    await toggle.trigger("click");
    expect(rowEls(w)[0]!.attributes("data-collapsed")).toBe("true");
    expect(w.find('button[aria-label="Expand Sara"]').attributes("aria-expanded")).toBe("false");
    await w.findAll("button").find((b) => b.text() === "Collapse all")!.trigger("click");
    expect(rowEls(w).every((r) => r.attributes("data-collapsed") === "true")).toBe(true);
    expect(w.text()).toContain("Expand all");
  });

  it("shows the empty state", () => {
    const { w } = make({}, []);
    expect(w.find('[data-slot="repeater-empty"]').text()).toBe("No items yet.");
  });

  it("speaks Arabic with Arabic digits", () => {
    const { w } = make({ rowTitle: undefined }, [{ name: "a" }, { name: "b" }], "ar");
    expect(w.text()).toContain("إضافة عنصر");
    expect(w.find("ol").attributes("aria-label")).toBe("العناصر");
    expect(w.find('[data-slot="repeater-count"]').text()).toContain("عناصر");
  });

  it("disables everything when disabled", () => {
    const { w } = make({ disabled: true });
    expect(w.find('[data-slot="repeater"]').attributes("data-disabled")).toBe("true");
    expect(w.find('button[aria-label="Remove Sara"]').attributes("disabled")).toBeDefined();
  });
});
