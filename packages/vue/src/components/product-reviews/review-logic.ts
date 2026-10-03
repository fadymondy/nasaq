/*
 * Pure reviews and Q&A logic (verbatim from packages/web): the rating histogram, filters, sorting, fit summary, helpful votes,
 * the write-a-review validation and the question and answer helpers. No Vue and no runtime imports, so node tests can load it.
 */

/* The review and Q&A data types (the shared commerce model of packages/web, declared here because the Vue package has no lib/commerce). */
export type ReviewFit = "small" | "true" | "large";
export interface ReviewPhoto {
  src: string;
  alt?: string;
}
export interface ProductReview {
  id: string;
  author: string;
  /** 1 to 5. */
  rating: number;
  title?: string;
  body: string;
  /** ISO date. */
  date: string;
  /** Bought this product from the store. */
  verified?: boolean;
  photos?: readonly ReviewPhoto[];
  /** Helpful votes from other shoppers. */
  helpful?: number;
  /** The variant they bought, e.g. "Black · M". */
  variantLabel?: string;
  fit?: ReviewFit;
  reply?: { author: string; body: string; date: string };
}
export interface ProductAnswer {
  id: string;
  author: string;
  body: string;
  date: string;
  /** Answered by the store or brand. */
  seller?: boolean;
  votes?: number;
}
export interface ProductQuestion {
  id: string;
  author: string;
  question: string;
  date: string;
  votes?: number;
  answers: readonly ProductAnswer[];
}
export const STAR_LEVELS = [5, 4, 3, 2, 1] as const;
export type StarLevel = (typeof STAR_LEVELS)[number];

export interface ReviewSummary {
  average: number;
  count: number;
  /** Reviews per star level. */
  histogram: Record<StarLevel, number>;
}

const emptyHistogram = (): Record<StarLevel, number> => ({ 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });

/** Rounds to a valid star level, or 0 for junk. */
export function starLevel(rating: number): 0 | StarLevel {
  const r = Math.round(rating);
  return r >= 1 && r <= 5 ? (r as StarLevel) : 0;
}

/** Counts, total and average (one decimal, rounded half up) from a list of reviews. */
export function summarizeReviews(reviews: readonly Pick<ProductReview, "rating">[]): ReviewSummary {
  const histogram = emptyHistogram();
  let sum = 0;
  let count = 0;
  for (const review of reviews) {
    const level = starLevel(review.rating);
    if (!level) continue;
    histogram[level]++;
    sum += level;
    count++;
  }
  return { average: count ? Math.round((sum / count) * 10) / 10 : 0, count, histogram };
}

/** Share of a level as a whole percent of `count`. The five shares of a full histogram may not add to exactly 100. */
export function histogramPercent(histogram: Record<StarLevel, number>, level: StarLevel, count?: number): number {
  const total = count ?? STAR_LEVELS.reduce((n, l) => n + histogram[l], 0);
  return total > 0 ? Math.round((histogram[level] / total) * 100) : 0;
}

export type ReviewSort = "helpful" | "newest" | "oldest" | "highest" | "lowest";

export interface ReviewFilters {
  /** Show only these star levels. Empty or omitted = all. */
  stars?: readonly StarLevel[];
  withPhotos?: boolean;
  verifiedOnly?: boolean;
  /** Case-insensitive text search in title, body and author. */
  query?: string;
}

export const noReviewFilters: ReviewFilters = { stars: [], withPhotos: false, verifiedOnly: false, query: "" };

export function hasActiveFilters(filters: ReviewFilters): boolean {
  return Boolean(filters.stars?.length || filters.withPhotos || filters.verifiedOnly || filters.query?.trim());
}

/** Toggles one star level in a filter list, keeping the display order 5..1. */
export function toggleStar(stars: readonly StarLevel[] | undefined, level: StarLevel): StarLevel[] {
  const set = new Set(stars ?? []);
  if (set.has(level)) set.delete(level);
  else set.add(level);
  return STAR_LEVELS.filter((l) => set.has(l));
}

