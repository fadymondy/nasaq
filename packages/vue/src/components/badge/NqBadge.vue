<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { badgeVariants, type BadgeVariants, type TagHue } from "./variants";

interface Props {
  variant?: BadgeVariants["variant"];
  /** Categorical hue for user labels (variant="tag"). Status must never rely on hue alone. */
  hue?: TagHue;
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<Props>(), { hue: "gray" });
const tagStyle = computed(() =>
  props.variant === "tag" ? { "--tag-solid": `var(--nq-tag-${props.hue})`, "--tag-soft": `var(--nq-tag-${props.hue}-soft)` } : undefined,
);
</script>

<template>
  <span data-slot="badge" :class="cn(badgeVariants({ variant: props.variant }), props.class)" :style="tagStyle">
    <slot />
  </span>
</template>
