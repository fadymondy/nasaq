import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NqSpotlight } from ".";

describe("NqSpotlight", () => {
  it("labels the section by its heading and scopes the banner to the product brand", () => {
    const w = mount(NqSpotlight, { props: { brand: "mahaam", title: "Mahaam", class: "max-w-3xl" }, slots: { description: "A pitch", actions: "<button>Go</button>", meta: "From $9" } });
    expect(w.element.tagName).toBe("SECTION");
    expect(w.attributes("data-slot")).toBe("spotlight");
    expect(w.attributes("data-size")).toBe("lg");
    expect(w.classes()).toEqual(expect.arrayContaining(["flex", "max-w-3xl"]));
    const h = w.find("h2");
    expect(h.text()).toBe("Mahaam");
    expect(w.attributes("aria-labelledby")).toBe(h.attributes("id"));
    expect(w.find('[data-slot="product-artwork"]').attributes("data-brand")).toBe("mahaam");
    expect(w.find('[data-slot="product-mark"]').exists()).toBe(true);
    expect(w.text()).toContain("A pitch");
    expect(w.find("button").text()).toBe("Go");
  });

  it("renders the compact tile with a custom heading level and mark", () => {
    const w = mount(NqSpotlight, { props: { brand: "zekra", title: "Zekra", size: "md", titleAs: "h3" }, slots: { mark: "<i data-m />", media: "<i data-media />" } });
    expect(w.attributes("data-size")).toBe("md");
    expect(w.find("h3").text()).toBe("Zekra");
    expect(w.find("[data-m]").exists()).toBe(true);
    expect(w.find('[data-slot="product-mark"]').exists()).toBe(false);
    expect(w.find("[data-media]").exists()).toBe(false);
    expect(w.find("p, [class*='line-clamp-2']").exists()).toBe(false);
  });
});
