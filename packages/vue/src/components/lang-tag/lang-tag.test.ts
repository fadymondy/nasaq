import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NasaqProvider } from "../../provider";
import { NqLangTag, languageName } from ".";

describe("NqLangTag", () => {
  it("renders nothing without a language", () => {
    expect(mount(NqLangTag).find('[data-slot="lang-tag"]').exists()).toBe(false);
  });

  it("shows the base code, left to right, with the language name for assistive tech", () => {
    const w = mount(NqLangTag, { props: { lang: "en-GB" } });
    const el = w.find('[data-slot="lang-tag"]');
    expect(el.attributes("data-lang")).toBe("en");
    expect(el.attributes("dir")).toBe("ltr");
    expect(el.classes()).toEqual(expect.arrayContaining(["font-mono", "uppercase", "tracking-wide"]));
    expect(el.find('[aria-hidden="true"]').text()).toBe("en");
    expect(el.find(".sr-only").text()).toBe("Content language: English");
    expect(el.attributes("title")).toBe("English");
  });

  it("can show the full region code and an explicit hue", () => {
    const w = mount(NqLangTag, { props: { lang: "en_GB", region: true, hue: "pink" } });
    const el = w.find('[data-slot="lang-tag"]');
    expect(el.find('[aria-hidden="true"]').text()).toBe("en-GB");
    expect(el.attributes("style")).toContain("--nq-tag-pink");
  });

  it("falls back to the code for an unknown language and localises the sr text in Arabic", () => {
    expect(languageName("zz-not-a-lang", "en")).toBeTruthy();
    const w = mount(
      { components: { NqLangTag, NasaqProvider }, template: `<NasaqProvider locale="ar" target="scope"><NqLangTag lang="en" /></NasaqProvider>` },
    );
    expect(w.find(".sr-only").text()).toMatch(/^لغة المحتوى: /);
  });
});
