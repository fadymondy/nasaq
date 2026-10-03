import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NqHandwrittenMark, NqHandwrittenNote, NqMarquee, NqTextFlip, NqTextReveal, NqTextShimmer, marqueeCopies, nextFlipIndex, splitText } from ".";


describe("text-effects", () => {
  it("TextFlip exposes every phrase to assistive tech", () => {
    const w = mount(NqTextFlip, { props: { phrases: ["faster", "safer"] } });
    const root = w.get("[data-slot=text-flip]");
    expect(root.text()).toContain("faster");
    expect(root.text()).toContain("safer");
  });

  it("nextFlipIndex loops", () => {
    expect(nextFlipIndex(1, 2, true)).toBe(0);
  });

  it("TextShimmer renders its content", () => {
    const w = mount(NqTextShimmer, { slots: { default: "Thinking" } });
    expect(w.get("[data-slot=text-shimmer]").text()).toBe("Thinking");
  });

  it("TextReveal keeps the full text for screen readers and splits by word", () => {
    const w = mount(NqTextReveal, { props: { text: "one two three", immediate: true } });
    const root = w.get("[data-slot=text-reveal]");
    expect(root.get(".sr-only").text()).toBe("one two three");
    expect(root.attributes("data-split")).toBe("word");
    expect(splitText("one two", "word", "en").tokens.length).toBeGreaterThan(2);
  });

  it("Marquee repeats its content", () => {
    const w = mount(NqMarquee, { slots: { default: "<span>A</span>" } });
    expect(w.find("[data-slot=marquee]").exists()).toBe(true);
    expect(marqueeCopies(100, 400)).toBeGreaterThanOrEqual(2);
  });

  it("HandwrittenNote renders the note and author", () => {
    const w = mount(NqHandwrittenNote, { props: { author: "Fady" }, slots: { default: "Hello" }, attrs: { id: "n1" } });
    const root = w.get("[data-slot=handwritten-note]");
    expect(root.text()).toContain("Hello");
    expect(root.text()).toContain("Fady");
    expect(root.attributes("id")).toBe("n1");
  });

  it("HandwrittenMark is drawn when not animated", () => {
    const w = mount(NqHandwrittenMark, { props: { kind: "circle", animate: false }, slots: { default: "this" } });
    const root = w.get("[data-slot=handwritten-mark]");
    expect(root.attributes("data-kind")).toBe("circle");
    expect(root.attributes("data-drawn")).toBeDefined();
  });
});
