<script setup lang="ts">
import { ref } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { NqCheckbox } from "../checkbox";
import { useFormatNumber } from "../numeric";
import type { CommerceFacetValue } from "./commerce";
import { useListingStrings, type ListingLabels } from "./listing-strings";

// A checkbox list with counts and "Show more" (the brand group). Internal to store-listing.
interface Props {
  values: CommerceFacetValue[];
  limit?: number;
  labels?: ListingLabels;
}
const props = withDefaults(defineProps<Props>(), { limit: 6, labels: undefined });
const emit = defineEmits<{ toggle: [id: string] }>();
const { t } = useListingStrings(() => props.labels);
const fmt = useFormatNumber();
const all = ref(false);
const shown = () => (all.value ? props.values : props.values.filter((v, i) => i < props.limit || v.selected));
</script>

<template>
  <ul class="flex flex-col gap-1.5">
    <li v-for="v in shown()" :key="v.id">
      <label :class="cn('flex cursor-pointer items-center gap-2 text-body-sm', v.count === 0 && !v.selected && 'opacity-45')">
        <NqCheckbox :model-value="v.selected" @update:model-value="emit('toggle', v.id)" />
        <span class="min-w-0 flex-1 truncate">{{ v.label }}</span>
        <bdi class="tabular-nums text-caption text-muted-foreground">{{ fmt(v.count) }}</bdi>
      </label>
    </li>
  </ul>
  <NqButton v-if="props.values.length > props.limit" variant="link" size="sm" class="mt-1" @click="all = !all">{{ all ? t.showLess : t.showMore }}</NqButton>
</template>
