<script setup lang="ts">
import { ToggleGroupItem, ToggleGroupRoot } from "reka-ui";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq, type ThemePreference } from "../../provider";
import { NqTooltip } from "../tooltip";
import { THEME_OPTIONS, themeLabelsFor, type ThemeLabels } from "./labels";

// Segmented Light / Dark / System control (Linear, Raycast). Arrow keys move between options.
const props = defineProps<{ labels?: Partial<ThemeLabels>; class?: HTMLAttributes["class"] }>();
const nq = useNasaq();
const t = computed(() => themeLabelsFor(nq.locale.value, props.labels));
function onChange(value: unknown) {
  // One option is always selected: clicking the active one does nothing.
  if (typeof value === "string" && value) nq.setTheme(value as ThemePreference);
}
defineOptions({ inheritAttrs: false });
</script>

<template>
  <ToggleGroupRoot
    v-bind="$attrs"
    data-slot="theme-switcher"
    type="single"
    :aria-label="t.group"
    :model-value="nq.theme.value"
    :class="cn('inline-flex h-control-sm items-center gap-px rounded-control border border-border bg-card p-0.5', props.class)"
    @update:model-value="onChange"
  >
    <NqTooltip v-for="option in THEME_OPTIONS" :key="option.value" :content="t[option.value]">
      <ToggleGroupItem
        :value="option.value"
        :aria-label="t[option.value]"
        :data-pressed="nq.theme.value === option.value ? '' : undefined"
        :class="
          cn(
            'inline-flex h-full aspect-square items-center justify-center rounded-[4px] text-muted-foreground outline-none',
            'transition-colors duration-150 ease-nq hover:text-foreground',
            'focus-visible:outline-2 focus-visible:outline-nq-focus data-pressed:bg-nq-selected data-pressed:text-foreground',
            '[&_svg]:size-3.5',
          )
        "
      >
        <component :is="option.icon" />
      </ToggleGroupItem>
    </NqTooltip>
  </ToggleGroupRoot>
</template>
