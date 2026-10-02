<script setup lang="ts">
import { ref } from "vue";
import { NqSeoPreview, type SeoMeta } from "@fadymondy/nasaq/vue";

const meta = ref<SeoMeta>({
  title: "A complete guide to RTL design systems",
  description: "Learn how to build interfaces that work from right to left without a second stylesheet.",
  url: "https://example.com/blog/rtl-guide",
});
</script>

<template>
  <NqSeoPreview v-model="meta" />
</template>
