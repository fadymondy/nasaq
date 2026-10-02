<script setup lang="ts">
import { computed, getCurrentInstance, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { formatTimer } from "../countdown";
import type { FocusState } from "./focus-math";
import { fillFocusStatus, useFocusStatusStrings, type FocusStatusLabels } from "./strings";
import { focusChipTone, focusIconTone, focusStateIcon } from "./tone";

// A compact header chip: the state's icon and word, and the time left while focusing or resting.
interface Props {
  state: FocusState;
  /** Seconds left in the focus or break. Shown as mm:ss next to the label. */
  seconds?: number;
  /** Overrides the built-in word for the state, for example the task name. */
  text?: string;
  labels?: FocusStatusLabels;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
// Renders a button when the page listens for @click (for example to open the pomodoro popover).
const instance = getCurrentInstance();
const clickable = computed(() => typeof instance?.vnode.props?.onClick !== "undefined");

const t = useFocusStatusStrings(() => props.labels);
const Icon = computed(() => focusStateIcon[props.state]);
const shown = computed(() => props.seconds !== undefined && (props.state === "focus" || props.state === "break"));
const classes = computed(() =>
  cn(
    "inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border px-2.5 text-caption font-medium",
    focusChipTone[props.state],
    clickable.value &&
      "cursor-pointer outline-none transition-colors duration-150 ease-nq hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
    props.class,
  ),
);
</script>

<template>
  <component :is="clickable ? 'button' : 'span'" data-slot="focus-status" :data-state="props.state" :type="clickable ? 'button' : undefined" :class="classes">
    <component :is="Icon" aria-hidden="true" :class="cn('size-3.5 shrink-0', focusIconTone[props.state], props.state === 'available' && 'fill-current')" />
    <span class="truncate">{{ props.text ?? t[props.state] }}</span>
    <span v-if="shown" dir="ltr" class="tabular-nums text-muted-foreground" :aria-label="fillFocusStatus(t.left, { time: formatTimer(props.seconds as number) })">{{
      formatTimer(props.seconds as number)
    }}</span>
  </component>
</template>
