import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NasaqProvider } from "../../provider";
import { categoryCounts, filterCatalog, NqCatalogStore, sortCatalog, type CatalogItem } from ".";

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("lang");
  document.documentElement.removeAttribute("dir");
});

const items: CatalogItem[] = [
  { id: "a", name: "Alpha", summary: "First tool", category: "tools", installs: 1200, publisher: "Nasaq", price: { amount: 9, period: "month" }, details: [{ label: "Inputs", value: "1 item" }], tags: ["fast"] },
  { id: "b", name: "Beta", summary: "Second", category: "tools", installs: 50, installed: true },
  { id: "c", name: "Gamma", summary: "Charts", category: "data", installs: 9000 },
];
const categories = [
  { id: "tools", label: "Tools" },
  { id: "data", label: "Data" },
];

describe("catalog logic", () => {
  it("filters, sorts and counts", () => {
    expect(filterCatalog(items, { query: "chart" }).map((i) => i.id)).toEqual(["c"]);
    expect(sortCatalog(items, "popular").map((i) => i.id)).toEqual(["c", "a", "b"]);
    expect(sortCatalog(items, "name").map((i) => i.id)).toEqual(["a", "b", "c"]);
    expect(categoryCounts(items).get("tools")).toBe(2);
  });
});

describe("NqCatalogStore", () => {
  const cards = (w: ReturnType<typeof mount>) => w.findAll('[data-slot="catalog-card"]').map((c) => c.attributes("data-item"));

  it("renders cards popular first with counts, and filters by search and category", async () => {
    const w = mount(NqCatalogStore, { props: { items, categories } });
    expect(w.attributes("data-slot")).toBe("catalog-store");
    expect(cards(w)).toEqual(["c", "a", "b"]);
    expect(w.text()).toContain("$9");
    await w.find("input[type=search]").setValue("alpha");
    expect(cards(w)).toEqual(["a"]);
    await w.find("input[type=search]").setValue("");
    await w.findAll("[data-slot=chip]").find((c) => c.text().startsWith("Data"))!.trigger("click");
    expect(cards(w)).toEqual(["c"]);
    expect(w.findAll("[data-slot=chip]").find((c) => c.text().startsWith("Data"))!.attributes("data-selected")).toBe("");
    await w.findAll("[data-slot=chip]").find((c) => c.text().startsWith("Installed"))!.trigger("click");
    expect(cards(w)).toEqual(["b"]);
  });

  it("shows the empty state and clears the filters", async () => {
    const w = mount(NqCatalogStore, { props: { items, categories } });
    await w.find("input[type=search]").setValue("zzz");
    expect(w.text()).toContain("Nothing found");
    await w.findAll("button").find((b) => b.text() === "Clear filters")!.trigger("click");
    expect(cards(w)).toHaveLength(3);
  });

  it("installs from the card and flips to Open", async () => {
    const onInstall = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqCatalogStore, { props: { items, categories, onInstall } });
    const card = w.find('[data-item="a"]');
    await card.find("[data-slot=install-button]").trigger("click");
    await flushPromises();
    expect(onInstall).toHaveBeenCalledWith(items[0]);
    expect(w.find('[data-item="a"]').attributes("data-state")).toBe("installed");
  });

  it("opens the detail sheet, shows an install error", async () => {
    const onInstall = vi.fn().mockResolvedValue({ error: "Quota reached" });
    const w = mount(NqCatalogStore, { props: { items, categories, onInstall }, attachTo: document.body });
    await w.find('[data-item="a"] h3 button').trigger("click");
    await flushPromises();
    const sheet = document.querySelector<HTMLElement>('[data-slot="sheet-content"]')!;
    expect(sheet.textContent).toContain("by Nasaq");
    expect(sheet.textContent).toContain("Inputs");
    expect(sheet.textContent).toContain("fast");
    (sheet.querySelector("[data-slot=install-button]") as HTMLElement).click();
    await flushPromises();
    expect(document.querySelector('[role="alert"]')!.textContent).toBe("Quota reached");
    w.unmount();
  });

  it("onSelect replaces the sheet", async () => {
    const onSelect = vi.fn();
    const w = mount(NqCatalogStore, { props: { items, categories, onSelect }, attachTo: document.body });
    await w.find('[data-item="a"] h3 button').trigger("click");
    await flushPromises();
    expect(onSelect).toHaveBeenCalledWith(items[0]);
    expect(document.querySelector('[data-slot="sheet-content"]')).toBeNull();
    w.unmount();
  });

  it("reads in Arabic", () => {
    const w = mount({ components: { NasaqProvider, NqCatalogStore }, setup: () => ({ items, categories }), template: `<NasaqProvider locale="ar"><NqCatalogStore :items="items" :categories="categories" /></NasaqProvider>` });
    expect(w.text()).toContain("الكل");
    expect(w.text()).toMatch(/ر\.س|SAR/);
  });
});
