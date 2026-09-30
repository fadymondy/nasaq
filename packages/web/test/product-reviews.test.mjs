import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyHelpfulVote, collectPhotos, filterReviews, fitSummary, hasActiveFilters, histogramPercent, orderAnswers, searchQuestions,
  sortQuestions, sortReviews, starLevel, summarizeReviews, toggleStar, totalPhotos, validateAnswer, validateQuestion, validateReview,
} from "../src/components/product-reviews/review-logic.ts";

const r = (id, rating, extra = {}) => ({ id, author: `Author ${id}`, rating, body: `Body of review ${id}`, date: `2026-09-${String(10 + Number(id)).padStart(2, "0")}T10:00:00Z`, ...extra });
const reviews = [
  r("1", 5, { helpful: 3, verified: true, photos: [{ src: "/a.jpg" }, { src: "/b.jpg" }], fit: "true", title: "Great fit" }),
  r("2", 4, { helpful: 10, fit: "small" }),
  r("3", 1, { helpful: 0, verified: true, body: "Fell apart after a week" }),
  r("4", 5, { helpful: 3, photos: [{ src: "/c.jpg" }], fit: "true" }),
  r("5", 3, { helpful: 1, fit: "large" }),
];

test("starLevel rounds and rejects junk", () => {
  assert.equal(starLevel(4.4), 4);
  assert.equal(starLevel(4.5), 5);
  assert.equal(starLevel(0), 0);
  assert.equal(starLevel(6), 0);
  assert.equal(starLevel(Number.NaN), 0);
});

test("summarizeReviews builds the histogram and a one-decimal average", () => {
  const s = summarizeReviews(reviews);
  assert.deepEqual(s.histogram, { 5: 2, 4: 1, 3: 1, 2: 0, 1: 1 });
  assert.equal(s.count, 5);
  assert.equal(s.average, 3.6);
  assert.deepEqual(summarizeReviews([]), { average: 0, count: 0, histogram: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } });
  assert.equal(summarizeReviews([{ rating: 9 }, { rating: 4 }]).count, 1);
});

test("histogramPercent", () => {
  const { histogram } = summarizeReviews(reviews);
  assert.equal(histogramPercent(histogram, 5), 40);
  assert.equal(histogramPercent(histogram, 2), 0);
  assert.equal(histogramPercent(histogram, 5, 100), 2);
  assert.equal(histogramPercent({ 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }, 5), 0);
});

test("filterReviews combines stars, photos, verified and text", () => {
  assert.deepEqual(filterReviews(reviews, {}).length, 5);
  assert.deepEqual(filterReviews(reviews, { stars: [5] }).map((x) => x.id), ["1", "4"]);
  assert.deepEqual(filterReviews(reviews, { stars: [5, 1] }).map((x) => x.id), ["1", "3", "4"]);
  assert.deepEqual(filterReviews(reviews, { withPhotos: true }).map((x) => x.id), ["1", "4"]);
  assert.deepEqual(filterReviews(reviews, { verifiedOnly: true }).map((x) => x.id), ["1", "3"]);
  assert.deepEqual(filterReviews(reviews, { stars: [5], withPhotos: true, verifiedOnly: true }).map((x) => x.id), ["1"]);
  assert.deepEqual(filterReviews(reviews, { query: "  FELL apart " }).map((x) => x.id), ["3"]);
  assert.deepEqual(filterReviews(reviews, { query: "great" }).map((x) => x.id), ["1"]);
  assert.deepEqual(filterReviews(reviews, { stars: [] }).length, 5);
});

test("toggleStar keeps 5..1 order", () => {
  assert.deepEqual(toggleStar([], 3), [3]);
  assert.deepEqual(toggleStar([3], 5), [5, 3]);
  assert.deepEqual(toggleStar([5, 3], 5), [3]);
  assert.deepEqual(toggleStar(undefined, 1), [1]);
});

test("hasActiveFilters", () => {
  assert.equal(hasActiveFilters({}), false);
  assert.equal(hasActiveFilters({ stars: [], query: "  " }), false);
  assert.equal(hasActiveFilters({ withPhotos: true }), true);
  assert.equal(hasActiveFilters({ stars: [2] }), true);
});

test("sortReviews is stable, copies and orders by each key", () => {
  const before = reviews.map((x) => x.id);
  assert.deepEqual(sortReviews(reviews, "helpful").map((x) => x.id), ["2", "4", "1", "5", "3"]);
  assert.deepEqual(sortReviews(reviews, "newest").map((x) => x.id), ["5", "4", "3", "2", "1"]);
  assert.deepEqual(sortReviews(reviews, "oldest").map((x) => x.id), ["1", "2", "3", "4", "5"]);
  assert.deepEqual(sortReviews(reviews, "highest").map((x) => x.id), ["1", "4", "2", "5", "3"]);
  assert.deepEqual(sortReviews(reviews, "lowest").map((x) => x.id), ["3", "5", "2", "1", "4"]);
  assert.deepEqual(reviews.map((x) => x.id), before);
  const ties = [r("1", 4), { ...r("2", 4), date: r("1", 4).date }];
  assert.deepEqual(sortReviews(ties, "newest").map((x) => x.id), ["1", "2"]);
  assert.deepEqual(sortReviews([{ ...r("1", 4), date: "junk" }, r("2", 4)], "newest").map((x) => x.id), ["2", "1"]);
});

