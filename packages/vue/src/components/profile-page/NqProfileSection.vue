<script setup lang="ts">
import { useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { formatNumber } from "../numeric";
import { NqSectionHeader } from "../section-header";
import { useProfileStrings } from "./strings";

// A titled block of the profile: a section header plus content, labelled by its heading.
interface Props {
  title: string;
  description?: string;
  /** How many items the section holds, shown as a badge beside the title. `0` is shown too. */
  count?: number;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const id = useId();
const { locale } = useProfileStrings(() => undefined);
</script>

<template>
  <section data-slot="profile-section" :aria-labelledby="id" :class="cn('flex flex-col gap-4', props.class)">
    <NqSectionHeader :heading-id="id">
      <template #title>
        <span v-if="props.count !== undefined" class="inline-flex items-center gap-2">
          {{ props.title }}
          <NqBadge variant="neutral" class="tabular-nums">{{ formatNumber(props.count, locale) }}</NqBadge>
        </span>
        <template v-else>{{ props.title }}</template>
      </template>
      <template v-if="props.description || $slots.description" #description><slot name="description">{{ props.description }}</slot></template>
      <template v-if="$slots.action" #action><slot name="action" /></template>
    </NqSectionHeader>
    <slot />
  </section>
</template>
