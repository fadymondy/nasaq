import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NqProductCard, NqProductGrid, NqProductList, NqProductListItem } from ".";

describe("NqProductCard", () => {
  it("renders the tile classes and the badge on the artwork", () => {
    const w = mount(NqProductCard, { props: { layout: "tile", name: "Zekra", category: "AI memory", badge: "New", description: "Pitch" }, slots: { artwork: "<i>art</i>", price: "<b>$9</b>" } });
    expect(w.attributes("data-slot")).toBe("product-card");
    expect(w.attributes("data-layout")).toBe("tile");
    expect(w.classes()).toEqual(expect.arrayContaining(["flex-col", "gap-3", "group/product"]));
    expect(w.find("h3").text()).toBe("Zekra");
    expect(w.find('[data-slot="product-card-artwork"]').classes()).toContain("aspect-[16/10]");
    const badges = w.findAll("span").filter((s) => s.text() === "New");
    expect(badges.map((b) => b.classes().includes("inline-flex"))).toEqual([true, false]);
    expect(w.text()).toContain("$9");
  });

  it("auto layout is a row that becomes a tile in a wide container; nameAs changes the heading", () => {
    const w = mount(NqProductCard, { props: { name: "X", nameAs: "h2", class: "extra" } });
    expect(w.classes()).toEqual(expect.arrayContaining(["flex-row", "@xl:flex-col", "extra"]));
    expect(w.find("h2").exists()).toBe(true);
    expect(w.find("p").exists()).toBe(false);
  });

  it("grid, list and list item keep their slots and classes", () => {
    const g = mount(NqProductGrid, { slots: { default: "<i>x</i>" } });
    expect(g.attributes("data-slot")).toBe("product-grid");
    expect(g.classes()).toContain("@container");
    expect(g.element.firstElementChild?.className).toContain("@4xl:grid-cols-3");
    const l = mount(NqProductList, { slots: { default: "<li>a</li>" } });
    expect(l.attributes("data-slot")).toBe("product-list");
    expect(l.find("ul").classes()).toContain("@3xl:grid-cols-2");
    const li = mount(NqProductListItem, { props: { name: "Mod", description: "d" }, slots: { price: "<b>$1</b>" } });
    expect(li.element.tagName).toBe("LI");
    expect(li.attributes("data-slot")).toBe("product-list-item");
    expect(li.classes()).toContain("hover:bg-nq-hover");
    expect(li.text()).toContain("Mod");
  });
});
