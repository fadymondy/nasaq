<script setup lang="ts">
import { Check, Moon, Sun } from "lucide-vue-next";
import { RadioGroupIndicator, RadioGroupRoot } from "reka-ui";
import { computed, ref, useId, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { themePreviewColors, type AppearanceTheme } from "./appearance-model";
import AppearanceRadio from "./AppearanceRadio.vue";
import { resolveStrings, type AppearanceLabels } from "./strings";

// Pick one of several themes from a gallery of small previews (page, sidebar, text and accent colours) instead of a
// bare dropdown. NqThemeToggle stays the quick light/dark/system switch; this is for products with named themes.
// Selection is announced as a radio group; arrow keys move it.
interface Props {
  themes: readonly AppearanceTheme[];
  /** Selected theme id (`v-model`). */
  modelValue?: string;
  defaultValue?: string;
  /** Visible heading. Default "Theme" (or the `label` slot). Pass `false` to hide it and name the group with `ariaLabel`. */
  label?: string | false;
  /** Cards per row at the widest. Default 4; it drops to 2 on phones. */
  columns?: 2 | 3 | 4;
  disabled?: boolean;
  name?: string;
  labels?: AppearanceLabels;
  ariaLabel?: string;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { modelValue: undefined, defaultValue: undefined, label: undefined, columns: 4, disabled: undefined, name: undefined, labels: undefined, ariaLabel: undefined });
const emit = defineEmits<{ "update:modelValue": [id: string] }>();

const nq = useNasaq();
const t = computed(() => resolveStrings(nq.locale.value.startsWith("ar") ? "ar" : "en", props.labels));
const current = ref(props.modelValue ?? props.defaultValue ?? props.themes[0]?.id ?? "");
watch(() => props.modelValue, (v) => v !== undefined && (current.value = v));
function onUpdate(v: unknown) {
  current.value = String(v);
  emit("update:modelValue", String(v));
}
const headingId = useId();
const cols = computed(() => ({ 2: "grid-cols-2", 3: "grid-cols-2 sm:grid-cols-3", 4: "grid-cols-2 sm:grid-cols-4" })[props.columns]);
const previews = computed(() => props.themes.map((theme) => ({ theme, colors: themePreviewColors(theme) })));
</script>

<template>
  <div data-slot="theme-gallery" :class="cn('flex min-w-0 flex-col gap-2', props.class)">
    <div v-if="props.label !== false" :id="headingId" class="text-label text-foreground">
      <slot name="label">{{ props.label ?? t.theme }}</slot>
    </div>
    <RadioGroupRoot
      :model-value="current"
      :disabled="props.disabled"
      :name="props.name"
      :aria-labelledby="props.label !== false ? headingId : undefined"
      :aria-label="props.label === false ? (props.ariaLabel ?? t.theme) : undefined"
      :class="cn('grid gap-3', cols)"
      @update:model-value="onUpdate"
    >
      <AppearanceRadio v-for="{ theme, colors } in previews" :key="theme.id" :value="theme.id" data-slot="theme-card">
        <span aria-hidden="true" class="relative flex h-20 overflow-hidden rounded-control border border-border" :style="{ background: colors[0] }">
          <span class="flex w-1/3 flex-col gap-1 p-1.5" :style="{ background: colors[1] }">
            <span class="h-1.5 w-full rounded-full opacity-80" :style="{ background: colors[3] }" />
            <span class="h-1 w-3/4 rounded-full opacity-40" :style="{ background: colors[2] }" />
            <span class="h-1 w-1/2 rounded-full opacity-40" :style="{ background: colors[2] }" />
          </span>
          <span class="flex flex-1 flex-col gap-1.5 p-2">
            <span class="h-2 w-2/3 rounded-full opacity-70" :style="{ background: colors[2] }" />
            <span class="h-1.5 w-full rounded-full opacity-30" :style="{ background: colors[2] }" />
            <span class="h-1.5 w-5/6 rounded-full opacity-30" :style="{ background: colors[2] }" />
            <span class="mt-auto h-3.5 w-1/3 rounded-control" :style="{ background: colors[3] }" />
          </span>
        </span>
        <span class="flex min-w-0 items-center gap-1.5 px-0.5 pb-0.5">
          <Moon v-if="theme.mode === 'dark'" aria-hidden="true" class="size-3.5 shrink-0 text-muted-foreground" />
          <Sun v-else-if="theme.mode === 'light'" aria-hidden="true" class="size-3.5 shrink-0 text-muted-foreground" />
          <span class="min-w-0 flex-1">
            <span class="block truncate text-label text-foreground">{{ theme.label }}</span>
            <span v-if="theme.description" class="block truncate text-caption text-muted-foreground">{{ theme.description }}</span>
          </span>
          <RadioGroupIndicator class="grid size-4 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
            <Check aria-hidden="true" class="size-3" />
          </RadioGroupIndicator>
        </span>
      </AppearanceRadio>
    </RadioGroupRoot>
  </div>
</template>
