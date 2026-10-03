import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent } from "vue";
import { NqAvatar, NqAvatarFallback, NqAvatarImage, initials } from ".";

describe("initials", () => {
  it("takes the first and last word", () => {
    expect(initials("Fady Mondy")).toBe("FM");
    expect(initials("نور عادل")).toBe("نع");
    expect(initials("Mahaam")).toBe("M");
    expect(initials("")).toBe("");
  });
});

describe("NqAvatar", () => {
  it("shows initials at once without src, labelled by name", () => {
    const w = mount(NqAvatar, { props: { name: "Fady Mondy" } });
    expect(w.element.tagName).toBe("SPAN");
    expect(w.attributes("data-slot")).toBe("avatar");
    expect(w.classes()).toEqual(expect.arrayContaining(["size-8", "rounded-full", "bg-secondary"]));
    const fb = w.find("span[role=img]");
    expect(fb.text()).toBe("FM");
    expect(fb.attributes("aria-label")).toBe("Fady Mondy");
  });

  it("size and shape pick the React classes; user class wins", () => {
    const w = mount(NqAvatar, { props: { name: "Acme", size: "lg", shape: "square" }, attrs: { class: "size-12" } });
    expect(w.classes()).toEqual(expect.arrayContaining(["rounded-control", "size-12"]));
    expect(w.classes()).not.toContain("size-10");
  });

  it("fallback slot replaces the initials", () => {
    const w = mount(NqAvatar, { slots: { fallback: "*" } });
    expect(w.text()).toBe("*");
  });

  it("composes with the image and fallback parts", () => {
    const w = mount(NqAvatar, {
      slots: { default: defineComponent({ components: { NqAvatarImage, NqAvatarFallback }, template: "<NqAvatarFallback>FM</NqAvatarFallback>" }) },
    });
    const fb = w.find('[data-slot="avatar-fallback"]');
    expect(fb.text()).toBe("FM");
    expect(fb.classes()).toContain("size-full");
  });
});

describe("initials with punctuation", () => {
  it("skips leading punctuation and ignores punctuation-only words", () => {
    expect(initials("(Test) Driver")).toBe("TD");
    expect(initials("- Fady")).toBe("F");
    expect(initials("«نور» عادل")).toBe("نع");
  });
});
