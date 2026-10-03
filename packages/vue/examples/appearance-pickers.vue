<script setup lang="ts">
import { NqReadingSettings, NqThemeGallery, readingStyleVars, type ReadingPreferences } from "@fadymondy/nasaq/vue";
import { computed, ref } from "vue";

const themes = [
  { id: "paper", label: "Paper", mode: "light" as const, swatches: ["var(--nq-surface)", "var(--nq-surface-soft)", "var(--nq-fg)", "var(--nq-brand)"] },
  { id: "ink", label: "Ink", mode: "dark" as const, swatches: ["var(--nq-fg)", "var(--nq-fg-muted)", "var(--nq-surface)", "var(--nq-brand)"] },
];

const theme = ref("paper");
const reading = ref<ReadingPreferences>({ fontSize: "md", width: "normal", spacing: "normal" });
const vars = computed(() => readingStyleVars(reading.value));
</script>

<template>
  <div class="flex flex-col gap-8">
    <NqThemeGallery v-model="theme" :themes="themes" />
    <NqReadingSettings v-model="reading" />
    <article :style="vars"><!-- uses var(--reading-scale) etc. --></article>
  </div>
</template>
