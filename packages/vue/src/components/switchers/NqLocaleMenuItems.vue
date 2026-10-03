<script setup lang="ts">
import { useNasaq } from "../../provider";
import { NqDropdownMenuRadioGroup, NqDropdownMenuRadioItem } from "../dropdown-menu";
import { DEFAULT_LOCALES, type LocaleOption } from "./labels";

// Locale radio items for use inside an NqDropdownMenu. Each language is shown in its own script.
const props = withDefaults(defineProps<{ locales?: readonly LocaleOption[] }>(), { locales: () => DEFAULT_LOCALES });
const nq = useNasaq();
</script>

<template>
  <NqDropdownMenuRadioGroup :model-value="nq.locale.value" @update:model-value="nq.setLocale(String($event))">
    <NqDropdownMenuRadioItem v-for="option in props.locales" :key="option.value" :value="option.value">
      <span :lang="option.value" :dir="option.dir">{{ option.label }}</span>
    </NqDropdownMenuRadioItem>
  </NqDropdownMenuRadioGroup>
</template>
