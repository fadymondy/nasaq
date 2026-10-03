<script setup lang="ts">
import { type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqAvatar } from "../avatar";

// The first cell of a row and the head of a card: avatar or logo, name (default slot), subtitle (slot).
interface Props {
  /** Plain-text name for the avatar fallback and its label. */
  avatarName: string;
  avatar?: string;
  /** People are round; companies and projects are square (logos are never cropped to a circle). */
  shape?: "circle" | "square";
  size?: "md" | "lg";
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { shape: "circle", size: "md" });
defineSlots<{ default?: () => unknown; subtitle?: () => unknown }>();
</script>

<template>
  <div data-slot="entity-identity" :class="cn('flex min-w-0 items-center gap-3', props.class)">
    <NqAvatar :name="props.avatarName" :src="props.avatar" :shape="props.shape" :size="props.size" />
    <div class="flex min-w-0 flex-col">
      <span class="truncate text-label text-foreground"><slot /></span>
      <span v-if="$slots.subtitle" class="truncate text-body-sm text-muted-foreground"><slot name="subtitle" /></span>
    </div>
  </div>
</template>
