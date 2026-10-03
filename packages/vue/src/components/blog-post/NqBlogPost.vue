<script setup lang="ts">
import { ArrowLeft, ArrowRight, ChevronDown, Clock } from "lucide-vue-next";
import { computed, onMounted, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqAvatar } from "../avatar";
import { NqBadge } from "../badge";
import { adjacentPosts, extractToc, readingTime, relatedPosts, type BlogAuthor, type BlogPostSummary } from "../blog-index/blog-model";
import { hueFor, useBlogStrings, type BlogIndexLabels } from "../blog-index/labels";
import NqPostCard from "../blog-index/NqPostCard.vue";
import NqPostCover from "../blog-index/NqPostCover.vue";
import { NqButton } from "../button";
import { NqCard } from "../card";
import { NqCollapsible, NqCollapsiblePanel, NqCollapsibleTrigger } from "../collapsible";
import { NqIcon } from "../icon";
import { NqDateTime, formatNumber } from "../numeric";
import { NqSectionHeader } from "../section-header";
import { NqShareButton, type ShareActionLabels } from "../share-action";
import { useBlogPostStrings, type BlogPostLabels } from "./labels";
import type { BlogPostData } from "./types";
import NqPostBody from "./NqPostBody.vue";
import NqReadingProgress from "./NqReadingProgress.vue";
import NqTableOfContents from "./NqTableOfContents.vue";
import { useActiveHeading } from "./useActiveHeading";

// An article page: cover, category, title, author byline with date and reading time, a reading progress bar, a sticky table
// of contents with scroll-spy, the Markdown body with code and callouts, tags, share, author card, previous/next, related posts
// and a slot for comments (`comments`); extra header actions go in the `actions` slot.
interface Props {
  post: BlogPostData;
  /** Every post, to derive related and previous/next posts. Ignored for the ones passed explicitly. */
  posts?: BlogPostSummary[];
  related?: BlogPostSummary[];
  /** The next older post. */
  previous?: BlogPostSummary;
  /** The next newer post. */
  next?: BlogPostSummary;
  /** Absolute URL of the article, for sharing. Default the current page. */
  url?: string;
  /** Link for another post. Default `#slug`. */
  postHref?: (post: BlogPostSummary) => string;
  /** Link for a tag's archive. Without it tags are plain badges. */
  tagHref?: (tag: string) => string;
  /** Link back to the archive. */
  backHref?: string;
  /** Show the sticky table of contents (from 64rem of width; collapsible above it). Default true. */
  toc?: boolean;
  /** Show the reading progress bar. Default true. */
  progress?: boolean;
  /** Distance in px headings keep from the top when scrolled to and when picking the current one. Default 96. */
  scrollOffset?: number;
  labels?: Partial<BlogPostLabels>;
  /** Labels of the share dialog. */
  shareLabels?: Partial<ShareActionLabels>;
  /** Labels shared with the blog index (read time, minutes). */
  indexLabels?: Partial<BlogIndexLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { toc: true, progress: true, scrollOffset: 96 });
defineSlots<{ comments?: () => unknown; actions?: () => unknown }>();

const { t, locale } = useBlogPostStrings(() => props.labels);
const { t: it } = useBlogStrings(() => props.indexLabels);
const articleRef = ref<HTMLElement | null>(null);
const mobileTocOpen = ref(false);
const href = ref(props.url ?? "");
onMounted(() => {
  if (!props.url) href.value = window.location.href.split("#")[0] as string;
});

const items = computed(() => extractToc(props.post.body));
const ids = computed(() => items.value.map((i) => i.id));
const active = useActiveHeading(ids, articleRef, () => props.scrollOffset);
const minutes = computed(() => props.post.readingMinutes ?? readingTime(props.post.body).minutes);
const related = computed(() => props.related ?? (props.posts ? relatedPosts(props.post, props.posts) : []));
const adjacent = computed(() => (props.posts ? adjacentPosts(props.post, props.posts) : {}));
const older = computed(() => props.previous ?? adjacent.value.older);
const newer = computed(() => props.next ?? adjacent.value.newer);
const link = (p: BlogPostSummary) => props.postHref?.(p) ?? `#${p.slug}`;
const showToc = computed(() => props.toc && items.value.length > 1);
const author = computed<BlogAuthor | undefined>(() => props.post.author);
const shareLabels = computed(() => ({ title: t.value.shareTitle, share: t.value.share, ...props.shareLabels }));
</script>

