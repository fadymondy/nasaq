<script setup lang="ts">
import { computed } from "vue";
import { useNasaq, type ThemePreference } from "../../provider";
import { NqDropdownMenuRadioGroup, NqDropdownMenuRadioItem } from "../dropdown-menu";
import { THEME_OPTIONS, themeLabelsFor, type ThemeLabels } from "./labels";

// Theme radio items for use inside an NqDropdownMenu (e.g. the user menu).
const props = defineProps<{ labels?: Partial<ThemeLabels> }>();
const nq = useNasaq();
const t = computed(() => themeLabelsFor(nq.locale.value, props.labels));
</script>

<template>
  <NqDropdownMenuRadioGroup :model-value="nq.theme.value" @update:model-value="nq.setTheme($event as ThemePreference)">
    <NqDropdownMenuRadioItem v-for="option in THEME_OPTIONS" :key="option.value" :value="option.value">
      <component :is="option.icon" />
      {{ t[option.value] }}
    </NqDropdownMenuRadioItem>
  </NqDropdownMenuRadioGroup>
</template>
