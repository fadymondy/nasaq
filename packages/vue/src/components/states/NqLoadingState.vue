<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { computed, useSlots } from "vue";
import { cn } from "../../lib/cn";
import { useT } from "../../provider";
import { NqSpinner } from "../spinner";
import NqSkeleton from "./NqSkeleton.vue";

interface Props {
  /** Announced to assistive tech; also shown when `rows` is 0. Defaults to "Loading…" / "جارٍ التحميل…" by locale. */
  label?: string;
  /**
   * Number of skeleton items (rows, cards or events). Skeletons over spinners: they preview the layout that is
   * coming. `0` shows a spinner with the label instead.
   */
  rows?: number;
  /** The layout to preview: list `rows`, a `grid` of cards, or a `timeline` of events. Default `"rows"`. */
  shape?: "rows" | "grid" | "timeline";
  /** Columns for `shape="grid"` from the `sm` breakpoint up (one column below). Default 3. */
  columns?: 1 | 2 | 3 | 4;
  /** Visible text under the skeleton, e.g. "Fetching the last 30 days…". Also announced. The `caption` slot takes rich content. */
  caption?: string;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { rows: 3, shape: "rows", columns: 3 });
const slots = useSlots();
const t = useT();
const text = computed(() => props.label ?? t("Loading…", "جارٍ التحميل…"));
const hasCaption = computed(() => !!props.caption || !!slots.caption);
const widths = [62, 44, 54, 38];
const gridCols = { 1: "sm:grid-cols-1", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-4" } as const;
</script>

<template>
  <div data-slot="loading-state" :data-shape="props.shape" role="status" aria-live="polite" :class="cn('flex flex-col gap-2', props.class)">
    <span v-if="!hasCaption" class="sr-only">{{ text }}</span>
    <div v-if="props.rows <= 0" class="flex items-center justify-center gap-2 py-8 text-body-sm text-muted-foreground">
      <NqSpinner /> <span aria-hidden="true">{{ text }}</span>
    </div>
    <div v-else-if="props.shape === 'grid'" :class="cn('grid grid-cols-1 gap-3', gridCols[props.columns])">
      <div v-for="i in props.rows" :key="i" data-slot="loading-card" class="flex flex-col gap-3 rounded-card border border-border p-4">
        <div class="flex items-center gap-3">
          <NqSkeleton class="size-8 rounded-control" />
          <NqSkeleton class="h-3" :style="{ inlineSize: `${widths[(i - 1) % 4]}%` }" />
        </div>
        <NqSkeleton class="h-3 w-full" />
        <NqSkeleton class="h-3" :style="{ inlineSize: `${widths[(i + 1) % 4]! + 20}%` }" />
      </div>
    </div>
    <ol v-else-if="props.shape === 'timeline'" class="flex flex-col">
      <li v-for="i in props.rows" :key="i" data-slot="loading-event" class="relative flex gap-3 pb-5 last:pb-0">
        <span v-if="i < props.rows" aria-hidden="true" class="absolute start-[9px] top-6 bottom-1 w-px bg-border" />
        <NqSkeleton class="mt-0.5 size-5 shrink-0 rounded-full" />
        <div class="flex min-w-0 flex-1 flex-col gap-2 pt-1">
          <NqSkeleton class="h-3" :style="{ inlineSize: `${widths[(i - 1) % 4]}%` }" />
          <NqSkeleton class="h-2.5 w-24" />
        </div>
      </li>
    </ol>
    <template v-else>
      <div v-for="i in props.rows" :key="i" class="flex h-row items-center gap-3 border-b border-border px-1">
        <NqSkeleton class="size-5 rounded-[4px]" />
        <NqSkeleton class="h-3" :style="{ inlineSize: `${widths[(i - 1) % 4]}%` }" />
      </div>
    </template>
    <p v-if="hasCaption && props.rows > 0" class="flex items-center gap-2 pt-1 text-caption text-muted-foreground">
      <slot name="caption">{{ props.caption }}</slot>
    </p>
    <span v-else-if="hasCaption" class="sr-only"><slot name="caption">{{ props.caption }}</slot></span>
  </div>
</template>
