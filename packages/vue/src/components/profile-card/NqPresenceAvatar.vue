<script setup lang="ts">
import { NqAvatar } from "../avatar";
import NqPresenceDot from "./NqPresenceDot.vue";
import type { PersonProfile } from "./types";

// An avatar with its presence dot at the corner.
interface Props {
  person: Pick<PersonProfile, "name" | "avatar" | "presence">;
  size?: "xs" | "sm" | "md" | "lg";
}
const props = withDefaults(defineProps<Props>(), { size: "md" });
</script>

<template>
  <span data-slot="presence-avatar" class="relative inline-flex shrink-0">
    <NqAvatar :name="props.person.name" :src="props.person.avatar" :size="props.size" />
    <NqPresenceDot v-if="props.person.presence" :presence="props.person.presence" class="absolute -end-0.5 -bottom-0.5 border-2 border-popover" />
  </span>
</template>
