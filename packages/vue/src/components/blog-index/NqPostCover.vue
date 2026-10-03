<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { TAG_HUES } from "../badge";
import type { BlogPostSummary } from "./blog-model";
import { hash } from "./labels";

// The post's cover image, or when it has none a soft generated cover in the hue of its slug. Decorative art carries no text.
interface Props {
  post: Pick<BlogPostSummary, "slug" | "cover" | "coverAlt" | "title">;
  /** Aspect ratio class. Default 16/9. */
  ratio?: string;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { ratio: "aspect-video" });
const art = computed(() => {
  const h = hash(props.post.slug);
  const a = TAG_HUES[1 + (h % (TAG_HUES.length - 1))];
  const b = TAG_HUES[1 + ((h >> 3) % (TAG_HUES.length - 1))];
  return {
    "--cover-a": `var(--nq-tag-${a})`,
    "--cover-a-soft": `var(--nq-tag-${a}-soft)`,
    "--cover-b-soft": `var(--nq-tag-${b}-soft)`,
    "--cover-x": `${20 + (h % 50)}%`,
    "--cover-y": `${20 + ((h >> 5) % 50)}%`,
  };
});
</script>

<template>
  <div data-slot="post-cover" :class="cn('relative w-full overflow-hidden rounded-card border border-border bg-secondary', props.ratio, props.class)">
    <img v-if="props.post.cover" :src="props.post.cover" :alt="props.post.coverAlt ?? ''" loading="lazy" class="size-full object-cover" />
    <div
      v-else
      aria-hidden="true"
      :style="art"
      class="size-full bg-[radial-gradient(circle_at_var(--cover-x)_var(--cover-y),var(--cover-a-soft),transparent_55%),linear-gradient(135deg,var(--cover-a-soft),var(--cover-b-soft))]"
    >
      <div class="absolute -bottom-1/4 -end-[8%] size-2/5 rounded-full border-2 border-[var(--cover-a)] opacity-40" />
      <div class="absolute start-[10%] top-[16%] size-6 rounded-full bg-[var(--cover-a)] opacity-30" />
    </div>
  </div>
</template>
