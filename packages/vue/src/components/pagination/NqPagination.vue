<script setup lang="ts">
import { ChevronLeft, ChevronRight } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq, useT } from "../../provider";
import { NqButton } from "../button";
import { NqIcon } from "../icon";
import { formatNumber } from "../numeric";
import { getPaginationItems } from "./pagination";

// Numbered pages with ellipsis, previous/next chevrons (mirrored in RTL) and `aria-current="page"` on the current page.
interface Props {
  /** Total number of pages. */
  pageCount: number;
  /** Pages shown each side of the current one. Default 1. */
  siblings?: number;
  /** Pages always shown at each end. Default 1. */
  boundaries?: number;
  /** Landmark name. Default "Pagination" / "ترقيم الصفحات" by the Nasaq locale. */
  label?: string;
  /** Accessible name of the previous button. Default "Previous" / "السابق". */
  previousLabel?: string;
  /** Accessible name of the next button. Default "Next" / "التالي". */
  nextLabel?: string;
  /** Accessible name of a page button. Receives the formatted number. Default "Page 3" / "الصفحة 3". */
  pageLabel?: (formatted: string) => string;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { siblings: 1, boundaries: 1, label: undefined, previousLabel: undefined, nextLabel: undefined, pageLabel: undefined });
/** Current page, 1-based. `v-model:page`. */
const page = defineModel<number>("page", { default: 1 });
const emit = defineEmits<{ pageChange: [page: number] }>();
const t = useT();
const nq = useNasaq();

const current = computed(() => Math.min(Math.max(page.value, 1), Math.max(props.pageCount, 1)));
const items = computed(() => getPaginationItems(current.value, props.pageCount, props.siblings, props.boundaries));
const num = (n: number) => formatNumber(n, nq.locale.value);
const nameOf = (n: number) => (props.pageLabel ?? ((f: string) => t(`Page ${f}`, `الصفحة ${f}`)))(num(n));
const go = (n: number) => {
  if (n !== current.value && n >= 1 && n <= props.pageCount) {
    page.value = n;
    emit("pageChange", n);
  }
};
</script>

<template>
  <nav data-slot="pagination" :aria-label="props.label ?? t('Pagination', 'ترقيم الصفحات')" :class="cn('w-fit max-w-full', props.class)">
    <ul class="flex flex-wrap items-center gap-1">
      <li>
        <NqButton variant="ghost" size="icon-sm" :aria-label="props.previousLabel ?? t('Previous', 'السابق')" :disabled="current <= 1" @click="go(current - 1)">
          <NqIcon :icon="ChevronLeft" name="chevron-left" />
        </NqButton>
      </li>
      <template v-for="item in items" :key="item">
        <li v-if="typeof item === 'number'">
          <NqButton
            :variant="item === current ? 'secondary' : 'ghost'"
            size="icon-sm"
            :aria-label="nameOf(item)"
            :aria-current="item === current ? 'page' : undefined"
            :class="cn('tabular-nums', item === current && 'border-primary bg-nq-selected')"
            @click="go(item)"
          >
            {{ num(item) }}
          </NqButton>
        </li>
        <li v-else data-slot="pagination-ellipsis" class="flex size-control-sm items-center justify-center text-muted-foreground">
          <span aria-hidden="true">…</span>
          <span class="sr-only">{{ t("More pages", "المزيد من الصفحات") }}</span>
        </li>
      </template>
      <li>
        <NqButton variant="ghost" size="icon-sm" :aria-label="props.nextLabel ?? t('Next', 'التالي')" :disabled="current >= props.pageCount" @click="go(current + 1)">
          <NqIcon :icon="ChevronRight" name="chevron-right" />
        </NqButton>
      </li>
    </ul>
  </nav>
</template>
