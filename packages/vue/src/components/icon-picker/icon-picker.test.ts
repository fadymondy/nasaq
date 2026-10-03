import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { NasaqProvider } from "../../provider";
import { findIcon, ICON_CATALOG, NqIconByName, NqIconPicker, NqIconPickerPanel, normalizeIconName } from ".";

beforeEach(() => localStorage.clear());
afterEach(() => {
  document.body.innerHTML = "";
});

describe("icon-picker helpers", () => {
  it("normalises and finds icons by any stored form", () => {
    expect(normalizeIconName("lucide:users")).toBe("users");
    expect(normalizeIconName("Building2")).toBe("building-2");
    expect(findIcon("Users")?.name).toBe("users");
    expect(findIcon("nope")).toBeUndefined();
    expect(ICON_CATALOG.length).toBeGreaterThan(150);
  });
});

describe("NqIconByName", () => {
  it("renders an svg for a known name, an img for a URL and the fallback otherwise", () => {
    expect(mount(NqIconByName, { props: { name: "rocket" } }).find("svg").exists()).toBe(true);
    const img = mount(NqIconByName, { props: { name: "/x.png", size: 20 } }).find("img");
    expect(img.attributes("data-slot")).toBe("icon-image");
    expect(img.attributes("width")).toBe("20");
    expect(mount(NqIconByName, { props: { name: "zzz" }, slots: { default: "<b>fb</b>" } }).text()).toBe("fb");
  });
});

describe("NqIconPickerPanel", () => {
  it("lists tiles, filters by search and emits the chosen name", async () => {
    const w = mount(NqIconPickerPanel, { props: { modelValue: "house" } });
    expect(w.find('[data-slot="icon-picker"]').exists()).toBe(true);
    expect(w.findAll('[role="option"]').length).toBe(96);
    expect(w.find('[role="option"][data-selected]').exists()).toBe(true);
    await w.find("input").setValue("rocket");
    expect(w.findAll('[role="option"]').map((o) => o.attributes("aria-label"))).toContain("rocket");
    await w.find('[role="option"]').trigger("click");
    expect(w.emitted("update:modelValue")![0]![0]).toBe("rocket");
    expect(JSON.parse(localStorage.getItem("nasaq:icon-picker:recent")!)).toEqual(["rocket"]);
    await w.find("input").setValue("zzzzqq");
    expect(w.text()).toContain("No icons match");
  });

  it("uses Arabic strings in an Arabic provider", async () => {
    const w = mount(defineComponent({ render: () => h(NasaqProvider, { target: "scope", defaultLocale: "ar" }, () => h(NqIconPickerPanel)) }));
    await flushPromises();
    expect(w.find("input").attributes("aria-label")).toBe("ابحث عن أيقونة");
    expect(w.text()).toContain("الكل");
  });

  it("arrow keys move focus between tiles", async () => {
    const w = mount(NqIconPickerPanel, { attachTo: document.body });
    await w.find('[role="option"]').trigger("keydown", { key: "ArrowRight" });
    await flushPromises();
    expect((document.activeElement as HTMLElement).dataset.index).toBe("1");
    w.unmount();
  });
});

describe("NqIconPicker", () => {
  it("opens a popover with the panel and closes after choosing", async () => {
    const w = mount(NqIconPicker, { props: { defaultValue: "rocket" }, attachTo: document.body });
    const trigger = w.find("button");
    expect(trigger.attributes("aria-label")).toBe("Icon: rocket");
    await trigger.trigger("click");
    await flushPromises();
    expect(document.querySelector('[data-slot="icon-picker"]')).not.toBeNull();
    (document.querySelector('[role="option"][aria-label="house"]') as HTMLElement).click();
    await flushPromises();
    expect(w.emitted("update:modelValue")![0]![0]).toBe("house");
    expect(w.find("button").attributes("aria-label")).toBe("Icon: house");
    w.unmount();
  });
});

describe("Boxicons names", () => {
  it("boxiconClass accepts prefixed and legacy forms", async () => {
    const { boxiconClass } = await import(".");
    expect(boxiconClass("bx:home")).toBe("bx-home");
    expect(boxiconClass("bxs:Star")).toBe("bxs-star");
    expect(boxiconClass("bxl-github")).toBe("bxl-github");
    expect(boxiconClass("users")).toBeUndefined();
    expect(boxiconClass(null)).toBeUndefined();
  });

  it("NqIconByName draws an <i> with the boxicon classes at 1em, or at size", () => {
    const i = mount(NqIconByName, { props: { name: "bx:home" }, attrs: { class: "text-xl" } }).find("i");
    expect(i.attributes("data-slot")).toBe("icon-boxicon");
    expect(i.attributes("aria-hidden")).toBe("true");
    expect(i.classes()).toEqual(expect.arrayContaining(["bx", "bx-home", "text-xl"]));
    expect(i.attributes("style")).toContain("font-size: 1em");
    expect(mount(NqIconByName, { props: { name: "bxl-github", size: 20 } }).find("i").attributes("style")).toContain("font-size: 20px");
  });
});
