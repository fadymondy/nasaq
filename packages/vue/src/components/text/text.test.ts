import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NqKbd, NqText } from ".";

describe("NqText", () => {
  it("defaults to a body paragraph", () => {
    const w = mount(NqText, { slots: { default: "Hello" } });
    expect(w.element.tagName).toBe("P");
    expect(w.attributes("data-slot")).toBe("text");
    expect(w.classes()).toEqual(expect.arrayContaining(["text-body", "text-nq-fg-body"]));
  });

  it("picks the element and classes from the variant, and `as` overrides the element", () => {
    expect(mount(NqText, { props: { variant: "h1" } }).element.tagName).toBe("H1");
    expect(mount(NqText, { props: { variant: "eyebrow" } }).classes()).toContain("eyebrow");
    const code = mount(NqText, { props: { variant: "code" } });
    expect(code.element.tagName).toBe("CODE");
    expect(code.classes()).toEqual(expect.arrayContaining(["font-mono", "text-code"]));
    const w = mount(NqText, { props: { variant: "h2", as: "div" }, attrs: { class: "text-center" } });
    expect(w.element.tagName).toBe("DIV");
    expect(w.classes()).toEqual(expect.arrayContaining(["text-h2", "text-center"]));
  });
});

describe("NqKbd", () => {
  it("is a left-to-right key cap, an img when labelled", () => {
    const w = mount(NqKbd, { props: { ariaLabel: "Command" }, slots: { default: "Cmd" } });
    expect(w.element.tagName).toBe("KBD");
    expect(w.attributes("dir")).toBe("ltr");
    expect(w.attributes("role")).toBe("img");
    expect(w.attributes("aria-label")).toBe("Command");
    expect(mount(NqKbd, { slots: { default: "K" } }).attributes("role")).toBeUndefined();
  });
});