<template>
  <div data-slot="blog-post" :class="cn('@container flex flex-col gap-8', props.class)">
    <NqReadingProgress v-if="props.progress" :target="articleRef" :label="t.progress" class="-mb-8" />

    <header class="mx-auto flex w-full max-w-3xl flex-col items-start gap-4">
      <a
        v-if="props.backHref"
        :href="props.backHref"
        class="inline-flex items-center gap-1 rounded-[2px] text-body-sm text-muted-foreground outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus"
      >
        <NqIcon :icon="ArrowLeft" class="size-4" />
        {{ t.back }}
      </a>
      <NqBadge variant="tag" :hue="hueFor(props.post.category)">{{ props.post.category }}</NqBadge>
      <h1 dir="auto" class="text-balance text-display text-foreground">{{ props.post.title }}</h1>
      <p dir="auto" class="text-pretty text-body text-muted-foreground">{{ props.post.excerpt }}</p>
      <div class="flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-3 border-y border-border py-3">
        <div class="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span v-if="author" class="inline-flex items-center gap-2">
            <NqAvatar :name="author.name" :src="author.avatar" size="md" />
            <span class="flex flex-col leading-tight">
              <bdi class="text-label text-foreground">{{ author.name }}</bdi>
              <span v-if="author.role" class="text-caption text-muted-foreground">{{ author.role }}</span>
            </span>
          </span>
          <p class="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
            <NqDateTime :value="props.post.date" :format="{ dateStyle: 'long' }" />
            <span class="inline-flex items-center gap-1">
              <NqIcon :icon="Clock" class="size-3" />
              {{ it.minRead.replace("{n}", formatNumber(minutes, locale)) }}
            </span>
            <span v-if="props.post.updated">
              {{ t.updated }} <NqDateTime :value="props.post.updated" :format="{ dateStyle: 'medium' }" />
            </span>
          </p>
        </div>
        <div class="flex items-center gap-2">
          <slot name="actions" />
          <NqShareButton :url="href" :title="props.post.title" :text="props.post.excerpt" :link-access="false" :labels="shareLabels" />
        </div>
      </div>
    </header>

    <NqPostCover :post="props.post" ratio="aspect-[21/9]" class="mx-auto max-w-5xl" />

    <div :class="cn('mx-auto grid w-full max-w-5xl grid-cols-1 gap-x-12 gap-y-6', showToc && '@4xl:grid-cols-[minmax(0,1fr)_14rem]')">
      <div class="flex min-w-0 flex-col gap-8">
        <NqCollapsible v-if="showToc" v-model:open="mobileTocOpen" class="@4xl:hidden">
          <NqCollapsibleTrigger as-child>
            <NqButton variant="secondary" class="w-full justify-between">
              {{ t.onThisPage }}
              <NqIcon :icon="ChevronDown" :class="cn('transition-transform duration-200 ease-nq', mobileTocOpen && 'rotate-180')" />
            </NqButton>
          </NqCollapsibleTrigger>
          <NqCollapsiblePanel>
            <NqTableOfContents :items="items" :active-id="active" class="pt-3" @select="mobileTocOpen = false" />
          </NqCollapsiblePanel>
        </NqCollapsible>

        <article ref="articleRef" class="flex min-w-0 max-w-[44rem] flex-col gap-10">
          <NqPostBody :markdown="props.post.body" :scroll-offset="props.scrollOffset" />

          <div class="flex flex-col gap-4 border-t border-border pt-6">
            <div v-if="props.post.tags.length > 0" class="flex flex-wrap items-center gap-2">
              <span class="text-label text-muted-foreground">{{ t.tags }}</span>
              <template v-for="tag in props.post.tags" :key="tag">
                <a v-if="props.tagHref" :href="props.tagHref(tag)" class="rounded-[4px] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">
                  <NqBadge variant="outline" class="hover:bg-nq-hover"><bdi>#{{ tag }}</bdi></NqBadge>
                </a>
                <NqBadge v-else variant="outline"><bdi>#{{ tag }}</bdi></NqBadge>
              </template>
            </div>
            <NqCard v-if="author?.bio" class="flex-row items-start gap-3 p-4">
              <NqAvatar :name="author.name" :src="author.avatar" size="lg" />
              <div class="flex min-w-0 flex-col gap-1">
                <p class="eyebrow">{{ t.aboutAuthor }}</p>
                <p class="text-label text-foreground"><bdi>{{ author.name }}</bdi></p>
                <p dir="auto" class="text-body-sm text-muted-foreground">{{ author.bio }}</p>
              </div>
            </NqCard>
          </div>
        </article>
      </div>

      <aside v-if="showToc" class="hidden @4xl:block">
        <div class="sticky flex max-h-[calc(100dvh-8rem)] flex-col overflow-y-auto" :style="{ top: `${props.scrollOffset}px` }">
          <NqTableOfContents :items="items" :active-id="active" />
        </div>
      </aside>
    </div>

    <nav v-if="older || newer" :aria-label="`${t.previous} / ${t.next}`" class="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 @2xl:grid-cols-2">
      <a
        v-if="older"
        :href="link(older)"
        data-slot="post-adjacent"
        class="group/adj flex min-w-0 flex-col gap-1 rounded-card border border-border bg-card p-4 outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus"
      >
        <span class="inline-flex items-center gap-1 text-caption text-muted-foreground">
          <NqIcon :icon="ArrowLeft" class="size-3" />
          {{ t.previous }}
        </span>
        <span dir="auto" class="text-balance text-label text-foreground">{{ older.title }}</span>
      </a>
      <span v-else />
      <a
        v-if="newer"
        :href="link(newer)"
        data-slot="post-adjacent"
        class="group/adj flex min-w-0 flex-col gap-1 rounded-card border border-border bg-card p-4 outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus @2xl:text-end @2xl:items-end"
      >
        <span class="inline-flex items-center gap-1 text-caption text-muted-foreground">
          {{ t.next }}
          <NqIcon :icon="ArrowRight" class="size-3" />
        </span>
        <span dir="auto" class="text-balance text-label text-foreground">{{ newer.title }}</span>
      </a>
      <span v-else />
    </nav>

    <section v-if="related.length > 0" class="mx-auto flex w-full max-w-5xl flex-col gap-4" :aria-labelledby="`${props.post.slug}-related`">
      <NqSectionHeader :heading-id="`${props.post.slug}-related`" :title="t.related" :description="t.relatedHint" />
      <div class="grid grid-cols-1 gap-x-6 gap-y-8 @2xl:grid-cols-2 @4xl:grid-cols-3">
        <NqPostCard v-for="p in related" :key="p.slug" :post="p" :href="link(p)" :labels="props.indexLabels" />
      </div>
    </section>

    <section v-if="$slots.comments" class="mx-auto flex w-full max-w-3xl flex-col gap-4" :aria-labelledby="`${props.post.slug}-comments`">
      <NqSectionHeader :heading-id="`${props.post.slug}-comments`" :title="t.comments" />
      <slot name="comments" />
    </section>
  </div>
</template>