export function filterReviews<R extends ProductReview>(reviews: readonly R[], filters: ReviewFilters): R[] {
  const stars = filters.stars?.length ? new Set<number>(filters.stars) : null;
  const q = filters.query?.trim().toLowerCase();
  return reviews.filter((r) => {
    if (stars && !stars.has(starLevel(r.rating))) return false;
    if (filters.withPhotos && !r.photos?.length) return false;
    if (filters.verifiedOnly && !r.verified) return false;
    if (q && !`${r.title ?? ""} ${r.body} ${r.author}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

const time = (iso: string) => {
  const n = Date.parse(iso);
  return Number.isNaN(n) ? 0 : n;
};

/** A stable sort: ties keep their incoming order. The list is copied. */
export function sortReviews<R extends ProductReview>(reviews: readonly R[], sort: ReviewSort): R[] {
  const key: Record<ReviewSort, (a: R, b: R) => number> = {
    helpful: (a, b) => (b.helpful ?? 0) - (a.helpful ?? 0) || time(b.date) - time(a.date),
    newest: (a, b) => time(b.date) - time(a.date),
    oldest: (a, b) => time(a.date) - time(b.date),
    highest: (a, b) => b.rating - a.rating || (b.helpful ?? 0) - (a.helpful ?? 0),
    lowest: (a, b) => a.rating - b.rating || (b.helpful ?? 0) - (a.helpful ?? 0),
  };
  return reviews.map((r, i) => [r, i] as const).sort((a, b) => key[sort](a[0], b[0]) || a[1] - b[1]).map(([r]) => r);
}

/** Photos from all reviews (newest reviews first), each tagged with its review, capped at `limit`. */
export function collectPhotos(reviews: readonly ProductReview[], limit = Infinity): { reviewId: string; src: string; alt?: string }[] {
  const out: { reviewId: string; src: string; alt?: string }[] = [];
  for (const r of sortReviews(reviews, "newest"))
    for (const p of r.photos ?? []) {
      if (out.length >= limit) return out;
      out.push({ reviewId: r.id, src: p.src, ...(p.alt ? { alt: p.alt } : {}) });
    }
  return out;
}

export function totalPhotos(reviews: readonly ProductReview[]): number {
  return reviews.reduce((n, r) => n + (r.photos?.length ?? 0), 0);
}

/** Share of reviewers who said it runs small, true to size or large, in whole percent, out of those who said. */
export function fitSummary(reviews: readonly Pick<ProductReview, "fit">[]): { answered: number; small: number; true: number; large: number } {
  const counts = { small: 0, true: 0, large: 0 };
  for (const r of reviews) if (r.fit) counts[r.fit]++;
  const answered = counts.small + counts.true + counts.large;
  const pct = (n: number) => (answered ? Math.round((n / answered) * 100) : 0);
  return { answered, small: pct(counts.small), true: pct(counts.true), large: pct(counts.large) };
}

/** Optimistic helpful vote: voting adds one, taking the vote back removes it, and the count never goes below zero. */
export function applyHelpfulVote(count: number | undefined, voted: boolean): number {
  return Math.max(0, (count ?? 0) + (voted ? 1 : -1));
}

/* --------------------------------------------------------------- write a review */

export interface ReviewDraft {
  rating: number;
  title: string;
  body: string;
  name?: string;
  fit?: ReviewFit | "";
  photos?: number;
}

export type ReviewFieldError = "rating-required" | "title-required" | "title-too-long" | "body-required" | "body-too-short" | "body-too-long" | "name-required" | "too-many-photos";
export type ReviewErrors = Partial<Record<"rating" | "title" | "body" | "name" | "photos", ReviewFieldError>>;

export interface ReviewRules {
  titleMax?: number;
  bodyMin?: number;
  bodyMax?: number;
  maxPhotos?: number;
  requireTitle?: boolean;
  requireName?: boolean;
}

export const DEFAULT_REVIEW_RULES: Required<ReviewRules> = { titleMax: 80, bodyMin: 20, bodyMax: 2000, maxPhotos: 5, requireTitle: false, requireName: false };

/** Field errors for a draft. Whitespace does not count towards lengths. An empty object means valid. */
export function validateReview(draft: ReviewDraft, rules: ReviewRules = {}): ReviewErrors {
  const r = { ...DEFAULT_REVIEW_RULES, ...rules };
  const errors: ReviewErrors = {};
  if (!starLevel(draft.rating) || draft.rating !== Math.round(draft.rating)) errors.rating = "rating-required";
  const title = draft.title.trim();
  if (!title && r.requireTitle) errors.title = "title-required";
  else if (title.length > r.titleMax) errors.title = "title-too-long";
  const body = draft.body.trim();
  if (!body) errors.body = "body-required";
  else if (body.length < r.bodyMin) errors.body = "body-too-short";
  else if (body.length > r.bodyMax) errors.body = "body-too-long";
  if (r.requireName && !draft.name?.trim()) errors.name = "name-required";
  if ((draft.photos ?? 0) > r.maxPhotos) errors.photos = "too-many-photos";
  return errors;
}

/* --------------------------------------------------------------------------- Q&A */

export type QuestionSort = "votes" | "newest" | "answered";

export function sortQuestions<Q extends ProductQuestion>(questions: readonly Q[], sort: QuestionSort): Q[] {
  const key: Record<QuestionSort, (a: Q, b: Q) => number> = {
    votes: (a, b) => (b.votes ?? 0) - (a.votes ?? 0) || time(b.date) - time(a.date),
    newest: (a, b) => time(b.date) - time(a.date),
    answered: (a, b) => b.answers.length - a.answers.length || (b.votes ?? 0) - (a.votes ?? 0),
  };
  return questions.map((q, i) => [q, i] as const).sort((a, b) => key[sort](a[0], b[0]) || a[1] - b[1]).map(([q]) => q);
}

/** Store answers first, then the most upvoted, then the newest. */
export function orderAnswers<A extends ProductAnswer>(answers: readonly A[]): A[] {
  return answers
    .map((a, i) => [a, i] as const)
    .sort((a, b) => Number(Boolean(b[0].seller)) - Number(Boolean(a[0].seller)) || (b[0].votes ?? 0) - (a[0].votes ?? 0) || time(b[0].date) - time(a[0].date) || a[1] - b[1])
    .map(([a]) => a);
}

/** Case-insensitive search across a question and its answers. */
export function searchQuestions<Q extends ProductQuestion>(questions: readonly Q[], query: string): Q[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...questions];
  return questions.filter((item) => `${item.question} ${item.answers.map((a) => a.body).join(" ")}`.toLowerCase().includes(q));
}

export type QuestionError = "question-required" | "question-too-short" | "question-too-long";

export function validateQuestion(text: string, rules: { min?: number; max?: number } = {}): QuestionError | null {
  const { min = 10, max = 300 } = rules;
  const t = text.trim();
  if (!t) return "question-required";
  if (t.length < min) return "question-too-short";
  if (t.length > max) return "question-too-long";
  return null;
}

export type AnswerError = "answer-required" | "answer-too-long";
export function validateAnswer(text: string, max = 1000): AnswerError | null {
  const t = text.trim();
  if (!t) return "answer-required";
  return t.length > max ? "answer-too-long" : null;
}
