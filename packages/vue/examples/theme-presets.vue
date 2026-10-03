<script setup lang="ts">
import { NqThemePresetPicker, NqThemePresetScope, THEME_PRESETS, useThemePreset } from "@fadymondy/nasaq/vue";
import { computed } from "vue";

// `apply: false` keeps the example from restyling the page it is shown in; the scope below previews the choice.
const { value, preset, setValue } = useThemePreset({ apply: false, storageKey: null, overrides: { brand: "#0e7490" } });
const current = computed(() => preset.value ?? THEME_PRESETS[0]!);
</script>

<template>
  <div class="flex flex-col gap-6">
    <NqThemePresetPicker :model-value="value" :overrides="{ brand: '#0e7490' }" @update:model-value="setValue" />
    <NqThemePresetScope :preset="current" :overrides="{ brand: '#0e7490' }" class="rounded-card border border-border p-4">
      <p class="text-label">Preview</p>
      <p class="text-body-sm text-muted-foreground">This region shows the selected theme without changing the page.</p>
    </NqThemePresetScope>
  </div>
</template>
