/*
 * Testimonials, pure: checking a submission, summarising ratings and ordering a spotlight.
 * No runtime imports, so the node tests load it directly.
 */

export interface Testimonial {
  id: string;
  name: string;
  /** "CTO" */
  role?: string;
  /** "Acme" */
  company?: string;
  quote: string;
  /** 1 to 5. */
  rating?: number;
  avatarUrl?: string;
  /** Pinned first in the spotlight. */
  featured?: boolean;
  /** ISO date the testimonial was given. */
  date?: string;
}

export const TESTIMONIAL_QUOTE_MIN = 10;
export const TESTIMONIAL_QUOTE_MAX = 600;

export interface TestimonialInput {
  name: string;
  quote: string;
  email?: string;
  rating?: number | null;
  consent?: boolean;
}

export type TestimonialErrorCode = "name" | "quote-short" | "quote-long" | "rating" | "email" | "consent";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** What is wrong with a submitted testimonial, by field. Email is optional, consent is only checked when asked for. */
export function validateTestimonial(input: TestimonialInput, { requireConsent = false, requireRating = false }: { requireConsent?: boolean; requireRating?: boolean } = {}): Partial<Record<"name" | "quote" | "rating" | "email" | "consent", TestimonialErrorCode>> {
  const errors: Partial<Record<"name" | "quote" | "rating" | "email" | "consent", TestimonialErrorCode>> = {};
  if (input.name.trim() === "") errors.name = "name";
  const length = Array.from(input.quote.trim()).length;
  if (length < TESTIMONIAL_QUOTE_MIN) errors.quote = "quote-short";
  else if (length > TESTIMONIAL_QUOTE_MAX) errors.quote = "quote-long";
  if (input.rating != null && (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5)) errors.rating = "rating";
  if (requireRating && input.rating == null) errors.rating = "rating";
  if (input.email && input.email.trim() !== "" && !EMAIL.test(input.email.trim())) errors.email = "email";
  if (requireConsent && !input.consent) errors.consent = "consent";
  return errors;
}

export interface TestimonialStats {
  count: number;
  /** Average of the rated ones, or null when none is rated. */
  average: number | null;
  rated: number;
  /** Counts for 5, 4, 3, 2 and 1 stars, in that order. */
  distribution: [number, number, number, number, number];
}

export function testimonialStats(list: readonly Pick<Testimonial, "rating">[]): TestimonialStats {
  const distribution: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  let sum = 0;
  let rated = 0;
  for (const t of list) {
    if (typeof t.rating !== "number" || t.rating < 1 || t.rating > 5) continue;
    const stars = Math.round(t.rating);
    distribution[5 - stars] = (distribution[5 - stars] ?? 0) + 1;
    sum += stars;
    rated += 1;
  }
  return { count: list.length, average: rated ? sum / rated : null, rated, distribution };
}

/** Featured first, then higher ratings, then newer ones; otherwise the given order. Does not change the input. */
export function testimonialOrder<T extends Pick<Testimonial, "featured" | "rating" | "date">>(list: readonly T[]): T[] {
  return list
    .map((t, i) => ({ t, i }))
    .sort((a, b) => {
      const f = Number(Boolean(b.t.featured)) - Number(Boolean(a.t.featured));
      if (f) return f;
      const r = (b.t.rating ?? 0) - (a.t.rating ?? 0);
      if (r) return r;
      const d = (b.t.date ?? "").localeCompare(a.t.date ?? "");
      return d || a.i - b.i;
    })
    .map((x) => x.t);
}

/** Next index in a loop; `step` can be negative. */
export function testimonialStep(index: number, step: number, length: number): number {
  return length === 0 ? 0 : (((index + step) % length) + length) % length;
}

export interface TestimonialSubmission {
  name: string;
  role: string;
  company: string;
  email: string;
  quote: string;
  rating: number | null;
  consent: boolean;
}
