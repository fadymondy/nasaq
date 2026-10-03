<script setup lang="ts">
import { NqProductReviews, type ProductReview } from "@fadymondy/nasaq/vue";

const reviews: ProductReview[] = [
  { id: "r1", author: "Sara", rating: 5, title: "Worth it", body: "Great quality, arrived on time and fits perfectly.", date: "2026-03-02", verified: true, helpful: 12 },
  { id: "r2", author: "Omar", rating: 4, body: "Good value for the price, the strap could be softer.", date: "2026-02-11", verified: true, helpful: 4, reply: { author: "Support", body: "Thanks Omar, we are improving the strap.", date: "2026-02-12" } },
  { id: "r3", author: "Lina", rating: 2, body: "Not what I expected from the photos, a little too small.", date: "2026-01-20", helpful: 1 },
];

// Each handler may return { error } (or throw) to roll the action back and show a message.
const api = {
  post: async (_review: unknown) => undefined,
  vote: async (_id: string, _voted: boolean) => undefined,
  report: async (_id: string, _reason: string, _note: string) => undefined,
};
</script>

<template>
  <NqProductReviews
    :reviews="reviews"
    :on-submit-review="async (review) => api.post(review)"
    :on-vote-helpful="async (id, voted) => api.vote(id, voted)"
    :on-report="async (id, { reason, note }) => api.report(id, reason, note)"
  />
</template>
