<script setup lang="ts">
import { NqBlogIndex, type BlogPostSummary } from "@fadymondy/nasaq/vue";

const posts: BlogPostSummary[] = [
  { slug: "tokens", title: "Design tokens, one source", excerpt: "How one token file feeds React, Vue and Blade.", category: "Design", tags: ["tokens", "css"], date: "2026-04-02", readingMinutes: 5, featured: true },
  { slug: "rtl", title: "Right to left, properly", excerpt: "Logical properties instead of mirrored copies.", category: "Engineering", tags: ["rtl", "css"], date: "2026-03-12", readingMinutes: 7 },
  { slug: "forms", title: "Forms that explain themselves", excerpt: "Inline errors, helpful hints, no surprises.", category: "Product", tags: ["forms"], date: "2026-02-20", readingMinutes: 4 },
];
</script>

<template>
  <NqBlogIndex title="Blog" description="Notes on design and engineering." :posts="posts" :post-href="(p) => `/blog/${p.slug}`" />
</template>
