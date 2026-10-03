<script setup lang="ts">
import { CircleDashed } from "lucide-vue-next";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import type { StatusHue } from "../status-label-manager/status-label-logic";

// The round marker of a status in its hue. Without a hue: a dashed circle.
interface Props {
  hue?: StatusHue | undefined;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
defineOptions({ inheritAttrs: false });
</script>

<template>
  <CircleDashed v-if="!props.hue" v-bind="$attrs" aria-hidden="true" :class="cn('size-3.5 shrink-0 text-muted-foreground', props.class)" />
  <span v-else aria-hidden="true" data-slot="status-dot" v-bind="$attrs" :class="cn('size-2.5 shrink-0 rounded-full', props.class)" :style="{ background: `var(--nq-tag-${props.hue})` }" />
</template>
