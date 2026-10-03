import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  NqProductQA,
  NqProductReviewForm,
  NqProductReviews,
  NqProductReviewSummary,
  filterProductReviews,
  summarizeProductReviews,
  validateProductReview,
  type ProductQuestion,
  type ProductReview,
} from ".";

const reviews: ProductReview[] = [
  { id: "a", author: "Sara", rating: 5, body: "Great quality and fast delivery, love it.", date: "2026-03-01", verified: true, helpful: 3, photos: [{ src: "/p.jpg" }] },
  { id: "b", author: "Omar", rating: 4, body: "Good value for the price, strap could be softer.", date: "2026-02-01", helpful: 9 },
  { id: "c", author: "Lina", rating: 2, body: "Smaller than the photos suggest, a bit disappointing.", date: "2026-01-01", helpful: 1 },
];
const questions: ProductQuestion[] = [
  { id: "q1", author: "Nour", question: "Does it work with iOS?", date: "2026-03-01", votes: 2, answers: [{ id: "x", author: "Shop", body: "Yes, iOS 15 and up.", date: "2026-03-02", seller: true, votes: 1 }] },
  { id: "q2", author: "Hadi", question: "Is the strap washable?", date: "2026-02-01", votes: 5, answers: [] },
];

afterEach(() => (document.body.innerHTML = ""));

describe("review logic", () => {
  it("summarises, filters and validates", () => {
    expect(summarizeProductReviews(reviews)).toMatchObject({ count: 3, average: 3.7 });
    expect(filterProductReviews(reviews, { stars: [5], verifiedOnly: true })).toHaveLength(1);
    expect(validateProductReview({ rating: 0, title: "", body: "short" })).toEqual({ rating: "rating-required", body: "body-too-short" });
  });
});

describe("NqProductReviewSummary", () => {
  it("shows the average and emits toggle-star from a histogram row", async () => {
    const w = mount(NqProductReviewSummary, { props: { summary: summarizeProductReviews(reviews), selectable: true, selectedStars: [4] } });
    expect(w.attributes("data-slot")).toBe("product-review-summary");
    expect(w.text()).toContain("3.7");
    const rows = w.findAll("button[aria-pressed]");
    expect(rows).toHaveLength(5);
    expect(rows[1]!.attributes("aria-pressed")).toBe("true");
    await rows[0]!.trigger("click");
    expect(w.emitted("toggle-star")![0]).toEqual([5]);
  });
});

describe("NqProductReviews", () => {
  it("lists reviews, filters by star and clears", async () => {
    const onFilters = vi.fn();
    const w = mount(NqProductReviews, { props: { reviews, "onFilters-change": onFilters } as never, attachTo: document.body });
    expect(w.attributes("data-slot")).toBe("product-reviews");
    expect(w.findAll("h3").map((h) => h.text())).toContain("Photos from customers");
    expect(w.text()).toContain("Showing 3 of 3 reviews");
    await w.get('[data-slot="product-review-summary"] button[aria-pressed]').trigger("click");
    expect(w.text()).toContain("Showing 1 of 1 reviews");
    expect(onFilters).toHaveBeenCalledWith(expect.objectContaining({ stars: [5] }));
    expect(w.findAll("[data-star-pill]")).toHaveLength(1);
    const clear = w.findAll("button").find((b) => b.text() === "Clear filters")!;
    await clear.trigger("click");
    expect(w.text()).toContain("Showing 3 of 3 reviews");
  });

  it("votes helpful optimistically and rolls back on error", async () => {
    const vote = vi.fn().mockResolvedValue({ error: "no" });
    const w = mount(NqProductReviews, { props: { reviews, onVoteHelpful: vote }, attachTo: document.body });
    const btn = () => w.findAll("button").find((b) => b.text().startsWith("Helpful (9)") || b.text().startsWith("Helpful (10)"))!;
    await btn().trigger("click");
    expect(vote).toHaveBeenCalledWith("b", true);
    await flushPromises();
    expect(btn().text()).toBe("Helpful (9)");
    expect(w.text()).toContain("Could not save your vote");
  });

  it("shows the empty and error states", () => {
    expect(mount(NqProductReviews, { props: { reviews: [] } }).text()).toContain("No reviews yet");
    expect(mount(NqProductReviews, { props: { reviews, error: true } }).text()).toContain("Could not load the reviews.");
    expect(mount(NqProductReviews, { props: { reviews, loading: true } }).find('[aria-busy="true"]').exists()).toBe(true);
  });
});

describe("NqProductReviewForm", () => {
  it("validates, then sends and shows the thank-you", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqProductReviewForm, { props: { onSubmit }, attachTo: document.body });
    await w.get("form").trigger("submit");
    expect(onSubmit).not.toHaveBeenCalled();
    expect(w.text()).toContain("Choose a star rating.");
    await w.get('[role="radio"][aria-label="4 out of 5"]').trigger("click");
    await w.get("textarea").setValue("It does everything I need and more.");
    await w.get("form").trigger("submit");
    await flushPromises();
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ rating: 4, body: "It does everything I need and more." }));
    expect(w.text()).toContain("Thanks for your review");
  });

  it("keeps the form open with the message when the send fails", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ error: "Server said no" });
    const w = mount(NqProductReviewForm, { props: { onSubmit }, attachTo: document.body });
    await w.get('[role="radio"][aria-label="5 out of 5"]').trigger("click");
    await w.get("textarea").setValue("Good enough review body here ok.");
    await w.get("form").trigger("submit");
    await flushPromises();
    expect(w.text()).toContain("Server said no");
    expect(w.find("form").exists()).toBe(true);
  });
});

describe("NqProductQA", () => {
  it("sorts by votes, searches and upvotes", async () => {
    const w = mount(NqProductQA, { props: { questions }, attachTo: document.body });
    expect(w.findAll("h3").map((h) => h.text())).toEqual(["Is the strap washable?", "Does it work with iOS?"]);
    await w.get('input[type="search"]').setValue("ios");
    expect(w.findAll("h3")).toHaveLength(1);
    const up = w.get('[aria-pressed="false"]');
    await up.trigger("click");
    await flushPromises();
    expect(w.get('[aria-pressed="true"]').text()).toBe("3");
    expect(w.text()).toContain("Seller");
  });

  it("asks a question through onAsk", async () => {
    const onAsk = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqProductQA, { props: { questions, onAsk }, attachTo: document.body });
    await w.get("form textarea").setValue("hi");
    await w.get("form").trigger("submit");
    expect(w.text()).toContain("Add a little more detail.");
    await w.get("form textarea").setValue("Does it come in blue?");
    await w.get("form").trigger("submit");
    await flushPromises();
    expect(onAsk).toHaveBeenCalledWith("Does it come in blue?");
    expect(w.text()).toContain("Your question was posted.");
  });
});
