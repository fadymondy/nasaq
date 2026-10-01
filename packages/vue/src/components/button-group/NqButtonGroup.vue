<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// Buttons fused into one control: borders are shared and only the outer corners stay round. The rounded ends are
// the inline start of the first button and the inline end of the last, so RTL is correct without any override.
// Children are `NqButton`s, `NqButtonGroupSeparator`s or triggers rendered as a button. Give the group an
// `aria-label` when it is a set of related actions.
interface Props {
  /** "horizontal" (default) joins buttons side by side; "vertical" stacks them. */
  orientation?: "horizontal" | "vertical";
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { orientation: "horizontal" });
const B = "[&>[data-slot=button]]";
const classes = computed(() =>
  cn(
    "flex w-fit max-w-full",
    `${B}:relative ${B}:rounded-none ${B}:focus-visible:z-10 ${B}:hover:z-1`,
    props.orientation === "horizontal"
      ? [`${B}:first-child:rounded-s-control ${B}:last-child:rounded-e-control`, `${B}+${B}:-ms-px`]
      : ["flex-col", `${B}:first-child:rounded-t-control ${B}:last-child:rounded-b-control`, `${B}+${B}:-mt-px`],
    props.class,
  ),
);
</script>

<template>
  <div role="group" data-slot="button-group" :data-orientation="props.orientation" :class="classes">
    <slot />
  </div>
</template>
