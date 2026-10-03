import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NqProductSwitcher } from ".";

const products = [
  { id: "mahaam", brand: "mahaam", name: "Mahaam", href: "https://mahaam.app" },
  { id: "custom", name: "Custom app" },
];

describe("NqProductSwitcher", () => {
  it("opens a grid of tiles; hrefs render as links and the current one is marked", async () => {
    const w = mount(NqProductSwitcher, { props: { products, current: "mahaam" }, attachTo: document.body });
    await w.find("button").trigger("click");
    await flushPromises();
    const tiles = document.querySelectorAll<HTMLElement>('[data-slot="product-tile"]');
    expect(tiles).toHaveLength(2);
    expect(tiles[0]!.tagName).toBe("A");
    expect(tiles[0]!.getAttribute("href")).toBe("https://mahaam.app");
    expect(tiles[0]!.getAttribute("aria-current")).toBe("page");
    w.unmount();
  });

  it("emits select for a product without href", async () => {
    const w = mount(NqProductSwitcher, { props: { products }, attachTo: document.body });
    await w.find("button").trigger("click");
    await flushPromises();
    document.querySelectorAll<HTMLElement>('[data-slot="product-tile"]')[1]!.click();
    expect(w.emitted("select")![0]![0]).toMatchObject({ id: "custom" });
    w.unmount();
  });
});
