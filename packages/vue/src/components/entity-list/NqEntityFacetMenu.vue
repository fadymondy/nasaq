<script setup lang="ts" generic="T">
import { ListFilter } from "lucide-vue-next";
import { computed } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqDropdownMenu, NqDropdownMenuCheckboxItem, NqDropdownMenuContent, NqDropdownMenuGroup, NqDropdownMenuItem, NqDropdownMenuSeparator, NqDropdownMenuTrigger } from "../dropdown-menu";
import { formatNumber } from "../numeric";
import type { EntityFacet } from "./entity-list-logic";

// One multi-select filter of the entity list. Internal.
const props = defineProps<{ facet: EntityFacet<T>; chosen: string[]; resetLabel: string; locale: string }>();
const emit = defineEmits<{ change: [values: string[]] }>();
const set = computed(() => new Set(props.chosen));
function toggle(value: string) {
  const next = new Set(set.value);
  if (!next.delete(value)) next.add(value);
  emit("change", props.facet.options.map((o) => o.value).filter((v) => next.has(v)));
}
</script>

<template>
  <NqDropdownMenu>
    <NqDropdownMenuTrigger as-child>
      <NqButton size="sm" :data-facet="props.facet.id" :class="cn(!set.size && 'border-dashed text-muted-foreground')">
        <ListFilter aria-hidden="true" />
        {{ props.facet.title }}
        <NqBadge v-if="set.size" variant="outline" class="-me-1 tabular-nums">
          {{ set.size === 1 ? props.facet.options.find((o) => set.has(o.value))?.label : formatNumber(set.size, props.locale) }}
        </NqBadge>
      </NqButton>
    </NqDropdownMenuTrigger>
    <NqDropdownMenuContent class="max-h-80 min-w-48 overflow-y-auto">
      <NqDropdownMenuGroup>
        <NqDropdownMenuCheckboxItem v-for="o in props.facet.options" :key="o.value" :model-value="set.has(o.value)" @update:model-value="toggle(o.value)">
          <component :is="o.icon" v-if="o.icon" aria-hidden="true" />
          {{ o.label }}
        </NqDropdownMenuCheckboxItem>
      </NqDropdownMenuGroup>
      <template v-if="set.size">
        <NqDropdownMenuSeparator />
        <NqDropdownMenuItem @select="emit('change', [])">{{ props.resetLabel }}</NqDropdownMenuItem>
      </template>
    </NqDropdownMenuContent>
  </NqDropdownMenu>
</template>
