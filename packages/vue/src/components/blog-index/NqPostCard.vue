<script setup lang="ts">
import { ArrowRight } from "lucide-vue-next";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqAvatar } from "../avatar";
import { NqBadge } from "../badge";
import { NqIcon } from "../icon";
import type { BlogPostSummary } from "./blog-model";
import { hueFor, useBlogStrings, type BlogIndexLabels } from "./labels";
import NqPostCover from "./NqPostCover.vue";
import NqPostMeta from "./NqPostMeta.vue";

// One article in a list: cover, category, title (the whole card is the link), excerpt, date and reading time.
interface Props {
  post: BlogPostSummary;
  /** Link target. Default `#slug`. */
  href?: string;
  /** `default` cover above the text, `featured` cover beside a large title, `compact` no cover, for lists and related posts. */
  variant?: "default" | "featured" | "compact";
  labels?: Partial<BlogIndexLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { variant: "default" });
/** Fired when the card's link is activated (in addition to following `href`). */
const emit = defineEmits<{ open: [post: BlogPostSummary] }>();
const { t } = useBlogStrings(() => props.labels);
</script>

<template>
  <article
    data-slot="post-card"
    :data-variant="props.variant"
    :class="
      cn(
        'group/post relative flex min-w-0 gap-4',
        props.variant === 'featured' ? '@3xl:grid @3xl:grid-cols-2 @3xl:items-center @3xl:gap-8 flex-col' : 'flex-col',
        props.variant === 'compact' && 'gap-2 rounded-card border border-border bg-card p-4 transition-colors duration-150 ease-nq hover:bg-nq-hover',
        props.class,
      )
    "
  >
    <NqPostCover
      v-if="props.variant !== 'compact'"
      :post="props.post"
      :class="cn('transition-[border-color] duration-150 ease-nq group-hover/post:border-nq-line-strong', props.variant === 'featured' && '@3xl:aspect-[4/3]')"
    />
    <div :class="cn('flex min-w-0 flex-col items-start gap-2', props.variant === 'featured' && 'gap-3')">
      <div class="flex flex-wrap items-center gap-2">
        <NqBadge v-if="props.variant === 'featured'" variant="accent">{{ t.featured }}</NqBadge>
        <NqBadge variant="tag" :hue="hueFor(props.post.category)">{{ props.post.category }}</NqBadge>
      </div>
      <h3 :class="cn('text-balance text-foreground', props.variant === 'featured' ? 'text-h1' : 'text-h3')">
        <a
          :href="props.href ?? `#${props.post.slug}`"
          dir="auto"
          class="rounded-[2px] outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-nq-focus"
          @click="emit('open', props.post)"
        >
          {{ props.post.title }}
        </a>
      </h3>
      <p dir="auto" :class="cn('text-pretty text-muted-foreground', props.variant === 'featured' ? 'text-body' : 'line-clamp-3 text-body-sm')">
        {{ props.post.excerpt }}
      </p>
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span v-if="props.post.author" class="inline-flex items-center gap-1.5 text-caption text-muted-foreground">
          <NqAvatar :name="props.post.author.name" :src="props.post.author.avatar" size="xs" />
          <bdi>{{ props.post.author.name }}</bdi>
        </span>
        <NqPostMeta :post="props.post" :labels="props.labels" />
      </div>
      <span v-if="props.variant === 'featured'" class="mt-1 inline-flex items-center gap-1 text-label text-foreground">
        {{ t.readMore }}
        <NqIcon :icon="ArrowRight" class="size-4 transition-transform duration-150 ease-nq group-hover/post:translate-x-0.5 rtl:group-hover/post:-translate-x-0.5" />
      </span>
    </div>
  </article>
</template>
