<script setup lang="ts" generic="T">
import { ChevronDown } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { fill, useStrings, type TextUtilitiesLabels } from "./strings";
import { progressiveRemaining } from "./text-utilities-logic";

// A list that shows its first few items and reveals `step` more on each press, with the count left.
// Render each item with the default slot: `<template #default="{ item }">`.
const props = withDefaults(defineProps<{
  items: readonly T[];
  initial?: number;
  step?: number;
  labels?: TextUtilitiesLabels;
  class?: HTMLAttributes["class"];
}>(), { initial: 3, step: 3, labels: undefined });
const emit = defineEmits<{ reveal: [visible: number] }>();
defineSlots<{ default?: (p: { item: T; index: number }) => unknown }>();
const { t } = useStrings(() => props.labels);
const visible = ref(props.initial);
const shown = computed(() => Math.min(visible.value, props.items.length));
const remaining = computed(() => progressiveRemaining(shown.value, props.items.length, props.step));
function more() {
  visible.value = shown.value + remaining.value.next;
  emit("reveal", visible.value);
}
</script>

<template>
  <div data-slot="progressive-list" class="flex flex-col items-start gap-2">
    <ul :class="cn('flex w-full flex-col gap-2', props.class)">
      <li v-for="(item, i) in props.items.slice(0, shown)" :key="i" class="min-w-0">
        <slot :item="item" :index="i">{{ item }}</slot>
      </li>
    </ul>
    <NqButton v-if="remaining.left > 0" variant="ghost" size="sm" @click="more">
      <ChevronDown aria-hidden="true" />
      {{ fill(t.showMoreItems, { count: remaining.next }) }}
      <span class="text-muted-foreground">{{ fill(t.left, { left: remaining.left }) }}</span>
    </NqButton>
  </div>
</template>
