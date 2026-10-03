<script setup lang="ts">
import { computed, onMounted, ref, watch, type Component, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { centerScroll } from "./mobile-nav-math";
import { useMobileNav, type MobileNavLabels } from "./strings";

export interface FilterStripItem {
  value: string;
  label: string;
  icon?: Component;
  /** A count shown after the label. */
  count?: number;
}

// A horizontally scrolling row of filter chips. The active chip scrolls into view; the ends fade instead of clipping.
// Single select: v-model is a string. With `multiple`, v-model is a string array.
interface Props {
  items: readonly FilterStripItem[];
  modelValue: string | readonly string[];
  multiple?: boolean;
  labels?: MobileNavLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { multiple: false, labels: undefined });
const emit = defineEmits<{ "update:modelValue": [value: string | string[]] }>();
const { t } = useMobileNav(() => props.labels);

const scroller = ref<HTMLDivElement | null>(null);
const selected = computed<readonly string[]>(() => (props.multiple ? (props.modelValue as readonly string[]) : [props.modelValue as string]));

function reveal() {
  const box = scroller.value;
  const chip = box?.querySelector<HTMLElement>("[aria-pressed='true']");
  if (!box || !chip) return;
  const rtl = getComputedStyle(box).direction === "rtl";
  const boxRect = box.getBoundingClientRect();
  const chipRect = chip.getBoundingClientRect();
  // Distance of the chip from the start edge of the content, then the scroll that centres it.
  const fromStart = rtl ? boxRect.right - chipRect.right - box.scrollLeft : chipRect.left - boxRect.left + box.scrollLeft;
  const target = centerScroll(fromStart, chipRect.width, box.clientWidth, box.scrollWidth);
  box.scrollTo?.({ left: rtl ? -target : target, behavior: "smooth" });
}
onMounted(reveal);
watch(() => selected.value.join("|"), () => requestAnimationFrame(reveal));

function toggle(v: string) {
  if (props.multiple) {
    const list = props.modelValue as readonly string[];
    emit("update:modelValue", (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]));
  } else emit("update:modelValue", v);
}
</script>

<template>
  <div data-slot="filter-strip" role="group" :aria-label="t.filters" :class="cn('relative', props.class)">
    <div
      ref="scroller"
      class="flex snap-x gap-2 overflow-x-auto px-4 py-1 [mask-image:linear-gradient(90deg,transparent,black_1rem,black_calc(100%-1rem),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <button
        v-for="item in props.items"
        :key="item.value"
        type="button"
        :aria-pressed="selected.includes(item.value)"
        :class="
          cn(
            'inline-flex h-control shrink-0 snap-center items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-label outline-none transition-colors duration-150 ease-nq',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus',
            selected.includes(item.value) ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:bg-nq-hover',
          )
        "
        @click="toggle(item.value)"
      >
        <component :is="item.icon" v-if="item.icon" aria-hidden="true" class="size-4" />
        {{ item.label }}
        <span v-if="item.count !== undefined" :class="cn('tabular-nums', selected.includes(item.value) ? 'text-primary-foreground/80' : 'text-muted-foreground')">{{ item.count }}</span>
      </button>
    </div>
  </div>
</template>
