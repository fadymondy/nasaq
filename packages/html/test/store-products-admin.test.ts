// The Blade store-products-admin example (packages/php/examples/rendered/store-products-admin.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms));

beforeAll(() => {
  Alpine.plugin(nasaq);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).Alpine = Alpine;
  Alpine.start();
});

afterEach(() => {
  for (const el of [...document.body.children]) {
    Alpine.destroyTree(el as HTMLElement);
    el.remove();
  }
});

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("store-products-admin");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}
const el = (h: HTMLElement, slot: string) => h.querySelector<HTMLElement>(`[data-slot="${slot}"]`)!;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (h: HTMLElement, slot: string) => Alpine.$data(el(h, slot)) as any;
const names = (list: { name: string }[]) => list.map((p) => p.name);

describe("store-products-admin (Alpine)", () => {
  it("lists the products with status, stock and a price range in USD", async () => {
    const h = await mount();
    const rows = [...h.querySelectorAll<HTMLElement>('[data-slot="product-row"]')];
    expect(rows).toHaveLength(3);
    const byName = (n: string) => rows.find((r) => r.textContent?.includes(n))!;
    expect(rows[0]!.textContent).toContain("Canvas tote");
    expect(byName("Linen shirt").textContent).toContain("$49.00");
    expect(byName("Linen shirt").textContent).toContain("In stock");
    expect(byName("Canvas tote").textContent).toContain("Draft");
    expect(byName("Canvas tote").textContent).toContain("Out of stock");
  });

  it("has row actions and a context menu on every row", async () => {
    const h = await mount();
    const row = h.querySelector<HTMLElement>('[data-slot="product-row"]')!;
    expect(row.querySelector('[data-slot="row-actions"]')).not.toBeNull();
    row.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }));
    await tick(80);
    const menu = document.body.querySelector('[data-slot="context-menu-content"]');
    expect(menu?.textContent).toContain("Edit");
    expect(menu?.textContent).toContain("Delete");
  });

  it("searches, filters, sorts and selects", async () => {
    const h = await mount();
    const d = data(h, "product-list");
    d.query = "mug";
    await tick();
    expect(names(d.filtered)).toEqual(["Clay mug"]);
    d.query = "";
    d.facet.status.draft = true;
    await tick();
    expect(names(d.filtered)).toEqual(["Canvas tote"]);
    d.facet.status = {};
    d.sortBy("price");
    await tick();
    expect(names(d.sorted)[0]).toBe("Clay mug");
    d.toggleAll(true);
    await tick();
    expect(d.selected).toHaveLength(3);
  });

  it("opens and creates through events", async () => {
    const h = await mount();
    const root = el(h, "product-list");
    const seen: string[] = [];
    root.addEventListener("nq-open", (e) => seen.push((e as CustomEvent).detail.product.name));
    root.addEventListener("nq-create", () => seen.push("create"));
    data(h, "product-list").openProduct(data(h, "product-list").products[2]);
    data(h, "product-list").create();
    expect(seen).toEqual(["Clay mug", "create"]);
  });

  it("changes a status, locally or through the host", async () => {
    const h = await mount();
    const d = data(h, "product-list");
    await d.setStatus(d.products[1], "active");
    expect(d.products[1].status).toBe("active");
    const root = el(h, "product-list");
    root.addEventListener("nq-status-change", (e) => (e as CustomEvent).detail.wait(Promise.resolve({ error: "Nope" })), { once: true });
    await d.setStatus(d.products[2], "archived");
    expect(d.products[2].status).toBe("active");
    expect(d.notice).toBe("Nope");
  });

  it("bulk edits the price with a preview, then applies it", async () => {
    const h = await mount();
    const d = data(h, "product-list");
    d.sel.p3 = true;
    d.sel.p1 = true;
    d.openBulk();
    d.priceMode = "increase-percent";
    d.percentText = "10";
    await tick();
    expect(d.hasChange).toBe(true);
    expect(d.preview).toHaveLength(2);
    expect(d.preview.find((r: { id: string }) => r.id === "p3").price).toContain("$14.00");
    await d.applyBulk();
    expect(d.products.find((p: { id: string }) => p.id === "p3").variants[0].price).toBe(1540);
    expect(d.bulkOpen).toBe(false);
  });

  it("deletes after confirming, and keeps the product on a host error", async () => {
    const h = await mount();
    const d = data(h, "product-list");
    d.askDelete(d.products[2]);
    expect(d.delOpen).toBe(true);
    el(h, "product-list").addEventListener("nq-delete", (e) => (e as CustomEvent).detail.wait(Promise.resolve({ error: "In use" })), { once: true });
    await d.confirmDelete();
    expect(d.products).toHaveLength(3);
    expect(d.notice).toBe("In use");
    await d.confirmDelete();
    expect(d.products).toHaveLength(2);
    expect(d.delOpen).toBe(false);
  });

  it("reorders the media by key and by move, and adds by URL", async () => {
    const h = await mount();
    const root = el(h, "media-manager");
    const d = data(h, "media-manager");
    expect(root.querySelectorAll('[data-slot="media-tile"]')).toHaveLength(3);
    const changes: string[][] = [];
    root.addEventListener("nq-images-change", (e) => changes.push((e as CustomEvent).detail.images.map((i: { src: string }) => i.src)));
    root.querySelector<HTMLElement>('[data-slot="media-drag-handle"]')!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
    await tick();
    expect(d.images.map((i: { src: string }) => i.src)[1]).toBe("/img/shirt-a.jpg");
    d.move(2, 0);
    d.url = "/img/new.jpg";
    d.add();
    await tick();
    expect(d.images).toHaveLength(4);
    expect(changes).toHaveLength(3);
    expect(d.missing).toBe(2);
    expect(root.textContent).toContain("Alt text missing");
  });

  it("adds and removes an option", async () => {
    const h = await mount();
    const root = el(h, "options-editor");
    const d = data(h, "options-editor");
    expect(root.querySelectorAll('[data-slot="option-row"]')).toHaveLength(1);
    d.add();
    await tick();
    expect(d.options).toHaveLength(2);
    expect(root.querySelectorAll('[data-slot="option-row"]')).toHaveLength(2);
    d.remove("option-2");
    await tick();
    expect(root.querySelectorAll('[data-slot="option-row"]')).toHaveLength(1);
  });

  it("flags duplicate SKUs and fills the selected variants", async () => {
    const h = await mount();
    const matrix = el(h, "variant-matrix");
    const d = Alpine.$data(matrix) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(matrix.querySelectorAll('[data-slot="variant-row"]')).toHaveLength(2);
    d.variants[1].sku = "LIN-RED";
    await tick();
    expect(matrix.textContent).toContain("Duplicate SKU");
    d.selected = { v1: true, v2: true };
    d.fill.stock = "9";
    await tick();
    expect(d.canFill).toBe(true);
    d.applyFill();
    expect(d.variants.map((v: { stock: number }) => v.stock)).toEqual([9, 9]);
    expect(d.some).toBe(true);
  });

  it("saves the editor only once changed, with the draft in the event", async () => {
    const h = await mount();
    const root = el(h, "product-editor");
    const d = data(h, "product-editor");
    expect(d.dirty).toBe(false);
    expect(d.saveOff).toBe(true);
    d.draft.title = "Linen shirt XL";
    await tick();
    expect(d.dirty).toBe(true);
    let saved: { title: string } | null = null;
    root.addEventListener("nq-save", (e) => {
      saved = (e as CustomEvent).detail.draft;
      (e as CustomEvent).detail.wait(Promise.resolve(undefined));
    });
    await d.save();
    expect(saved).not.toBeNull();
    expect(saved!.title).toBe("Linen shirt XL");
    expect(d.dirty).toBe(false);
    expect(d.saved).toBe(true);
  });

  it("blocks a save with a missing title and shows a host error", async () => {
    const h = await mount();
    const root = el(h, "product-editor");
    const d = data(h, "product-editor");
    d.draft.title = "";
    await d.save();
    expect(d.touched).toBe(true);
    expect(d.has("title")).toBe(true);
    d.draft.title = "Shirt";
    root.addEventListener("nq-save", (e) => (e as CustomEvent).detail.wait(Promise.resolve({ error: "Server said no" })), { once: true });
    await d.save();
    expect(d.error).toBe("Server said no");
    expect(d.dirty).toBe(true);
    d.discard();
    expect(d.draft.title).toBe("Linen shirt");
  });

  it("rebuilds the variants when an option value is added", async () => {
    const h = await mount();
    const d = data(h, "product-editor");
    const options = JSON.parse(JSON.stringify(d.draft.options));
    options[0].values.push({ id: "green", label: "Green" });
    d.changeOptions(options);
    expect(d.draft.variants).toHaveLength(3);
    expect(d.variantsSummary).toContain("3");
  });

  it("lists the collections with their match counts", async () => {
    const h = await mount();
    const root = el(h, "collections-manager");
    const cards = root.querySelectorAll('[data-slot="collection-card"]');
    expect(cards).toHaveLength(2);
    expect(cards[0]!.textContent).toContain("Summer picks");
    expect(cards[0]!.textContent).toContain("1 products");
    expect(cards[1]!.textContent).toContain("Nile brand");
  });

  it("creates a collection locally, or keeps the dialog on a host error", async () => {
    const h = await mount();
    const root = el(h, "collections-manager");
    const d = data(h, "collections-manager");
    d.create();
    expect(d.editOpen).toBe(true);
    await d.saveCollection();
    expect(d.touched).toBe(true);
    expect(d.collections).toHaveLength(2);
    d.ctitle = "Fresh";
    d.addProduct("p3");
    root.addEventListener("nq-collection-save", (e) => (e as CustomEvent).detail.wait(Promise.resolve({ error: "Taken" })), { once: true });
    await d.saveCollection();
    expect(d.notice).toBe("Taken");
    expect(d.editOpen).toBe(true);
    await d.saveCollection();
    expect(d.collections).toHaveLength(3);
    expect(d.editOpen).toBe(false);
    d.askDelete(d.collections[2]);
    await d.confirmDelete();
    expect(d.collections).toHaveLength(2);
  });
});
