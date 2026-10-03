<script setup lang="ts">
import { ChevronLeft, ChevronRight } from "lucide-vue-next";
import { computed, onBeforeUnmount, ref, watchEffect, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import type { ContextMenuAction } from "../context-menu";
import { NqEmptyState } from "../states";
import { useTestimonialStrings, type TestimonialLabels } from "./labels";
import TestimonialCard from "./TestimonialCard.vue";
import { testimonialOrder, testimonialStep, type Testimonial, type TestimonialLayout } from "./testimonials-logic";

// Testimonials as a masonry wall, an equal grid, or a spotlight that steps through them.
interface Props {
  items: readonly Testimonial[];
  /** `wall`: masonry columns. `grid`: equal cards. `spotlight`: one large quote at a time. Default `wall`. */
  layout?: TestimonialLayout;
  /** Moderation and other actions: opened with context-click, long-press, Shift+F10 or the Menu key. */
  itemActions?: (item: Testimonial) => ContextMenuAction[];
  /** Spotlight only: move on by itself every this many milliseconds. Off by default; stops when reduced motion is preferred. */
  autoAdvance?: number;
  locale?: string;
  labels?: TestimonialLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { layout: "wall", itemActions: undefined, autoAdvance: undefined, locale: undefined, labels: undefined });
defineOptions({ inheritAttrs: false });

const { t } = useTestimonialStrings(
  () => props.locale,
  () => props.labels,
);
const ordered = computed(() => (props.layout === "spotlight" ? testimonialOrder(props.items) : [...props.items]));
const index = ref(0);
const at = computed(() => (ordered.value.length ? Math.min(index.value, ordered.value.length - 1) : 0));
const current = computed(() => ordered.value[at.value]);
const paused = ref(false);

let timer: ReturnType<typeof setInterval> | undefined;
watchEffect((onCleanup) => {
  if (props.layout !== "spotlight" || !props.autoAdvance || paused.value || ordered.value.length < 2) return;
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const n = ordered.value.length;
  timer = setInterval(() => (index.value = testimonialStep(index.value, 1, n)), props.autoAdvance);
  onCleanup(() => clearInterval(timer));
});
onBeforeUnmount(() => clearInterval(timer));

const step = (by: number) => (index.value = testimonialStep(at.value, by, ordered.value.length));
const actionsOf = (item: Testimonial) => props.itemActions?.(item);
</script>

<template>
  <div v-if="props.items.length === 0" :class="props.class" v-bind="$attrs">
    <slot name="empty"><NqEmptyState :title="t.empty" /></slot>
  </div>
  <section
    v-else-if="props.layout === 'spotlight'"
    data-slot="testimonial-wall"
    data-layout="spotlight"
    aria-roledescription="carousel"
    :class="cn('flex w-full flex-col gap-4', props.class)"
    v-bind="$attrs"
    @mouseenter="paused = true"
    @mouseleave="paused = false"
    @focusin="paused = true"
    @focusout="paused = false"
  >
    <div :aria-live="paused || !props.autoAdvance ? 'polite' : 'off'">
      <TestimonialCard v-if="current" :key="current.id" :item="current" :rated-out-of="t.ratedOutOf" :actions="actionsOf(current)" spotlight />
    </div>
    <div v-if="ordered.length > 1" class="flex items-center justify-between gap-3">
      <NqButton type="button" variant="secondary" size="icon" :aria-label="t.previous" @click="step(-1)">
        <ChevronLeft aria-hidden="true" class="rtl:rotate-180" />
      </NqButton>
      <div class="flex flex-wrap items-center justify-center gap-1">
        <button
          v-for="(o, i) in ordered"
          :key="o.id"
          type="button"
          :aria-label="t.goTo(i + 1)"
          :aria-current="i === at ? 'true' : undefined"
          class="grid size-6 place-items-center rounded-full outline-none focus-visible:outline-2 focus-visible:outline-nq-focus"
          @click="index = i"
        >
          <span :class="cn('size-2 rounded-full transition-colors', i === at ? 'bg-primary' : 'bg-nq-line-strong')" />
        </button>
      </div>
      <NqButton type="button" variant="secondary" size="icon" :aria-label="t.next" @click="step(1)">
        <ChevronRight aria-hidden="true" class="rtl:rotate-180" />
      </NqButton>
    </div>
  </section>
  <div
    v-else
    data-slot="testimonial-wall"
    :data-layout="props.layout"
    :class="cn(props.layout === 'wall' ? 'columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4 [&>*]:break-inside-avoid' : 'grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-4', 'w-full', props.class)"
    v-bind="$attrs"
  >
    <TestimonialCard v-for="item in ordered" :key="item.id" :item="item" :rated-out-of="t.ratedOutOf" :actions="actionsOf(item)" />
  </div>
</template>
