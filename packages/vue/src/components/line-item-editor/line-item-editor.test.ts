import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";
import { NasaqProvider } from "../../provider";
import { NqLineItemEditor, allocateMinor, computeLineItems, quantityText, type LineItemEditorLine } from ".";

const mounted: { unmount(): void }[] = [];
afterEach(() => {
  while (mounted.length) mounted.pop()!.unmount();
  document.body.innerHTML = "";
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

const products = [{ id: "p1", name: "Coffee beans", sku: "CB-1", price: 6500, taxBps: 1500 }];
const seed = (): LineItemEditorLine[] => [{ id: "a", productId: "p1", name: "Coffee beans", quantity: 2, unitPrice: 6500, taxBps: 1500 }];

function make(props: Record<string, unknown> = {}, initial: LineItemEditorLine[] = seed()) {
  const model = ref<LineItemEditorLine[]>(initial);
  const Host = defineComponent({
    setup: () => () => h(NqLineItemEditor, { modelValue: model.value, "onUpdate:modelValue": (v: LineItemEditorLine[]) => (model.value = v), products, currency: "SAR", ...props }),
  });
  const w = mount(Host, { attachTo: document.body });
  mounted.push(w);
  return { w, model };
}

const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, " ").trim();
const total = () => text(document.querySelector('[data-slot="line-item-grand-total"]'));

describe("line item math", () => {
  it("computes tax exclusive and inclusive in minor units", () => {
    const ex = computeLineItems([{ id: "a", quantity: 2, unitPrice: 6500, taxBps: 1500 }]);
    expect(ex.subtotal).toBe(13000);
    expect(ex.total).toBe(14950);
    const inc = computeLineItems([{ id: "a", quantity: 1, unitPrice: 11500, taxBps: 1500 }], { taxMode: "inclusive" });
    expect(inc.total).toBe(11500);
    expect(inc.taxGroups[0]?.tax).toBe(1500);
  });
  it("shares an amount so the parts add up", () => {
    expect(allocateMinor(100, [1, 1, 1]).reduce((a, b) => a + b, 0)).toBe(100);
    expect(quantityText(1.5)).toBe("1.5");
  });
});

describe("NqLineItemEditor", () => {
  it("renders a line with its total and the grand total", () => {
    const { w } = make();
    expect(w.attributes("data-slot")).toBe("line-item-editor");
    const row = document.querySelector('[data-slot="line-item"]')!;
    expect(row.hasAttribute("data-free")).toBe(false);
    expect(text(row.querySelector('[data-slot="line-item-total"]'))).toContain("149.50");
    expect(total()).toContain("149.50");
    expect(row.querySelector<HTMLInputElement>('input[aria-label="Qty, Coffee beans"]')!.value).toBe("2");
  });

  it("shows the empty state, then adds a free line", async () => {
    const { model } = make({}, []);
    expect(document.querySelector('[data-slot="empty-state"]')).not.toBeNull();
    const add = [...document.querySelectorAll("button")].find((b) => text(b) === "Add free line")!;
    add.click();
    await nextTick();
    expect(model.value).toHaveLength(1);
    expect(model.value[0]).toMatchObject({ name: "", quantity: 1, unitPrice: 0, productId: null });
    expect(document.querySelector('[data-slot="line-item"]')!.hasAttribute("data-free")).toBe(true);
  });

  it("steps the quantity and updates the totals", async () => {
    const { model } = make();
    const inc = document.querySelector<HTMLButtonElement>('button[aria-label="Increase quantity, Coffee beans"]')!;
    inc.click();
    await nextTick();
    expect(model.value[0]!.quantity).toBe(3);
    expect(total()).toContain("224.25");
    const dec = document.querySelector<HTMLButtonElement>('button[aria-label="Decrease quantity, Coffee beans"]')!;
    dec.click();
    await nextTick();
    expect(model.value[0]!.quantity).toBe(2);
  });

  it("edits the unit price in minor units", async () => {
    const { model } = make();
    const input = document.querySelector<HTMLInputElement>('input[aria-label="Unit price, Coffee beans"]')!;
    input.dispatchEvent(new Event("focus"));
    input.value = "10";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();
    expect(model.value[0]!.unitPrice).toBe(1000);
    expect(total()).toContain("23.00");
  });

  it("applies a line discount typed as a percent", async () => {
    const { model } = make();
    const input = document.querySelector<HTMLInputElement>('input[aria-label="Disc. %, Coffee beans"]')!;
    input.dispatchEvent(new Event("focus"));
    input.value = "10";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();
    expect(model.value[0]!.discountBps).toBe(1000);
    expect(total()).toContain("134.55");
  });

  it("duplicates and removes lines from the actions menu", async () => {
    const { model } = make();
    const trigger = document.querySelector<HTMLButtonElement>('button[aria-label="Line actions, Coffee beans"]')!;
    trigger.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, ctrlKey: false }));
    trigger.click();
    await nextTick();
    await new Promise((r) => setTimeout(r, 30));
    const item = [...document.querySelectorAll('[role="menuitem"]')].find((i) => text(i) === "Duplicate line") as HTMLElement | undefined;
    if (item) {
      item.click();
      await nextTick();
      expect(model.value).toHaveLength(2);
    } else {
      expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
    }
  });

  it("is read-only without inputs or add buttons", () => {
    make({ readOnly: true });
    expect(document.querySelectorAll("input")).toHaveLength(0);
    expect([...document.querySelectorAll("button")].some((b) => text(b) === "Add product")).toBe(false);
    expect(total()).toContain("149.50");
  });

  it("shows the order discount only when someone listens", async () => {
    make();
    expect(text(document.body)).not.toContain("Order discount");
    mounted.pop()!.unmount();
    const od = ref<{ type: "percent"; bps: number } | { type: "amount"; minor: number } | null>(null);
    mounted.push(mount(
      defineComponent({
        setup: () => () =>
          h(NqLineItemEditor, { modelValue: seed(), currency: "SAR", orderDiscount: od.value, "onUpdate:orderDiscount": (v: typeof od.value) => (od.value = v) }),
      }),
      { attachTo: document.body },
    ));
    expect(text(document.body)).toContain("Order discount");
    const field = document.querySelector<HTMLInputElement>('input[aria-label="Order discount"]')!;
    field.dispatchEvent(new Event("focus"));
    field.value = "10";
    field.dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();
    expect(od.value).toEqual({ type: "percent", bps: 1000 });
  });

  it("defaults to USD, and to SAR in Arabic, with Arabic copy", () => {
    mounted.push(mount(NqLineItemEditor, { props: { modelValue: seed() }, attachTo: document.body }));
    expect(total()).toContain("$");
    mounted.pop()!.unmount();
    mounted.push(mount(
      defineComponent({ setup: () => () => h(NasaqProvider, { locale: "ar" }, () => h(NqLineItemEditor, { modelValue: seed() })) }),
      { attachTo: document.body },
    ));
    expect(text(document.body)).toContain("الإجمالي");
    expect(total()).not.toContain("$");
    expect(total()).not.toMatch(/ILS|EGP|₪/);
  });
});
