<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqAvatar } from "../avatar";
import type { FocusState } from "./focus-math";
import { useFocusStatusStrings, type FocusStatusLabels } from "./strings";
import { focusDotTone, focusStateIcon } from "./tone";

// An avatar with an in-focus presence dot at its inline end. The dot carries an icon and a screen-reader label.
interface Props {
  /** The person's presence. `available` shows the plain green dot. */
  state: FocusState;
  /** Hide the dot when the person is simply available. Default false. */
  hideAvailable?: boolean;
  labels?: FocusStatusLabels;
  /** Used for the alt text and the initials fallback. */
  name?: string;
  src?: string;
  size?: "xs" | "sm" | "md" | "lg" | null;
  shape?: "circle" | "square" | null;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { hideAvailable: false, size: "md" });

const t = useFocusStatusStrings(() => props.labels);
const Icon = computed(() => focusStateIcon[props.state]);
const show = computed(() => !(props.hideAvailable && props.state === "available"));
const big = computed(() => props.size === "lg" || props.size === "md");
</script>

<template>
  <span data-slot="focus-avatar" :data-state="props.state" :class="cn('relative inline-flex shrink-0', props.class)">
    <NqAvatar :name="props.name" :src="props.src" :size="props.size" :shape="props.shape" />
    <span
      v-if="show"
      role="img"
      :aria-label="t[props.state]"
      :title="t[props.state]"
      :class="cn('absolute -bottom-0.5 -end-0.5 grid place-items-center rounded-full border-2 border-background', big ? 'size-4' : 'size-3', focusDotTone[props.state])"
    >
      <component :is="Icon" v-if="big && props.state !== 'available'" aria-hidden="true" class="size-2.5" />
    </span>
  </span>
</template>
