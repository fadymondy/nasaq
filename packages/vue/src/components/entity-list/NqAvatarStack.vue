<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAvatar } from "../avatar";
import { formatNumber } from "../numeric";
import type { EntityPerson } from "./NqPersonCell.vue";

// Overlapping avatars for a project's members, with a "+N" for the rest.
interface Props {
  people: readonly EntityPerson[];
  /** Avatars shown before "+N". Default 4. */
  max?: number;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { max: 4 });
const nq = useNasaq();
const shown = computed(() => props.people.slice(0, props.max));
const rest = computed(() => props.people.length - shown.value.length);
</script>

<template>
  <span v-if="!props.people.length" class="text-muted-foreground">—</span>
  <span v-else data-slot="avatar-stack" role="group" :aria-label="props.people.map((p) => p.name).join(', ')" :class="cn('inline-flex items-center', props.class)">
    <NqAvatar v-for="p in shown" :key="p.name" :name="p.name" :src="p.avatar" size="sm" class="-ms-1.5 ring-2 ring-card first:ms-0" />
    <span v-if="rest > 0" class="-ms-1.5 inline-flex size-6 items-center justify-center rounded-full bg-secondary text-[10px] font-medium tabular-nums text-secondary-foreground ring-2 ring-card">+{{ formatNumber(rest, nq.locale.value) }}</span>
  </span>
</template>
