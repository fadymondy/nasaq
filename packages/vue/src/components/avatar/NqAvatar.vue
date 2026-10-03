<script setup lang="ts">
import { AvatarFallback, AvatarImage, AvatarRoot } from "reka-ui";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { avatarVariants, initials } from "./variants";

interface Props {
  /** Used for the alt text and the initials fallback. Optional when you compose the default slot. */
  name?: string;
  src?: string;
  size?: "xs" | "sm" | "md" | "lg" | null;
  shape?: "circle" | "square" | null;
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<Props>(), { name: "" });
const fallbackAttrs = computed(() => (props.src ? { "aria-hidden": "true" } : props.name ? { role: "img", "aria-label": props.name } : {}));
</script>

<template>
  <AvatarRoot data-slot="avatar" as="span" :class="cn(avatarVariants({ size: props.size, shape: props.shape }), props.class)">
    <!-- Compose with NqAvatarImage and NqAvatarFallback; this replaces the src image and the initials. -->
    <slot>
      <AvatarImage v-if="props.src" :src="props.src" :alt="props.name" class="size-full object-cover" />
      <AvatarFallback :delay-ms="props.src ? 400 : undefined" v-bind="fallbackAttrs">
        <!-- Shown instead of the initials while there is no image or it fails to load (an icon, a glyph). -->
        <slot name="fallback">{{ initials(props.name) }}</slot>
      </AvatarFallback>
    </slot>
  </AvatarRoot>
</template>
