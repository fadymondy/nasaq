import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NqTestimonialForm, NqTestimonialWall, TESTIMONIAL_QUOTE_MIN, testimonialStep, validateTestimonial, type Testimonial } from ".";

const items: Testimonial[] = [
  { id: "a", name: "Ada Lovelace", role: "CTO", company: "Acme", quote: "Wonderful to work with, every single day.", rating: 4, date: "2026-01-01" },
  { id: "b", name: "Grace Hopper", quote: "Debugged our whole stack in an afternoon.", rating: 5, featured: true },
  { id: "c", name: "Alan Turing", quote: "Computable, and delightful besides." },
];
const longQuote = "x".repeat(TESTIMONIAL_QUOTE_MIN + 5);

afterEach(() => vi.useRealTimers());

describe("NqTestimonialForm", () => {
  it("renders the fields, the honeypot and the send button", () => {
    const w = mount(NqTestimonialForm);
    expect(w.attributes("data-slot")).toBe("testimonial-form");
    expect(w.findAll('[data-slot="field"]').map((f) => f.attributes("data-field") ?? "-")).toEqual(["name", "-", "-", "rating", "quote", "consent"]);
    expect(w.find('input[name="website_url"]').attributes("tabindex")).toBe("-1");
    expect(w.find('button[type="submit"]').text()).toBe("Send testimonial");
  });

  it("shows validation errors and does not submit", async () => {
    const onSubmit = vi.fn();
    const w = mount(NqTestimonialForm, { props: { onSubmit } });
    await w.trigger("submit");
    const errs = w.findAll('[data-slot="field-error"]').map((e) => e.text());
    expect(errs).toContain("Enter your name.");
    expect(errs).toContain("Write a little more.");
    expect(errs).toContain("Please agree so we can show it.");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits trimmed values, then thanks and resets", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqTestimonialForm, { props: { onSubmit } });
    const inputs = w.findAll("input[type=text], input:not([type])");
    await inputs[0]!.setValue(" Ada ");
    await w.find("textarea").setValue(` ${longQuote} `);
    await w.findAll('button[aria-pressed]')[3]!.trigger("click");
    await w.find('[role="checkbox"]').trigger("click");
    await w.trigger("submit");
    await flushPromises();
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: "Ada", quote: longQuote, rating: 4, consent: true }));
    expect(w.attributes("data-state")).toBe("done");
    await w.find("button").trigger("click");
    expect(w.attributes("data-state")).toBeUndefined();
  });

  it("treats a filled honeypot as done without calling onSubmit", async () => {
    const onSubmit = vi.fn();
    const w = mount(NqTestimonialForm, { props: { onSubmit, requireConsent: false } });
    await w.findAll("input")[0]!.setValue("Ada");
    await w.find("textarea").setValue(longQuote);
    await w.find('input[name="website_url"]').setValue("bot");
    await w.trigger("submit");
    await flushPromises();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(w.attributes("data-state")).toBe("done");
  });

  it("reads Arabic", () => {
    const w = mount(NqTestimonialForm, { props: { locale: "ar" } });
    expect(w.find('button[type="submit"]').text()).toBe("أرسل الشهادة");
  });
});

describe("NqTestimonialWall", () => {
  it("lays out a wall in the given order", () => {
    const w = mount(NqTestimonialWall, { props: { items } });
    expect(w.attributes("data-layout")).toBe("wall");
    expect(w.findAll('[data-slot="testimonial"]').map((f) => f.attributes("data-id"))).toEqual(["a", "b", "c"]);
    expect(w.find('[role="img"]').attributes("aria-label")).toBe("Rated 4 out of 5");
  });

  it("lays out a grid", () => {
    const w = mount(NqTestimonialWall, { props: { items, layout: "grid" } });
    expect(w.attributes("data-layout")).toBe("grid");
    expect(w.classes()).toContain("grid");
  });

  it("shows the empty state", () => {
    const w = mount(NqTestimonialWall, { props: { items: [] } });
    expect(w.text()).toContain("No testimonials yet.");
  });

  it("spotlights featured first and steps with the buttons and dots", async () => {
    const w = mount(NqTestimonialWall, { props: { items, layout: "spotlight" } });
    expect(w.attributes("aria-roledescription")).toBe("carousel");
    expect(w.find('[data-slot="testimonial"]').attributes("data-id")).toBe("b");
    await w.find('button[aria-label="Next testimonial"]').trigger("click");
    expect(w.find('[data-slot="testimonial"]').attributes("data-id")).toBe("a");
    await w.find('button[aria-label="Previous testimonial"]').trigger("click");
    expect(w.find('[data-slot="testimonial"]').attributes("data-id")).toBe("b");
    await w.find('button[aria-label="Testimonial 3"]').trigger("click");
    expect(w.find('[data-slot="testimonial"]').attributes("data-id")).toBe("c");
    expect(w.find('button[aria-label="Testimonial 3"]').attributes("aria-current")).toBe("true");
  });

  it("advances by itself", async () => {
    vi.useFakeTimers();
    const w = mount(NqTestimonialWall, { props: { items, layout: "spotlight", autoAdvance: 1000 } });
    await vi.advanceTimersByTimeAsync(1000);
    expect(w.find('[data-slot="testimonial"]').attributes("data-id")).toBe("a");
  });

  it("makes cards focusable when they have actions", () => {
    const w = mount(NqTestimonialWall, { props: { items, itemActions: () => [{ id: "hide", label: "Hide", onSelect: () => {} }] } });
    expect(w.find('[data-slot="testimonial"]').attributes("tabindex")).toBe("0");
  });
});

describe("testimonial logic", () => {
  it("validates and steps", () => {
    expect(validateTestimonial({ name: "", quote: "short" })).toEqual({ name: "name", quote: "quote-short" });
    expect(testimonialStep(0, -1, 3)).toBe(2);
  });
});
