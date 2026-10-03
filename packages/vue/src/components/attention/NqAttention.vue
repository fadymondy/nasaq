<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { computed, ref, useId } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { buttonVariants } from "../button";
import { attentionStrings, orderAttention, type AttentionItem, type AttentionLabels } from "./attention-logic";
import NqAttentionRow from "./NqAttentionRow.vue";

// A short list of things the user should act on now. Products supply the items; Nasaq only orders, trims and presents them.
interface Props {
  items: AttentionItem[];
  /** Section heading. Default "Needs your attention" / "يحتاج انتباهك". */
  title?: string;
  /** Heading level. Default 2. */
  headingLevel?: 2 | 3 | 4;
  /** Rows shown before "Show more" / "View all". Default 5. */
  max?: number;
  /** Order by tone (danger first), keeping the host's order within a tone. Default true. Done rows always go last. */
  sort?: boolean;
  /** "View all" in the header, e.g. to an inbox. Without it, extra rows expand in place. */
  viewAllHref?: string;
  /** "View all" as a button. Takes effect when set; use `viewAllHref` for a link. */
  onViewAll?: () => void;
  /**
   * Shown when there are no items. Default none: the whole section disappears, because an empty
   * "all clear" box is noise. Pass a short line ("You're all caught up") where absence would confuse.
   */
  empty?: string;
  /** Shows placeholder rows while the host loads. */
  loading?: boolean;
  labels?: AttentionLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { headingLevel: 2, max: 5, sort: true, empty: undefined, loading: false });

const nq = useNasaq();
const t = computed(() => ({ ...attentionStrings[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
const headingId = useId();
const expanded = ref(false);

const checklist = computed(() => props.items.length > 0 && props.items.every((i) => i.done !== undefined));
const doneCount = computed(() => props.items.filter((i) => i.done).length);
const ordered = computed(() => orderAttention(props.items, props.sort));
const hidden = computed(() => Math.max(0, ordered.value.length - props.max));
const visible = computed(() => (expanded.value ? ordered.value : ordered.value.slice(0, props.max)));
const open = computed(() => (checklist.value ? props.items.length - doneCount.value : props.items.length));
const hasViewAll = computed(() => Boolean(props.viewAllHref || props.onViewAll));
const show = computed(() => props.loading || props.items.length > 0 || props.empty !== undefined);
const ghostSm = cn(buttonVariants({ variant: "ghost", size: "sm" }), "ms-auto text-muted-foreground");
const moreClass = cn(buttonVariants({ variant: "ghost", size: "sm" }), "mt-1 self-start text-muted-foreground");
</script>

<template>
  <section v-if="show" data-slot="attention" :aria-labelledby="headingId" :aria-busy="props.loading || undefined" :class="cn('flex flex-col', props.class)">
    <header class="flex min-h-control items-center gap-2 pb-2">
      <component :is="`h${props.headingLevel}`" :id="headingId" class="text-label text-foreground">{{ props.title ?? t.title }}</component>
      <span v-if="!props.loading && open > 0 && !checklist" data-slot="attention-count" class="text-caption text-muted-foreground tabular-nums">{{ open }}</span>
      <span v-if="checklist" class="flex items-center gap-2 text-caption text-muted-foreground tabular-nums">
        <span>{{ t.progress(doneCount, props.items.length) }}</span>
        <span aria-hidden="true" class="h-1 w-16 overflow-hidden rounded-full bg-nq-surface-soft">
          <span class="block h-full rounded-full bg-nq-success transition-[width] duration-300 ease-nq" :style="{ width: `${(doneCount / props.items.length) * 100}%` }" />
        </span>
      </span>
      <template v-if="hasViewAll">
        <a v-if="props.viewAllHref" :href="props.viewAllHref" :class="ghostSm">{{ t.viewAll }}</a>
        <button v-else type="button" :class="ghostSm" @click="props.onViewAll?.()">{{ t.viewAll }}</button>
      </template>
    </header>

    <ul v-if="props.loading" class="flex flex-col border-t border-border">
      <li class="sr-only">{{ t.loading }}</li>
      <li v-for="i in Math.min(props.max, 3)" :key="i" aria-hidden="true" class="flex h-row items-center gap-3 border-b border-border px-1">
        <span class="size-4 rounded-full bg-nq-surface-soft" />
        <span class="h-3 max-w-64 flex-1 rounded-sm bg-nq-surface-soft motion-safe:animate-pulse" />
      </li>
    </ul>
    <p v-else-if="props.items.length === 0" class="border-t border-border py-3 text-body-sm text-muted-foreground">{{ props.empty }}</p>
    <ul v-else class="flex flex-col border-t border-border">
      <NqAttentionRow v-for="item in visible" :key="item.id" :item="item" :dismiss-label="t.dismiss" :done-label="t.done" />
    </ul>

    <button v-if="!props.loading && hidden > 0 && !hasViewAll" type="button" :aria-expanded="expanded" :class="moreClass" @click="expanded = !expanded">
      {{ expanded ? t.showLess : t.showMore(hidden) }}
    </button>
  </section>
</template>
