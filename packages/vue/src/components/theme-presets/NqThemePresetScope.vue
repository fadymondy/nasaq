<script setup lang="ts">
import { computed, type HTMLAttributes, type StyleValue } from "vue";
import { cn } from "../../lib/cn";
import { themePresetVars, type ThemeOverrides, type ThemePreset } from "./theme-presets-logic";

// Renders its content in a preset without touching the rest of the page: a live preview beside the picker.
interface Props {
  preset: ThemePreset;
  overrides?: ThemeOverrides;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { overrides: undefined });
defineOptions({ inheritAttrs: false });
// Pin the mode's roles inline: inside a dark page `.dark [data-brand]` would otherwise outrank a light scope.
const vars = computed(() => {
  const m = props.preset.mode === "dark" ? "d" : "l";
  return {
    ...themePresetVars(props.preset, props.overrides),
    "--nq-brand": `var(--nq-brand-${m})`,
    "--nq-action": `var(--nq-action-${m})`,
    "--nq-on-action": `var(--nq-on-action-${m})`,
    "--nq-primary-action": `var(--nq-action-${m})`,
  } as StyleValue;
});
</script>

<template>
  <div data-slot="theme-preset-scope" :data-theme="props.preset.mode" class="contents">
    <div data-brand="runtime" :style="vars" v-bind="$attrs" :class="cn('bg-background text-foreground', props.class)">
      <slot />
    </div>
  </div>
</template>
