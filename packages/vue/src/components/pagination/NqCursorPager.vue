<script setup lang="ts">
import { ChevronLeft, ChevronRight } from "lucide-vue-next";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq, useT } from "../../provider";
import { NqButton } from "../button";
import { NqIcon } from "../icon";
import { formatNumber } from "../numeric";

// Previous/next only, for cursor-based lists that cannot jump to a page number, with a "Showing X-Y" label.
interface Props {
  /** 1-based index of the first item on this page. */
  from: number;
  /** 1-based index of the last item on this page. */
  to: number;
  /** Total number of items, when known. Cursor APIs often cannot say. */
  total?: number;
  hasPrevious: boolean;
  hasNext: boolean;
  /** Disables both buttons while a page is being fetched. */
  loading?: boolean;
  /** Landmark name. Default "Pagination" / "ترقيم الصفحات". */
  label?: string;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { loading: false, total: undefined, label: undefined });
const emit = defineEmits<{ previous: []; next: [] }>();
const t = useT();
const nq = useNasaq();
const n = (v: number) => formatNumber(v, nq.locale.value);
const showing = () =>
  props.total === undefined
    ? t(`Showing ${n(props.from)}–${n(props.to)}`, `عرض ${n(props.from)}–${n(props.to)}`)
    : t(`Showing ${n(props.from)}–${n(props.to)} of ${n(props.total)}`, `عرض ${n(props.from)}–${n(props.to)} من ${n(props.total)}`);
</script>

<template>
  <nav data-slot="cursor-pager" :aria-label="props.label ?? t('Pagination', 'ترقيم الصفحات')" :class="cn('flex w-full items-center justify-between gap-3', props.class)">
    <p class="text-body-sm text-muted-foreground tabular-nums">
      <slot name="summary"><bdi>{{ showing() }}</bdi></slot>
    </p>
    <div class="flex items-center gap-2">
      <NqButton size="sm" :disabled="!props.hasPrevious || props.loading" @click="emit('previous')">
        <NqIcon :icon="ChevronLeft" name="chevron-left" />
        <slot name="previous">{{ t("Previous", "السابق") }}</slot>
      </NqButton>
      <NqButton size="sm" :disabled="!props.hasNext || props.loading" @click="emit('next')">
        <slot name="next">{{ t("Next", "التالي") }}</slot>
        <NqIcon :icon="ChevronRight" name="chevron-right" />
      </NqButton>
    </div>
  </nav>
</template>
