<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { computed } from "vue";
import { cn } from "../../lib/cn";
import { useT } from "../../provider";
import { NqSpinner } from "../spinner";
import NqSkeleton from "./NqSkeleton.vue";

interface Props {
  /** Announced to assistive tech; also shown when `rows` is 0. Defaults to "Loading…" / "جارٍ التحميل…" by locale. */
  label?: string;
  /** Number of skeleton rows. Skeletons over spinners: they preview the layout that is coming. */
  rows?: number;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { rows: 3 });
const t = useT();
const text = computed(() => props.label ?? t("Loading…", "جارٍ التحميل…"));
const widths = [62, 44, 54, 38];
</script>

<template>
  <div data-slot="loading-state" role="status" aria-live="polite" :class="cn('flex flex-col gap-2', props.class)">
    <span class="sr-only">{{ text }}</span>
    <template v-if="props.rows > 0">
      <div v-for="i in props.rows" :key="i" class="flex h-row items-center gap-3 border-b border-border px-1">
        <NqSkeleton class="size-5 rounded-[4px]" />
        <NqSkeleton class="h-3" :style="{ inlineSize: `${widths[(i - 1) % 4]}%` }" />
      </div>
    </template>
    <div v-else class="flex items-center justify-center gap-2 py-8 text-body-sm text-muted-foreground">
      <NqSpinner /> <span aria-hidden="true">{{ text }}</span>
    </div>
  </div>
</template>
