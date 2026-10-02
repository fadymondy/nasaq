<script setup lang="ts">
import { MessageSquarePlus } from "lucide-vue-next";
import { computed, type Component, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { normalizePosition, type FeedbackLauncherPosition, type FeedbackLauncherShape } from "./feedback-reporter-utils";
import { feedbackStrings } from "./strings";

// The floating feedback button: a pill, a circle or a tab on the screen edge, in a corner or the middle of a side. Sides are
// logical: `end` is the right in English and the left in Arabic. It only draws the button and emits `click`; open your report dialog from it.
interface Props {
  shape?: FeedbackLauncherShape;
  position?: FeedbackLauncherPosition;
  /** The words on the pill and tab, and the accessible name of the circle. Defaults to "Feedback" / "ملاحظات". */
  label?: string;
  /** A count on the corner, for example the reports already open on this page. */
  count?: number;
  /** `fixed` sits on the screen, `absolute` in a `relative` parent (previews). Default `fixed`. */
  placement?: "fixed" | "absolute";
  /** Replaces the default icon (a lucide-vue-next component). */
  icon?: Component;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { shape: "pill", position: "bottom-end", label: undefined, count: undefined, placement: "fixed", icon: undefined });

const nq = useNasaq();
const text = computed(() => props.label ?? feedbackStrings(nq.locale.value).launcher);
const where = computed(() => normalizePosition(props.shape, props.position));
const glyph = computed(() => props.icon ?? MessageSquarePlus);

const positionClass: Record<FeedbackLauncherPosition, string> = {
  "bottom-end": "bottom-4 end-4",
  "bottom-start": "bottom-4 start-4",
  "top-end": "top-4 end-4",
  "top-start": "top-4 start-4",
  "edge-end": "end-0 top-1/2 -translate-y-1/2",
  "edge-start": "start-0 top-1/2 -translate-y-1/2",
};
</script>

<template>
  <button
    type="button"
    data-slot="feedback-launcher"
    :data-shape="props.shape"
    :data-position="where"
    :aria-label="props.shape === 'circle' ? text : undefined"
    :class="
      cn(
        'z-40 inline-flex items-center justify-center gap-2 bg-primary text-label text-primary-foreground shadow-floating outline-none',
        'transition-[filter,translate] duration-150 ease-nq hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus',
        props.placement,
        positionClass[where],
        props.shape === 'pill' && 'h-control rounded-full px-4',
        props.shape === 'circle' && 'relative size-12 rounded-full',
        props.shape === 'tab' && (where === 'edge-end' ? 'rounded-s-card' : 'rounded-e-card') + ' flex-col px-2 py-3',
        props.class,
      )
    "
  >
    <component :is="glyph" aria-hidden="true" class="size-4" />
    <span v-if="props.shape !== 'circle'" :class="cn(props.shape === 'tab' && '[writing-mode:vertical-rl] rtl:rotate-180')">{{ text }}</span>
    <span
      v-if="props.count"
      :aria-hidden="props.shape !== 'circle'"
      :class="cn('inline-flex min-w-5 items-center justify-center rounded-full bg-background px-1 text-caption text-foreground tabular-nums', props.shape === 'circle' && 'absolute -end-1 -top-1 h-5 border border-border')"
      >{{ props.count }}</span
    >
  </button>
</template>
