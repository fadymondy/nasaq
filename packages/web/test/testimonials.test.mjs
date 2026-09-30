import assert from "node:assert/strict";
import { test } from "node:test";
import { testimonialOrder, testimonialStep, testimonialStats, validateTestimonial } from "../src/components/testimonials/testimonials-logic.ts";

test("validates name, quote length by characters, rating and optional email", () => {
  assert.deepEqual(validateTestimonial({ name: "", quote: "" }), { name: "name", quote: "quote-short" });
  assert.deepEqual(validateTestimonial({ name: "Sara", quote: "Great tool, truly." }), {});
  assert.deepEqual(validateTestimonial({ name: "Sara", quote: "x".repeat(601) }), { quote: "quote-long" });
  // Arabic counts by character, not bytes: 10 letters is enough.
  assert.deepEqual(validateTestimonial({ name: "سارة", quote: "ممتازةممتا" }), {});
  assert.deepEqual(validateTestimonial({ name: "S", quote: "long enough quote", rating: 6 }), { rating: "rating" });
  assert.deepEqual(validateTestimonial({ name: "S", quote: "long enough quote", email: "nope" }), { email: "email" });
  assert.deepEqual(validateTestimonial({ name: "S", quote: "long enough quote", email: "" }), {});
});

test("consent and rating can be required", () => {
  const ok = { name: "S", quote: "long enough quote" };
  assert.deepEqual(validateTestimonial(ok, { requireConsent: true, requireRating: true }), { rating: "rating", consent: "consent" });
  assert.deepEqual(validateTestimonial({ ...ok, rating: 5, consent: true }, { requireConsent: true, requireRating: true }), {});
});

test("stats ignore unrated testimonials", () => {
  const s = testimonialStats([{ rating: 5 }, { rating: 4 }, { rating: 5 }, {}]);
  assert.equal(s.count, 4);
  assert.equal(s.rated, 3);
  assert.ok(Math.abs(s.average - 14 / 3) < 1e-9);
  assert.deepEqual(s.distribution, [2, 1, 0, 0, 0]);
  assert.equal(testimonialStats([]).average, null);
});

test("spotlight order: featured, then rating, then newest, stable otherwise", () => {
  const list = [
    { id: "a", rating: 4, date: "2026-01-01" },
    { id: "b", rating: 5, date: "2026-02-01" },
    { id: "c", featured: true, rating: 3 },
    { id: "d", rating: 5, date: "2026-03-01" },
    { id: "e", rating: 5, date: "2026-03-01" },
  ];
  assert.deepEqual(testimonialOrder(list).map((t) => t.id), ["c", "d", "e", "b", "a"]);
  assert.deepEqual(list.map((t) => t.id), ["a", "b", "c", "d", "e"]);
});

test("spotlight step wraps both ways", () => {
  assert.equal(testimonialStep(2, 1, 3), 0);
  assert.equal(testimonialStep(0, -1, 3), 2);
  assert.equal(testimonialStep(0, 1, 0), 0);
});
