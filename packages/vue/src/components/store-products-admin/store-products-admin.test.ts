import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { NasaqProvider } from "../../provider";
import {
  draftChanged,
  emptyProductDraft,
  generateVariants,
  marginFromCost,
  matchCollection,
  NqCollectionsManager,
  NqMediaManager,
  NqOptionsEditor,
  NqProductAdminList,
  NqProductEditor,
  NqVariantMatrix,
  productToDraft,
  validateProductDraft,
  type CollectionDef,
  type ProductAdminProduct,
} from ".";

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

const colour = { id: "colour", name: "Colour", values: [{ id: "red", label: "Red" }, { id: "blue", label: "Blue" }] };
const shirt: ProductAdminProduct = {
  id: "p1",
  name: "Linen shirt",
  brand: "Nile",
  category: "Clothing",
  tags: ["summer"],
  status: "active",
  images: [{ src: "/a.jpg", alt: "A" }, { src: "/b.jpg", alt: "" }],
  options: [colour],
  variants: [
    { id: "v1", options: { colour: "red" }, price: 4900, stock: 12, sku: "S-RED" },
    { id: "v2", options: { colour: "blue" }, price: 4900, stock: 2, sku: "S-RED" },
  ],
};
const tote: ProductAdminProduct = { id: "p2", name: "Canvas tote", status: "draft", images: [], options: [], variants: [{ id: "v3", options: {}, price: 1900, stock: 0 }] };

describe("logic", () => {
  it("builds variants, margin and validation", () => {
    expect(generateVariants([colour], [], { defaults: { price: 100 } }).variants).toHaveLength(2);
    expect(marginFromCost(1000, 600)?.marginBps).toBe(4000);
    const d = emptyProductDraft();
    expect(validateProductDraft({ title: "", price: null, compareAt: null, options: [], variants: d.variants, slug: "" }).map((i) => i.code)).toContain("title");
    expect(draftChanged(d, d)).toBe(false);
    expect(productToDraft(shirt).title).toBe("Linen shirt");
  });
  it("matches a manual collection", () => {
    const manual: CollectionDef = { id: "c", title: "M", kind: "manual", productIds: ["p2"] };
    expect(matchCollection([shirt, tote], manual, { minorPerMajor: 100, includeInactive: true }).map((p) => p.id)).toEqual(["p2"]);
  });
});

describe("NqProductAdminList", () => {
  it("lists products, with create", () => {
    const onCreate = vi.fn();
    const w = mount(NqProductAdminList, { props: { products: [shirt, tote], currency: "USD", onCreate, onOpen: vi.fn(), onDelete: async () => undefined }, attachTo: document.body });
    expect(document.body.textContent).toContain("Linen shirt");
    expect(document.body.textContent).toContain("Canvas tote");
    [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("New product"))?.click();
    expect(onCreate).toHaveBeenCalled();
    w.unmount();
  });
  it("shows the empty and error states", () => {
    const e = mount(NqProductAdminList, { props: { products: [] }, attachTo: document.body });
    expect(document.body.textContent).toMatch(/No products/i);
    e.unmount();
    const f = mount(NqProductAdminList, { props: { products: [], error: true }, attachTo: document.body });
    expect(document.body.textContent).toMatch(/did not load/i);
    f.unmount();
  });
});

describe("NqMediaManager", () => {
  it("moves, adds by URL and flags missing alt", async () => {
    const onImagesChange = vi.fn();
    const w = mount(NqMediaManager, { props: { images: shirt.images, onImagesChange } });
    expect(w.attributes("data-slot")).toBe("media-manager");
    expect(w.findAll('[data-slot="media-tile"]')).toHaveLength(2);
    await w.findAll("button").find((b) => b.attributes("aria-label")?.startsWith("Move") && b.attributes("disabled") === undefined && b.attributes("data-slot") !== "media-drag-handle")!.trigger("click");
    expect(onImagesChange).toHaveBeenCalledTimes(1);
    await w.findAll('[data-slot="media-drag-handle"]')[0]!.trigger("keydown", { key: "ArrowRight" });
    expect(onImagesChange).toHaveBeenCalledTimes(2);
    await w.find('input[type="url"]').setValue("/c.jpg");
    await w.find("form").trigger("submit");
    expect(onImagesChange).toHaveBeenLastCalledWith([...shirt.images, { src: "/c.jpg", alt: "" }]);
  });
});

