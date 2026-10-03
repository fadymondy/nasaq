<script setup lang="ts">
import { AvatarImage } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

/** The image part, for composing inside NqAvatar. It renders nothing until it has loaded, so NqAvatarFallback shows meanwhile. */
const props = withDefaults(defineProps<{ src: string; alt?: string; class?: HTMLAttributes["class"] }>(), { alt: "" });
</script>

<template>
  <AvatarImage data-slot="avatar-image" :src="props.src" :alt="props.alt" :class="cn('size-full object-cover', props.class)" />
</template>
