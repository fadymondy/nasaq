<script setup lang="ts">
import { Check, ImagePlus } from "lucide-vue-next";
import { RadioGroupIndicator, RadioGroupRoot } from "reka-ui";
import { computed, getCurrentInstance, ref, useId, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqSlider } from "../slider";
import { clampWallpaperDim, groupWallpapers, wallpaperCss, type AppearanceWallpaper } from "./appearance-model";
import AppearanceRadio from "./AppearanceRadio.vue";
import { resolveStrings, type AppearanceLabels } from "./strings";

// Pick a wallpaper from gradients, colours and pictures, optionally upload your own and dim it so text stays readable.
// Wallpapers are CSS backgrounds or picture URLs (see `AppearanceWallpaper`); the picker only reports the choice, you
// paint it with `wallpaperCss(background)` and the dim as an overlay.
interface Props {
  wallpapers: readonly AppearanceWallpaper[];
  /** Selected wallpaper id, or `null` for none (`v-model`). */
  modelValue?: string | null;
  defaultValue?: string | null;
  /** Amount the picture is dimmed, 0 to 60 percent (`v-model:dim`). Shows the slider when `dim` is set or `@update:dim` is listened to. */
  dim?: number;
  /** Shows the upload tile. Receives the chosen file; add the resulting wallpaper to `wallpapers` yourself. Async is fine (`@upload`). */
  onUpload?: (file: File) => void | Promise<void>;
  /** Accepted file types for the upload. Default "image/*". */
  accept?: string;
  /** Offer a "None" tile first. Default true. */
  allowNone?: boolean;
  label?: string | false;
  disabled?: boolean;
  labels?: AppearanceLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  defaultValue: undefined,
  dim: undefined,
  onUpload: undefined,
  accept: "image/*",
  allowNone: true,
  label: undefined,
  disabled: false,
  labels: undefined,
});
const emit = defineEmits<{ "update:modelValue": [id: string | null]; "update:dim": [percent: number] }>();

const NONE_VALUE = "__none__";
const nq = useNasaq();
const t = computed(() => resolveStrings(nq.locale.value.startsWith("ar") ? "ar" : "en", props.labels));
const current = ref<string | null>(props.modelValue !== undefined ? props.modelValue : (props.defaultValue ?? null));
watch(() => props.modelValue, (v) => v !== undefined && (current.value = v));
function onUpdate(v: unknown) {
  current.value = v === NONE_VALUE ? null : String(v);
  emit("update:modelValue", current.value);
}

const dimState = ref(0);
const dimValue = computed(() => clampWallpaperDim(props.dim ?? dimState.value));
const showDim = props.dim !== undefined || typeof getCurrentInstance()?.vnode.props?.["onUpdate:dim"] !== "undefined";
function onDim(v: number | number[]) {
  const next = clampWallpaperDim(Array.isArray(v) ? (v[0] ?? 0) : v);
  dimState.value = next;
  emit("update:dim", next);
}

const headingId = useId();
const fileRef = ref<HTMLInputElement | null>(null);
const uploading = ref(false);
const groups = computed(() => groupWallpapers(props.wallpapers));
const tile = "aspect-[4/3] w-full rounded-control border border-border";

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file || !props.onUpload) return;
  uploading.value = true;
  try {
    await props.onUpload(file);
  } finally {
    uploading.value = false;
  }
}
</script>

<template>
  <div data-slot="wallpaper-picker" :class="cn('flex min-w-0 flex-col gap-3', props.class)">
    <div v-if="props.label !== false" :id="headingId" class="text-label text-foreground">
      <slot name="label">{{ props.label ?? t.wallpaper }}</slot>
    </div>
    <RadioGroupRoot
      :model-value="current ?? NONE_VALUE"
      :disabled="props.disabled"
      :aria-labelledby="props.label !== false ? headingId : undefined"
      :aria-label="props.label === false ? t.wallpaper : undefined"
      class="flex flex-col gap-3"
      @update:model-value="onUpdate"
    >
      <div v-for="({ group, items }, gi) in groups" :key="group || '_'" class="flex flex-col gap-1.5">
        <div v-if="group" class="text-caption text-muted-foreground">{{ group }}</div>
        <div class="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
          <AppearanceRadio v-if="gi === 0 && props.allowNone" :value="NONE_VALUE" data-slot="wallpaper-none" :aria-label="t.none" class="p-1">
            <span aria-hidden="true" :class="cn(tile, 'grid place-items-center bg-nq-surface-soft text-caption text-muted-foreground')">{{ t.none }}</span>
            <RadioGroupIndicator class="absolute end-2 top-2 grid size-4 place-items-center rounded-full bg-primary text-primary-foreground"><Check aria-hidden="true" class="size-3" /></RadioGroupIndicator>
          </AppearanceRadio>
          <AppearanceRadio v-for="w in items" :key="w.id" :value="w.id" data-slot="wallpaper-tile" :aria-label="w.label" :title="w.label" class="p-1">
            <span aria-hidden="true" :class="tile" :style="{ background: wallpaperCss(w.background) }" />
            <RadioGroupIndicator class="absolute end-2 top-2 grid size-4 place-items-center rounded-full bg-primary text-primary-foreground"><Check aria-hidden="true" class="size-3" /></RadioGroupIndicator>
          </AppearanceRadio>
          <button
            v-if="gi === groups.length - 1 && props.onUpload"
            type="button"
            :disabled="props.disabled || uploading"
            class="flex aspect-[4/3] flex-col items-center justify-center gap-1 self-start rounded-card border border-border border-dashed p-1 text-caption text-muted-foreground outline-none transition-colors hover:border-nq-line-strong hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:opacity-50"
            @click="fileRef?.click()"
          >
            <ImagePlus aria-hidden="true" class="size-4" />
            {{ t.upload }}
          </button>
        </div>
      </div>
    </RadioGroupRoot>
    <input v-if="props.onUpload" ref="fileRef" type="file" :accept="props.accept" hidden @change="onFile" />
    <NqSlider
      v-if="showDim"
      :label="t.dim"
      :min="0"
      :max="60"
      :step="5"
      :model-value="dimValue"
      :disabled="props.disabled || current === null"
      :format="{ style: 'unit', unit: 'percent', maximumFractionDigits: 0 }"
      @update:model-value="onDim"
    />
  </div>
</template>
