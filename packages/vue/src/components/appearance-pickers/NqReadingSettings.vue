<script setup lang="ts">
import { Minus, Plus, RotateCcw } from "lucide-vue-next";
import { computed, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import {
  DEFAULT_READING_PREFERENCES,
  isDefaultReading,
  READING_FONT_SIZES,
  READING_SPACINGS,
  READING_WIDTHS,
  readingFontPercent,
  readingStyleVars,
  stepReadingFontSize,
  type ReadingFontSize,
  type ReadingPreferences,
  type ReadingSpacing,
  type ReadingWidth,
} from "./appearance-model";
import { resolveStrings, type AppearanceLabels } from "./strings";

// Reading comfort settings: text size, line width and line spacing, with a live sample. It only holds the choice; apply it
// to your reading area with `readingStyleVars(value)` (sets `--reading-scale`, `--reading-max-width`, `--reading-line-height`)
// and save it with `JSON.stringify` (read it back with `parseReadingPreferences`).
interface Props {
  /** The choice (`v-model`). */
  modelValue?: ReadingPreferences;
  defaultValue?: ReadingPreferences;
  /** Show the live sample paragraph under the controls. Default true. */
  showPreview?: boolean;
  /** Replace the sample title and paragraph (or use the `preview-title` and `preview-body` slots). */
  previewTitle?: string;
  previewBody?: string;
  /** Which controls to show. Default all three. */
  controls?: readonly ("fontSize" | "width" | "spacing")[];
  disabled?: boolean;
  labels?: AppearanceLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  defaultValue: undefined,
  showPreview: true,
  previewTitle: undefined,
  previewBody: undefined,
  controls: () => ["fontSize", "width", "spacing"],
  disabled: false,
  labels: undefined,
});
const emit = defineEmits<{ "update:modelValue": [next: ReadingPreferences] }>();

const nq = useNasaq();
const t = computed(() => resolveStrings(nq.locale.value.startsWith("ar") ? "ar" : "en", props.labels));
const prefs = ref<ReadingPreferences>({ ...(props.modelValue ?? props.defaultValue ?? DEFAULT_READING_PREFERENCES) });
watch(() => props.modelValue, (v) => v && (prefs.value = { ...v }), { deep: true });
function setPrefs(next: ReadingPreferences) {
  prefs.value = next;
  emit("update:modelValue", next);
}
function set<K extends keyof ReadingPreferences>(key: K, next: string[] | string | undefined) {
  const value = Array.isArray(next) ? next[0] : next;
  if (value) setPrefs({ ...prefs.value, [key]: value as ReadingPreferences[K] });
}
const show = (key: "fontSize" | "width" | "spacing") => props.controls.includes(key);
const styleVars = computed(() => readingStyleVars(prefs.value));
const firstSize = READING_FONT_SIZES[0];
const lastSize = READING_FONT_SIZES[READING_FONT_SIZES.length - 1];
</script>

<template>
  <div data-slot="reading-settings" :class="cn('flex min-w-0 flex-col gap-4', props.class)">
    <div v-if="show('fontSize')" class="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
      <div class="text-label text-foreground sm:w-32 sm:shrink-0">{{ t.fontSize }}</div>
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <NqButton variant="secondary" size="icon-sm" :aria-label="t.smaller" :disabled="props.disabled || prefs.fontSize === firstSize" @click="setPrefs({ ...prefs, fontSize: stepReadingFontSize(prefs.fontSize, -1) })">
            <Minus aria-hidden="true" />
          </NqButton>
          <NqToggleGroup :model-value="[prefs.fontSize]" :disabled="props.disabled" :aria-label="t.fontSize" @update:model-value="set('fontSize', $event)">
            <NqToggle v-for="size in READING_FONT_SIZES" :key="size" :value="size" :aria-label="t.sizes[size as ReadingFontSize]">
              <span dir="ltr" class="tabular-nums">{{ readingFontPercent(size) }}%</span>
            </NqToggle>
          </NqToggleGroup>
          <NqButton variant="secondary" size="icon-sm" :aria-label="t.larger" :disabled="props.disabled || prefs.fontSize === lastSize" @click="setPrefs({ ...prefs, fontSize: stepReadingFontSize(prefs.fontSize, 1) })">
            <Plus aria-hidden="true" />
          </NqButton>
        </div>
      </div>
    </div>
    <div v-if="show('width')" class="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
      <div class="text-label text-foreground sm:w-32 sm:shrink-0">{{ t.width }}</div>
      <div class="min-w-0">
        <NqToggleGroup :model-value="[prefs.width]" :disabled="props.disabled" :aria-label="t.width" @update:model-value="set('width', $event)">
          <NqToggle v-for="w in READING_WIDTHS" :key="w" :value="w">{{ t.widths[w as ReadingWidth] }}</NqToggle>
        </NqToggleGroup>
      </div>
    </div>
    <div v-if="show('spacing')" class="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
      <div class="text-label text-foreground sm:w-32 sm:shrink-0">{{ t.spacing }}</div>
      <div class="min-w-0">
        <NqToggleGroup :model-value="[prefs.spacing]" :disabled="props.disabled" :aria-label="t.spacing" @update:model-value="set('spacing', $event)">
          <NqToggle v-for="s in READING_SPACINGS" :key="s" :value="s">{{ t.spacings[s as ReadingSpacing] }}</NqToggle>
        </NqToggleGroup>
      </div>
    </div>
    <div class="flex justify-end">
      <NqButton variant="ghost" size="sm" :disabled="props.disabled || isDefaultReading(prefs)" @click="setPrefs({ ...DEFAULT_READING_PREFERENCES })">
        <RotateCcw aria-hidden="true" class="rtl:-scale-x-100" />
        {{ t.reset }}
      </NqButton>
    </div>
    <section v-if="props.showPreview" :aria-label="t.preview" data-slot="reading-preview" class="min-w-0 overflow-hidden rounded-card border border-border bg-card p-4" :style="styleVars">
      <div class="mx-auto" style="max-width: var(--reading-max-width); font-size: calc(1rem * var(--reading-scale)); line-height: var(--reading-line-height)">
        <h3 class="mb-1 font-semibold text-foreground" style="font-size: 1.25em; line-height: 1.3">
          <slot name="preview-title">{{ props.previewTitle ?? t.previewTitle }}</slot>
        </h3>
        <p class="text-nq-fg-body"><slot name="preview-body">{{ props.previewBody ?? t.previewBody }}</slot></p>
      </div>
    </section>
  </div>
</template>
