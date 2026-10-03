import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { NasaqProvider } from "../../provider";
import { NqTranslationsProvider, createTranslator, translationsInterpolate, translationsLocaleChain, translationsLookup, useOptionalTranslations, useTranslations, type TranslationsValue } from ".";

const messages = {
  en: { nav: { home: "Home" }, inbox_one: "{count} message", inbox_other: "{count} messages", hi: "Hi {{name}}" },
  ar: { nav: { home: "الرئيسية" }, inbox_zero: "لا رسائل", inbox_one: "رسالة واحدة", inbox_two: "رسالتان", inbox_few: "{count} رسائل", inbox_other: "{count} رسالة" },
};

describe("translator logic", () => {
  it("looks up nested keys and namespaces", () => {
    expect(translationsLookup({ a: { b: "x" } }, "a.b")).toBe("x");
    expect(translationsLookup({ a: { b: "x" } }, "a:b")).toBe("x");
    expect(translationsLookup({ "a.b": "flat", a: { b: "x" } }, "a.b")).toBe("flat");
    expect(translationsLookup({ a: "x" }, "a.b")).toBeUndefined();
  });

  it("interpolates both brace styles and leaves unknown names", () => {
    expect(translationsInterpolate("Hi {name} {{name}} {other}", { name: "Sam" })).toBe("Hi Sam Sam {other}");
    expect(translationsInterpolate("{n}", { n: 1200 }, "en")).toBe("1,200");
  });

  it("builds the locale chain", () => {
    expect(translationsLocaleChain("ar-EG", "en")).toEqual(["ar-EG", "ar", "en"]);
  });

  it("picks plural forms, falls back along the chain and to the key", () => {
    const en = createTranslator(messages, "en");
    expect(en("inbox", { count: 1 })).toBe("1 message");
    expect(en("inbox", { count: 3 })).toBe("3 messages");
    const ar = createTranslator(messages, "ar");
    expect(ar("inbox", { count: 0 })).toBe("لا رسائل");
    expect(ar("inbox", { count: 2 })).toBe("رسالتان");
    expect(ar("inbox", { count: 5 })).toBe("5 رسائل");
    expect(ar("hi", { name: "Sam" })).toBe("Hi Sam");
    expect(en("missing.key")).toBe("missing.key");
    expect(en("missing.key", { defaultValue: "Fallback" })).toBe("Fallback");
  });
});

describe("NqTranslationsProvider", () => {
  beforeEach(() => localStorage.clear());

  function harness(storageKey: string | null = "nasaq-locale") {
    let api!: { readonly value: TranslationsValue };
    const Child = defineComponent({
      setup() {
        api = useTranslations();
        return () => h("p", api.value.t("nav.home"));
      },
    });
    const w = mount(
      { components: { Child, NasaqProvider, NqTranslationsProvider }, setup: () => ({ messages, storageKey }), template: `<NasaqProvider target="scope"><NqTranslationsProvider :messages="messages" :storage-key="storageKey"><Child /></NqTranslationsProvider></NasaqProvider>` },
    );
    return { w, api: () => api.value };
  }

  it("translates and follows setLocale, storing the choice", async () => {
    const { w, api } = harness();
    expect(w.text()).toBe("Home");
    api().setLocale("ar");
    await w.vm.$nextTick();
    expect(w.text()).toBe("الرئيسية");
    expect(localStorage.getItem("nasaq-locale")).toBe("ar");
    expect(api().hasStoredLocale()).toBe(true);
  });

  it("seedLocale applies only when nothing is stored and does not store", async () => {
    const a = harness();
    a.api().seedLocale("ar");
    await a.w.vm.$nextTick();
    expect(a.w.text()).toBe("الرئيسية");
    expect(localStorage.getItem("nasaq-locale")).toBeNull();
    a.w.unmount();

    localStorage.setItem("nasaq-locale", "en");
    const b = harness();
    b.api().seedLocale("ar");
    await b.w.vm.$nextTick();
    expect(b.w.text()).toBe("Home");
  });

  it("restores a stored locale on mount", async () => {
    localStorage.setItem("nasaq-locale", "ar");
    const { w } = harness();
    await w.vm.$nextTick();
    expect(w.text()).toBe("الرئيسية");
  });

  it("useTranslations throws outside a provider; useOptionalTranslations is null", () => {
    expect(() => mount(defineComponent({ setup() { useTranslations(); return () => h("i"); } }))).toThrow(/NqTranslationsProvider/);
    let got: unknown = 1;
    mount(defineComponent({ setup() { got = useOptionalTranslations(); return () => h("i"); } }));
    expect(got).toBeNull();
  });
});