test("collectPhotos tags photos with their review, newest first, capped", () => {
  assert.deepEqual(collectPhotos(reviews).map((p) => `${p.reviewId}:${p.src}`), ["4:/c.jpg", "1:/a.jpg", "1:/b.jpg"]);
  assert.equal(collectPhotos(reviews, 2).length, 2);
  assert.equal(totalPhotos(reviews), 3);
  assert.equal(totalPhotos([]), 0);
});

test("fitSummary is out of those who answered", () => {
  assert.deepEqual(fitSummary(reviews), { answered: 4, small: 25, true: 50, large: 25 });
  assert.deepEqual(fitSummary([{}, {}]), { answered: 0, small: 0, true: 0, large: 0 });
});

test("applyHelpfulVote never goes negative", () => {
  assert.equal(applyHelpfulVote(3, true), 4);
  assert.equal(applyHelpfulVote(3, false), 2);
  assert.equal(applyHelpfulVote(0, false), 0);
  assert.equal(applyHelpfulVote(undefined, true), 1);
});

test("validateReview", () => {
  const good = { rating: 4, title: "Nice", body: "Comfortable and well made, would buy again.", photos: 2 };
  assert.deepEqual(validateReview(good), {});
  assert.deepEqual(validateReview({ ...good, rating: 0 }), { rating: "rating-required" });
  assert.deepEqual(validateReview({ ...good, rating: 3.5 }), { rating: "rating-required" });
  assert.deepEqual(validateReview({ ...good, body: "   " }), { body: "body-required" });
  assert.deepEqual(validateReview({ ...good, body: "too short" }), { body: "body-too-short" });
  assert.deepEqual(validateReview({ ...good, body: "x".repeat(2001) }), { body: "body-too-long" });
  assert.deepEqual(validateReview({ ...good, body: `${" ".repeat(30)}short` }), { body: "body-too-short" });
  assert.deepEqual(validateReview({ ...good, title: "" }), {});
  assert.deepEqual(validateReview({ ...good, title: "" }, { requireTitle: true }), { title: "title-required" });
  assert.deepEqual(validateReview({ ...good, title: "x".repeat(81) }), { title: "title-too-long" });
  assert.deepEqual(validateReview({ ...good, photos: 6 }), { photos: "too-many-photos" });
  assert.deepEqual(validateReview({ ...good, photos: 3 }, { maxPhotos: 2 }), { photos: "too-many-photos" });
  assert.deepEqual(validateReview({ ...good, name: " " }, { requireName: true }), { name: "name-required" });
  assert.deepEqual(Object.keys(validateReview({ rating: 0, title: "", body: "" })).sort(), ["body", "rating"]);
});

test("questions: sort, search, validate, answer order", () => {
  const q = (id, votes, date, answers = []) => ({ id, author: "A", question: `Question ${id} about washing`, date, votes, answers });
  const qs = [q("a", 1, "2026-09-01", []), q("b", 7, "2026-09-02", [{ id: "x", author: "s", body: "Yes, machine wash cold", date: "2026-09-03" }]), q("c", 7, "2026-09-05", [])];
  assert.deepEqual(sortQuestions(qs, "votes").map((x) => x.id), ["c", "b", "a"]);
  assert.deepEqual(sortQuestions(qs, "newest").map((x) => x.id), ["c", "b", "a"]);
  assert.deepEqual(sortQuestions(qs, "answered").map((x) => x.id), ["b", "c", "a"]);
  assert.deepEqual(searchQuestions(qs, "MACHINE").map((x) => x.id), ["b"]);
  assert.equal(searchQuestions(qs, "  ").length, 3);
  assert.equal(validateQuestion(""), "question-required");
  assert.equal(validateQuestion("Does it?"), "question-too-short");
  assert.equal(validateQuestion("Does it shrink in the wash?"), null);
  assert.equal(validateQuestion("x".repeat(301)), "question-too-long");
  assert.equal(validateAnswer("  "), "answer-required");
  assert.equal(validateAnswer("Yes"), null);
  assert.equal(validateAnswer("x".repeat(1001)), "answer-too-long");
  const answers = [
    { id: "1", author: "a", body: "", date: "2026-09-01", votes: 9 },
    { id: "2", author: "b", body: "", date: "2026-09-02", seller: true, votes: 0 },
    { id: "3", author: "c", body: "", date: "2026-09-03", votes: 9 },
  ];
  assert.deepEqual(orderAnswers(answers).map((x) => x.id), ["2", "3", "1"]);
});