describe("NqOptionsEditor", () => {
  it("adds and removes an option", async () => {
    const onOptionsChange = vi.fn();
    const w = mount(NqOptionsEditor, { props: { options: [colour], onOptionsChange } });
    expect(w.attributes("data-slot")).toBe("options-editor");
    await w.findAll("button").find((b) => b.text().includes("Add option"))!.trigger("click");
    expect(onOptionsChange.mock.calls[0]![0]).toHaveLength(2);
    await w.findAll("button").find((b) => b.attributes("aria-label")?.startsWith("Remove option"))!.trigger("click");
    expect(onOptionsChange).toHaveBeenLastCalledWith([]);
  });
});

describe("NqVariantMatrix", () => {
  it("renders a row per variant and flags duplicate SKUs", () => {
    const w = mount(NqVariantMatrix, { props: { options: [colour], variants: shirt.variants, onVariantsChange: vi.fn(), images: shirt.images } });
    expect(w.findAll('[data-slot="variant-row"]')).toHaveLength(2);
    expect(w.text()).toMatch(/duplicate/i);
  });
  it("shows the empty hint without variants", () => {
    const w = mount(NqVariantMatrix, { props: { options: [], variants: [], onVariantsChange: vi.fn() } });
    expect(w.attributes("data-slot")).toBe("variant-matrix");
  });
});

describe("NqProductEditor", () => {
  it("saves only once changed, with the new draft", async () => {
    const onSave = vi.fn(async () => undefined);
    const w = mount(NqProductEditor, { props: { initial: productToDraft(tote, { cost: 500 }), onSave, currency: "USD" }, attachTo: document.body });
    expect(w.attributes("data-slot")).toBe("product-editor");
    const save = w.findAll("button").filter((b) => b.attributes("type") === "submit").at(-1)!;
    expect(save.attributes("disabled")).toBeDefined();
    await w.find("input").setValue("Canvas tote XL");
    expect(save.attributes("disabled")).toBeUndefined();
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect((onSave.mock.calls[0] as unknown as [{ title: string }])[0].title).toBe("Canvas tote XL");
    w.unmount();
  });
  it("shows the server error and keeps the edits", async () => {
    const w = mount(NqProductEditor, { props: { initial: productToDraft(tote), onSave: async () => ({ error: "Nope" }) }, attachTo: document.body });
    await w.find("input").setValue("X");
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(w.text()).toContain("Nope");
    w.unmount();
  });
  it("renders a skeleton while loading", () => {
    const w = mount(NqProductEditor, { props: { onSave: async () => undefined, loading: true } });
    expect(w.attributes("aria-busy")).toBe("true");
  });
});

describe("NqCollectionsManager", () => {
  const collections: CollectionDef[] = [{ id: "c1", title: "Summer", kind: "manual", productIds: ["p1"] }];
  it("lists collections with a count", () => {
    const w = mount(NqCollectionsManager, { props: { collections, products: [shirt, tote], onSave: async () => undefined, onDelete: async () => undefined } });
    expect(w.attributes("data-slot")).toBe("collections-manager");
    expect(w.text()).toContain("Summer");
  });
  it("creates a collection from the dialog", async () => {
    const onSave = vi.fn(async () => undefined);
    const w = mount(NqCollectionsManager, { props: { collections: [], products: [shirt], onSave }, attachTo: document.body });
    expect(w.text()).toMatch(/No collections/i);
    await w.findAll("button").find((b) => b.text().includes("New collection"))!.trigger("click");
    await flushPromises();
    const input = document.body.querySelector<HTMLInputElement>('[role="dialog"] input')!;
    input.value = "Fresh";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await flushPromises();
    document.body.querySelector<HTMLFormElement>('[role="dialog"] form')!.requestSubmit();
    await flushPromises();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect((onSave.mock.calls[0] as unknown as [CollectionDef])[0].title).toBe("Fresh");
    w.unmount();
  });
});

describe("Arabic", () => {
  it("uses Arabic strings", () => {
    const Host = defineComponent({ render: () => h(NasaqProvider, { locale: "ar" }, () => h(NqProductAdminList, { products: [tote] })) });
    const w = mount(Host, { attachTo: document.body });
    expect(document.body.textContent).toMatch(/[؀-ۿ]/);
    w.unmount();
  });
});
