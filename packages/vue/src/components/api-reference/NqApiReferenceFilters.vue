<script setup lang="ts">
import { Search } from "lucide-vue-next";
import { NqChip, NqChipGroup } from "../chip-group";
import { NqInput } from "../field";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import type { ToolAccess } from "./format";
import type { ApiReferenceLabels } from "./strings";

// The search box, category chips and access filter, shared by the reference and catalog views of NqApiReference.
defineProps<{
  categories: string[];
  accessCounts: Record<ToolAccess, number>;
  t: ApiReferenceLabels;
}>();
const query = defineModel<string>("query", { required: true });
const category = defineModel<string>("category", { required: true });
const access = defineModel<ToolAccess | "all">("access", { required: true });
const levels = ["read", "write", "destructive"] as const;
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="relative">
      <Search aria-hidden="true" class="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <NqInput v-model="query" type="search" :placeholder="t.search" :aria-label="t.search" class="ps-8" />
    </div>
    <NqChipGroup v-if="categories.length > 1" v-model="category" :ariaLabel="t.tools">
      <NqChip value="all">{{ t.all }}</NqChip>
      <NqChip v-for="c in categories" :key="c" :value="c">{{ c }}</NqChip>
    </NqChipGroup>
    <NqToggleGroup :model-value="[access]" :aria-label="t.access" class="flex-wrap" @update:model-value="(v: string[]) => (access = (v[0] as ToolAccess | 'all' | undefined) ?? 'all')">
      <NqToggle value="all">{{ t.accessAll }}</NqToggle>
      <NqToggle v-for="a in levels" :key="a" :value="a" :disabled="accessCounts[a] === 0">{{ t.accessLevels[a] }}</NqToggle>
    </NqToggleGroup>
  </div>
</template>
