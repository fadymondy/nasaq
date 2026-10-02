<script setup lang="ts">
import { ArrowRight } from "lucide-vue-next";
import { type BlogPostSummary, NqPostCard } from "../blog-index";
import { NqButton } from "../button";
import { NqIcon } from "../icon";
import NqProfileSection from "./NqProfileSection.vue";
import { useProfileStrings, type ProfilePageLabels } from "./strings";

// The latest articles as post cards with a link to the whole blog.
const props = withDefaults(
  defineProps<{
    posts: BlogPostSummary[];
    /** How many to show. Default 3. */
    limit?: number;
    postHref?: (post: BlogPostSummary) => string;
    /** Link to the full archive. */
    allHref?: string;
    labels?: Partial<ProfilePageLabels>;
  }>(),
  { limit: 3 },
);
const { t } = useProfileStrings(() => props.labels);
</script>

<template>
  <NqProfileSection :title="t.writing" :description="t.writingHint" :count="props.posts.length">
    <template v-if="props.allHref" #action>
      <NqButton as="a" :href="props.allHref" variant="link">{{ t.allArticles }}<NqIcon :icon="ArrowRight" /></NqButton>
    </template>
    <div class="grid grid-cols-1 gap-x-6 gap-y-8 @2xl:grid-cols-2 @5xl:grid-cols-3">
      <NqPostCard v-for="p in props.posts.slice(0, props.limit)" :key="p.slug" :post="p" :href="props.postHref?.(p)" />
    </div>
  </NqProfileSection>
</template>
