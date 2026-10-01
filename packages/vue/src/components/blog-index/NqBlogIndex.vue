<script setup lang="ts">
import { Search, X } from "lucide-vue-next";
import { computed, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { NqChip, NqChipGroup } from "../chip-group";
import { NqIcon } from "../icon";
import { NqInputGroup, NqInputGroupAddon, NqInputGroupInput } from "../input-group";
import { formatNumber } from "../numeric";
import { NqPagination } from "../pagination";
import { NqSectionHeader } from "../section-header";
import { NqEmptyState } from "../states";
import { EMPTY_FILTERS, filterPosts, paginate, pickFeatured, postCategoryCounts, sortByDate, tagCounts, type BlogFilters, type BlogPostSummary } from "./blog-model";
import { fill, useBlogStrings, type BlogIndexLabels } from "./labels";
import NqPostCard from "./NqPostCard.vue";

// The blog's archive page: a featured article, search, category and tag filters, a grid of post cards, and pagination.
// Filtering is done on the client from `posts`; bind `v-model:filters` and `v-model:page` to put them in the URL.
interface Props {
  posts: BlogPostSummary[];
  /** Page heading. Default "Blog". */
  title?: string;
  description?: string;
  /** Articles per page, not counting the featured one. Default 6. */
  pageSize?: number;
  /** Show the featured article above the list on page 1 when no filter is active. Default true. */
  showFeatured?: boolean;
  /** Link for a post. Default `#slug`. */
  postHref?: (post: BlogPostSummary) => string;
  /** How many tags to offer. Default 8. */
  maxTags?: number;
  labels?: Partial<BlogIndexLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { pageSize: 6, showFeatured: true, maxTags: 8 });
const filters = defineModel<BlogFilters>("filters", { default: () => ({ ...EMPTY_FILTERS }) });
const page = defineModel<number>("page", { default: 1 });
const emit = defineEmits<{ open: [post: BlogPostSummary] }>();
const { t, locale } = useBlogStrings(() => props.labels);
const headingId = useId();

function setFilters(next: Partial<BlogFilters>) {
  filters.value = { ...EMPTY_FILTERS, ...filters.value, ...next };
  page.value = 1;
}

const categories = computed(() => postCategoryCounts(props.posts));
const tags = computed(() => tagCounts(props.posts).slice(0, props.maxTags));
const filtered = computed(() => sortByDate(filterPosts(props.posts, filters.value)));
const active = computed(() => Boolean(filters.value.query?.trim() || filters.value.category || filters.value.tag));
const featuredPost = computed(() => (props.showFeatured && !active.value ? pickFeatured(props.posts) : undefined));
const list = computed(() => (featuredPost.value ? filtered.value.filter((p) => p.slug !== featuredPost.value!.slug) : filtered.value));
const paged = computed(() => paginate(list.value, page.value, props.pageSize));
const showFeaturedNow = computed(() => featuredPost.value && paged.value.page === 1);
const count = computed(() => filtered.value.length);
const pageModel = computed({ get: () => paged.value.page, set: (p: number) => (page.value = p) });
</script>

<template>
  <section data-slot="blog-index" :aria-labelledby="headingId" :class="cn('@container flex flex-col gap-8', props.class)">
    <NqSectionHeader as="h1" :heading-id="headingId" :title="props.title ?? t.title" :description="props.description ?? t.description">
      <template v-if="$slots.actions" #action><slot name="actions" /></template>
    </NqSectionHeader>

    <NqPostCard v-if="showFeaturedNow && featuredPost" :post="featuredPost" variant="featured" :href="props.postHref?.(featuredPost)" :labels="props.labels" @open="emit('open', $event)" />

    <div class="flex flex-col gap-3" role="search">
      <NqInputGroup class="max-w-md">
        <NqInputGroupAddon><NqIcon :icon="Search" /></NqInputGroupAddon>
        <NqInputGroupInput
          type="search"
          :aria-label="t.search"
          :placeholder="t.searchPlaceholder"
          :model-value="filters.query"
          class="[&::-webkit-search-cancel-button]:appearance-none"
          @update:model-value="setFilters({ query: String($event ?? '') })"
        />
        <NqInputGroupAddon v-if="filters.query" align="end">
          <NqButton variant="ghost" size="icon-sm" :aria-label="t.clearSearch" @click="setFilters({ query: '' })"><NqIcon :icon="X" /></NqButton>
        </NqInputGroupAddon>
      </NqInputGroup>
      <NqChipGroup v-if="categories.length > 1" :ariaLabel="t.categories" :model-value="filters.category" @update:model-value="setFilters({ category: $event })">
        <NqChip value="">{{ t.all }}</NqChip>
        <NqChip v-for="c in categories" :key="c.value" :value="c.value">
          {{ c.value }}
          <span class="text-muted-foreground">{{ formatNumber(c.count, locale) }}</span>
        </NqChip>
      </NqChipGroup>
      <NqChipGroup v-if="tags.length > 0" :ariaLabel="t.tags" :model-value="filters.tag" @update:model-value="setFilters({ tag: $event })">
        <NqChip value="">{{ t.allTags }}</NqChip>
        <NqChip v-for="tag in tags" :key="tag.value" :value="tag.value"><bdi>#{{ tag.value }}</bdi></NqChip>
      </NqChipGroup>
    </div>

    <div class="flex flex-col gap-4">
      <p role="status" aria-live="polite" class="text-body-sm text-muted-foreground">
        {{ count === 1 ? t.resultsOne : fill(t.results, { n: formatNumber(count, locale) }) }}
      </p>
      <div v-if="paged.items.length > 0" class="grid grid-cols-1 gap-x-6 gap-y-10 @2xl:grid-cols-2 @5xl:grid-cols-3">
        <NqPostCard v-for="post in paged.items" :key="post.slug" :post="post" :href="props.postHref?.(post)" :labels="props.labels" @open="emit('open', $event)" />
      </div>
      <NqEmptyState v-else-if="count === 0" :icon="Search" :title="t.noResults" :description="t.noResultsHint">
        <template #actions>
          <NqButton variant="secondary" @click="setFilters({ ...EMPTY_FILTERS })">{{ t.clearFilters }}</NqButton>
        </template>
      </NqEmptyState>
      <NqPagination v-if="paged.pageCount > 1" v-model:page="pageModel" :page-count="paged.pageCount" :label="t.pagination" class="mx-auto" />
    </div>
  </section>
</template>
