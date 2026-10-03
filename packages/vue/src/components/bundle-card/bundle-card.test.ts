import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NasaqProvider } from "../../provider";
import { NqBundleCard } from ".";

const slots = {
  items: `<i data-test="a">A</i><i data-test="b">B</i>`,
  action: `<button>Get</button>`,
};
const props = { title: "Agency kit", description: "For agencies.", includes: "Mahaam · Zekra", price: 18, compareAt: 21 };

describe("NqBundleCard", () => {
  it("renders the stack, title, saving badge, price and action with the React classes", () => {
    const w = mount(NqBundleCard, { props: { ...props, class: "extra" }, slots });
    expect(w.attributes("data-slot")).toBe("bundle-card");
    expect(w.classes()).toContain("@container");
    const article = w.find("article");
    expect(article.classes()).toEqual(expect.arrayContaining(["rounded-card", "bg-nq-surface", "@xl:flex-row", "extra"]));
    const stack = w.find('[aria-hidden="true"]');
    expect(stack.classes()).toEqual(expect.arrayContaining(["[&>*]:size-14", "[&>*+*]:-ms-3"]));
    const wrapped = stack.findAll(":scope > span");
    expect(wrapped).toHaveLength(2);
    expect(wrapped[0]!.classes()).toEqual(expect.arrayContaining(["overflow-hidden", "rounded-card", "ring-2", "ring-nq-surface"]));
    expect(wrapped[1]!.find("i").text()).toBe("B");
    expect(w.find("h3").text()).toBe("Agency kit");
    const badge = w.find('[data-slot="badge"]');
    expect(badge.text()).toBe("Save $3");
    expect(w.find('[data-slot="price"]').text()).toContain("$18");
    expect(w.find("s").text()).toContain("$21");
    expect(w.text()).toContain("Mahaam · Zekra");
    expect(w.find("button").text()).toBe("Get");
  });

  it("hides the badge when there is no saving and honours savingsLabel", () => {
    expect(mount(NqBundleCard, { props: { ...props, compareAt: 18 }, slots }).find('[data-slot="badge"]').exists()).toBe(false);
    expect(mount(NqBundleCard, { props: { ...props, savingsLabel: "2 months free" }, slots }).find('[data-slot="badge"]').text()).toBe("2 months free");
  });

  it("uses Arabic copy and SAR under an Arabic provider", () => {
    const w = mount(
      { components: { NasaqProvider, NqBundleCard }, props: ["p"], template: `<NasaqProvider locale="ar" target="scope"><NqBundleCard v-bind="p" /></NasaqProvider>` },
      { props: { p: props } },
    );
    expect(w.find('[data-slot="badge"]').text()).toContain("وفّر");
    expect(w.text()).toMatch(/SAR|ر\.س/);
  });
});
