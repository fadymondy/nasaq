import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import type { CommerceProduct } from "../store-listing/commerce";
import { NqStoreAnnouncementBar, NqStoreFooter, NqStoreHeader, NqStoreMegaMenu, NqStoreSearch } from "./index";

const products: CommerceProduct[] = [
  { id: "tee", name: "Everyday tee", brand: "Nasaq Goods", category: "tops", images: [], options: [], variants: [{ id: "t1", options: {}, price: 2900, stock: 8 }] },
  { id: "belt", name: "Leather belt", brand: "Atlas", category: "accessories", images: [], options: [], variants: [{ id: "b1", options: {}, price: 3400, stock: 9 }] },
];
const tick = () => new Promise((r) => setTimeout(r, 10));

describe("store chrome (Vue)", () => {
  it("search suggests products and runs a query on Enter", async () => {
    const onSearch = vi.fn();
    const w = mount(NqStoreSearch, { props: { products, currency: "USD", onSearch }, attachTo: document.body });
    const input = w.find("input");
    await input.setValue("tee");
    await input.trigger("focus");
    expect(input.attributes("role")).toBe("combobox");
    expect(document.body.textContent).toContain("Everyday tee");
    await input.trigger("keydown", { key: "ArrowDown" });
    expect(input.attributes("aria-activedescendant")).toBeTruthy();
    await input.trigger("keydown", { key: "Escape" });
    await input.trigger("keydown", { key: "Enter" });
    expect(onSearch).toHaveBeenCalledWith("tee");
    w.unmount();
  });

  it("announcement bar steps and dismisses", async () => {
    const w = mount(NqStoreAnnouncementBar, { props: { items: [{ id: "a", content: "One" }, { id: "b", content: "Two" }], interval: 0 } });
    expect(w.text()).toContain("One");
    await w.find('button[aria-label="Next announcement"]').trigger("click");
    expect(w.text()).toContain("Two");
    await w.find('button[aria-label="Dismiss announcement"]').trigger("click");
    expect(w.text()).toContain("One");
    expect(w.emitted("dismiss")?.[0]).toEqual(["b"]);
  });

  it("header shows the cart count and emits cart-click", async () => {
    const w = mount(NqStoreHeader, { props: { cartCount: 3, cartButton: true }, slots: { brand: "Shop" } });
    const cart = w.find('button[aria-label="Cart, 3"]');
    expect(cart.exists()).toBe(true);
    await cart.trigger("click");
    expect(w.emitted("cart-click")).toHaveLength(1);
  });

  it("mega menu renders top-level links with aria-current", () => {
    const w = mount(NqStoreMegaMenu, { props: { items: [{ id: "sale", label: "Sale", href: "/sale" }], currentId: "sale" } });
    expect(w.find("a").attributes("aria-current")).toBe("page");
  });

  it("footer validates the email then subscribes", async () => {
    const onSubscribe = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqStoreFooter, { props: { onSubscribe } });
    const input = w.find("input");
    await input.setValue("nope");
    await w.find("form").trigger("submit");
    expect(w.text()).toContain("Enter a valid email address.");
    expect(onSubscribe).not.toHaveBeenCalled();
    await input.setValue("a@b.co");
    await w.find("form").trigger("submit");
    await tick();
    expect(onSubscribe).toHaveBeenCalledWith("a@b.co");
    expect(w.text()).toContain("You are subscribed");
  });
});
