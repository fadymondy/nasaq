<script setup lang="ts">
import { NqTestimonialForm, NqTestimonialWall, type Testimonial, type TestimonialSubmission } from "@fadymondy/nasaq/vue";

const items: Testimonial[] = [
  { id: "1", name: "Layla Hassan", role: "CTO", company: "Acme", quote: "We shipped our dashboard in a week instead of a month.", rating: 5, date: "2026-09-01", featured: true },
  { id: "2", name: "Omar Khalil", role: "Designer", company: "Studio Nine", quote: "Arabic and English both just work, mirrored correctly.", rating: 5, date: "2026-08-14" },
  { id: "3", name: "Nora Adel", quote: "Solid components and clear docs.", rating: 4, date: "2026-07-02" },
];

// Your API call. Throw to keep the form.
async function send(submission: TestimonialSubmission) {
  await fetch("/api/testimonials", { method: "POST", body: JSON.stringify(submission) });
}
</script>

<template>
  <div class="grid max-w-3xl gap-8">
    <NqTestimonialWall :items="items" layout="wall" />
    <NqTestimonialForm :on-submit="send" />
  </div>
</template>
