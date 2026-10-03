<script lang="ts">
import type { HTMLAttributes } from "vue";

/** A person or organisation shown in a list: avatar or logo and a name. */
export interface EntityPerson {
  name: string;
  avatar?: string;
}
export interface Props {
  person?: EntityPerson | null;
  class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { cn } from "../../lib/cn";
import { NqAvatar } from "../avatar";

// An owner or assignee: small avatar and name. A dash when there is no person.
const props = defineProps<Props>();
</script>

<template>
  <span v-if="!props.person" class="text-muted-foreground">—</span>
  <span v-else data-slot="person-cell" :class="cn('inline-flex min-w-0 items-center gap-2', props.class)">
    <NqAvatar :name="props.person.name" :src="props.person.avatar" size="sm" />
    <span class="truncate text-body-sm">{{ props.person.name }}</span>
  </span>
</template>
