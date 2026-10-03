<script setup lang="ts">
import { Clock } from "lucide-vue-next";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqIcon } from "../icon";
import { NqDateTime, formatNumber } from "../numeric";
import type { BlogPostSummary } from "./blog-model";
import { fill, useBlogStrings, type BlogIndexLabels } from "./labels";

// Meta line: date and reading time.
interface Props {
  post: BlogPostSummary;
  labels?: Partial<BlogIndexLabels>;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const { t, locale } = useBlogStrings(() => props.labels);
</script>

<template>
  <p :class="cn('flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground', props.class)">
    <NqDateTime :value="props.post.date" :format="{ dateStyle: 'medium' }" />
    <span v-if="props.post.readingMinutes" class="inline-flex items-center gap-1">
      <NqIcon :icon="Clock" class="size-3" />
      {{ fill(t.minRead, { n: formatNumber(props.post.readingMinutes, locale) }) }}
    </span>
  </p>
</template>
