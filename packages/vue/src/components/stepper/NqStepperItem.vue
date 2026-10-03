<script setup lang="ts">
import { Check, X } from "lucide-vue-next";
import { computed, inject, useAttrs, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqNum } from "../numeric";
import { STEPPER_ITEM_KEY, STEPPER_KEY, type StepStatus } from "./context";

defineOptions({ inheritAttrs: false });

const STRINGS = {
  en: { complete: "Completed", current: "Current step", upcoming: "Upcoming", error: "Error" },
  ar: { complete: "مكتملة", current: "الخطوة الحالية", upcoming: "قادمة", error: "خطأ" },
};

interface Props {
  title?: string;
  description?: string;
  /** Marks this step as failed: red marker with an X, and "Error" for screen readers. */
  error?: boolean;
  disabled?: boolean;
  /** Overrides the localised screen-reader status ("Completed", "Current step", "Upcoming", "Error"). */
  statusLabel?: string;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { title: undefined, description: undefined, statusLabel: undefined });
const attrs = useAttrs();
// Like React: an onClick makes the step a button (go back to a finished step); without one it is read-only.
const interactive = computed(() => typeof attrs.onClick === "function" || Array.isArray(attrs.onClick));
const rest = computed(() => {
  const { onClick: _onClick, ...others } = attrs;
  return others;
});

const stepper = inject(STEPPER_KEY, () => ({ current: 0, orientation: "horizontal" as const }));
const item = inject(STEPPER_ITEM_KEY, { index: 0, last: true });
const nq = useNasaq();
const t = computed(() => STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"]);
const status = computed<StepStatus>(() => {
  const { current } = stepper();
  return props.error ? "error" : item.index < current ? "complete" : item.index === current ? "current" : "upcoming";
});
const vertical = computed(() => stepper().orientation === "vertical");

const markerBase =
  "relative z-10 inline-flex size-7 shrink-0 items-center justify-center rounded-full border text-caption font-medium transition-colors duration-150 ease-nq [&_svg]:size-3.5";
const markerByStatus: Record<StepStatus, string> = {
  complete: "border-transparent bg-primary text-primary-foreground",
  current: "border-nq-focus bg-background text-foreground ring-2 ring-nq-focus/30",
  upcoming: "border-border bg-background text-muted-foreground",
  error: "border-nq-danger/40 bg-nq-danger-soft text-nq-danger-text",
};
</script>

<template>
  <li
    data-slot="stepper-item"
    :data-status="status"
    v-bind="rest"
    :class="cn(vertical ? 'grid grid-cols-[1.75rem_1fr] gap-x-3' : cn('flex items-start', !item.last && 'flex-1'), props.class)"
  >
    <component
      :is="interactive ? 'button' : 'div'"
      :type="interactive ? 'button' : undefined"
      :disabled="interactive ? props.disabled : undefined"
      data-slot="stepper-step"
      :aria-current="status === 'current' || (props.error && item.index === stepper().current) ? 'step' : undefined"
      :class="
        cn(
          'items-start gap-3 rounded-control text-start outline-none',
          vertical ? 'col-span-2 grid grid-cols-subgrid' : 'flex shrink-0',
          interactive &&
            'cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:cursor-not-allowed disabled:opacity-50',
        )
      "
      v-bind="interactive ? { onClick: attrs.onClick } : {}"
    >
      <span data-slot="stepper-marker" :class="cn(markerBase, markerByStatus[status])">
        <Check v-if="status === 'complete'" aria-hidden="true" />
        <X v-else-if="status === 'error'" aria-hidden="true" />
        <NqNum v-else :value="item.index + 1" />
      </span>
      <span data-slot="stepper-text" class="flex min-w-0 flex-col text-start">
        <span :class="cn('text-label', status === 'upcoming' ? 'text-muted-foreground' : 'text-foreground', status === 'error' && 'text-nq-danger-text')">
          <slot name="title">{{ props.title }}</slot>
          <span class="sr-only"> ({{ props.statusLabel ?? t[status] }})</span>
        </span>
        <span v-if="props.description || $slots.description" class="text-caption text-muted-foreground"><slot name="description">{{ props.description }}</slot></span>
      </span>
    </component>
    <span
      v-if="!item.last"
      aria-hidden="true"
      data-slot="stepper-connector"
      :data-complete="status === 'complete' ? '' : undefined"
      :class="
        cn(
          'rounded-full transition-colors duration-150 ease-nq',
          status === 'complete' ? 'bg-primary' : 'bg-border',
          vertical ? 'col-start-1 row-start-2 my-1 min-h-6 w-px justify-self-center' : 'mx-3 mt-3.5 h-px min-w-6 flex-1',
        )
      "
    />
  </li>
</template>
