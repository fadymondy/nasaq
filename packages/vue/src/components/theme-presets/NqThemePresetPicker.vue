<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { useNasaq } from "../../provider";
import { NqThemeGallery, type AppearanceLabels } from "../appearance-pickers";
import { THEME_PRESETS, themePresetSwatches, type ThemeOverrides, type ThemePreset } from "./theme-presets-logic";

// A gallery of named themes (light or dark plus brand colours). It only reports the choice: apply it with
// `useThemePreset`, or preview a region with `NqThemePresetScope`.
interface Props {
  /** Default: `THEME_PRESETS` (Nasaq, purple, rose and emerald, each dark and light). */
  presets?: readonly ThemePreset[];
  /** Shown in every preview, so a tenant colour can be compared across light and dark. */
  overrides?: ThemeOverrides;
  /** Selected preset id (`v-model`). */
  modelValue?: string;
  defaultValue?: string;
  /** Visible heading. Default "Theme". Pass `false` to hide it and name the group with `ariaLabel`. */
  label?: string | false;
  /** Cards per row at the widest. Default 4; it drops to 2 on phones. */
  columns?: 2 | 3 | 4;
  disabled?: boolean;
  name?: string;
  labels?: AppearanceLabels;
  ariaLabel?: string;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  presets: () => THEME_PRESETS,
  overrides: undefined,
  modelValue: undefined,
  defaultValue: undefined,
  label: undefined,
  columns: 4,
  disabled: undefined,
  name: undefined,
  labels: undefined,
  ariaLabel: undefined,
});
const emit = defineEmits<{ "update:modelValue": [id: string] }>();
const nq = useNasaq();
const themes = computed(() =>
  props.presets.map((p) => ({
    id: p.id,
    label: (nq.locale.value.startsWith("ar") && p.labelAr) || p.label,
    mode: p.mode,
    swatches: themePresetSwatches(p, props.overrides),
  })),
);
</script>

<template>
  <NqThemeGallery
    :themes="themes"
    :model-value="props.modelValue"
    :default-value="props.defaultValue"
    :label="props.label"
    :columns="props.columns"
    :disabled="props.disabled"
    :name="props.name"
    :labels="props.labels"
    :aria-label="props.ariaLabel"
    :class="props.class"
    @update:model-value="(id: string) => emit('update:modelValue', id)"
  />
</template>
