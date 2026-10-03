<script setup lang="ts">
import { Languages } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import {
  NqDropdownMenu,
  NqDropdownMenuContent,
  NqDropdownMenuGroup,
  NqDropdownMenuLabel,
  NqDropdownMenuRadioGroup,
  NqDropdownMenuRadioItem,
  NqDropdownMenuTrigger,
} from "../dropdown-menu";
import { DEFAULT_LOCALES, type LocaleOption } from "./labels";

// Language dropdown. Switching to Arabic flips the whole shell to RTL through NasaqProvider.
interface Props {
  /** Show the current language name beside the icon. */
  showLabel?: boolean;
  label?: string;
  /** The languages offered. Default English and Arabic. */
  locales?: readonly LocaleOption[];
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { showLabel: false, label: undefined, locales: () => DEFAULT_LOCALES });
const nq = useNasaq();
const current = computed(() => props.locales.find((l) => l.value === nq.locale.value));
const title = computed(() => props.label ?? (nq.locale.value.startsWith("ar") ? "اللغة" : "Language"));
</script>

<template>
  <NqDropdownMenu>
    <NqDropdownMenuTrigger as-child>
      <NqButton
        variant="ghost"
        :size="props.showLabel ? 'sm' : 'icon-sm'"
        :aria-label="props.showLabel ? undefined : `${title}: ${current?.label ?? nq.locale.value}`"
        :class="cn('text-muted-foreground', props.class)"
      >
        <Languages />
        <span v-if="props.showLabel" :lang="current?.value">{{ current?.label ?? nq.locale.value }}</span>
      </NqButton>
    </NqDropdownMenuTrigger>
    <NqDropdownMenuContent align="end" class="min-w-40">
      <NqDropdownMenuGroup>
        <NqDropdownMenuLabel>{{ title }}</NqDropdownMenuLabel>
      </NqDropdownMenuGroup>
      <NqDropdownMenuRadioGroup :model-value="nq.locale.value" @update:model-value="nq.setLocale(String($event))">
        <NqDropdownMenuRadioItem v-for="option in props.locales" :key="option.value" :value="option.value">
          <span :lang="option.value" :dir="option.dir">{{ option.label }}</span>
        </NqDropdownMenuRadioItem>
      </NqDropdownMenuRadioGroup>
    </NqDropdownMenuContent>
  </NqDropdownMenu>
</template>
