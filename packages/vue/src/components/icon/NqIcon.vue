<script setup lang="ts">
import { computed, type Component, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { DIRECTIONAL_ICONS, iconName } from "./directional";

const props = withDefaults(defineProps<{
  /** A lucide-vue-next icon component. */
  icon: Component;
  /** The icon's name ("arrow-right"), when it cannot be read from the component. Only used to decide on mirroring. */
  name?: string;
  /** Force mirroring on/off. Defaults to the DIRECTIONAL_ICONS list. */
  directional?: boolean;
  /** Accessible name for a meaningful icon. When set the icon is `role="img"` instead of `aria-hidden`. */
  label?: string;
  class?: HTMLAttributes["class"];
}>(), { directional: undefined });

// Mirrors via the rtl: variant, so it follows the nearest dir attribute with no JS.
const mirror = computed(() => props.directional ?? DIRECTIONAL_ICONS.has(iconName(props.icon, props.name)));
</script>

<template>
  <component
    :is="props.icon"
    :role="props.label ? 'img' : undefined"
    :aria-label="props.label"
    :aria-hidden="props.label ? undefined : 'true'"
    data-slot="icon"
    :class="cn(mirror && 'rtl:-scale-x-100', props.class)"
  />
</template>
