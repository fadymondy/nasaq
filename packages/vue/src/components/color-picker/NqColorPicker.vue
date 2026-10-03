<script setup lang="ts">
import { ChevronsUpDown, Pipette } from "lucide-vue-next";
import { RadioGroupItem, RadioGroupRoot } from "reka-ui";
import { computed, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { useFieldControl } from "../field/context";
import { NqPopover, NqPopoverContent, NqPopoverTrigger } from "../popover";
import { colorStrings, colorToCss, colorTriggerClass, normalizeHexColor, sameColor, tagSwatches, type ColorSwatch } from "./color-picker-logic";
import NqColorChip from "./NqColorChip.vue";

// <NqColorPicker v-model="color" aria-label="Label colour" />
// A swatch trigger that opens a popover with a swatch grid, a validated hex field and an optional native colour input.
// Inside a NqField the trigger takes the field's id, name, disabled and invalid state.
interface Props {
  /** Controlled value (v-model): a hex string with a leading hash or a CSS custom property name (`--nq-tag-red`). `null` is no colour. */
  modelValue?: string | null;
  defaultValue?: string | null;
  /** Choices in the grid. Default: the nine `--nq-tag-*` hues (see `tagSwatches`). An empty array hides the grid. */
  swatches?: readonly ColorSwatch[];
  /** `"hex"` is a hex-only picker: no swatch grid, the hex field (and the native "Custom" button) only. Default `"swatches"`. */
  mode?: "swatches" | "hex";
  /** Swatches per row. Default 5. */
  columns?: number;
  /** Show the hex input. Default true. */
  allowHex?: boolean;
  /** Show the "Custom" button that opens the browser's native colour input. Default true. */
  allowNative?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  /** Form field name: a hidden input carries the value. */
  name?: string;
  id?: string;
  /** Text on the trigger when nothing is chosen. */
  placeholder?: string;
  locale?: string;
  dir?: "ltr" | "rtl";
  ariaLabel?: string;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  defaultValue: null,
  swatches: undefined,
  mode: "swatches",
  columns: 5,
  allowHex: true,
  allowNative: true,
  disabled: undefined,
  invalid: undefined,
});
const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const nq = useNasaq();
const field = useFieldControl(() => props.id);
const locale = computed(() => props.locale ?? nq.locale.value);
const dir = computed(() => props.dir ?? (nq.isRtl.value ? "rtl" : "ltr"));
const t = computed(() => colorStrings(locale.value));
const swatches = computed(() => props.swatches ?? tagSwatches(locale.value));
const showSwatches = computed(() => props.mode !== "hex" && swatches.value.length > 0);

const inner = ref<string | null>(props.defaultValue);
const value = computed(() => (props.modelValue !== undefined ? props.modelValue : inner.value));
const open = ref(false);
const draft = ref("");
const showError = ref(false);
const nativeEl = ref<HTMLInputElement | null>(null);
const errorId = useId();

const isDisabled = computed(() => props.disabled ?? field.disabled.value);
const isInvalid = computed(() => Boolean(props.invalid || field.invalid.value));
const fieldName = computed(() => props.name ?? field.name.value);
const match = computed(() => (value.value ? swatches.value.find((s) => sameColor(s.value, value.value as string)) : undefined));
const label = computed(() => match.value?.label ?? (value.value ? (normalizeHexColor(value.value) ?? value.value) : null));
const draftHex = computed(() => normalizeHexColor(draft.value));

function commit(next: string) {
  inner.value = next;
  emit("update:modelValue", next);
}

function submitDraft() {
  const hex = normalizeHexColor(draft.value);
  if (!hex) {
    showError.value = draft.value.trim() !== "";
    return;
  }
  showError.value = false;
  draft.value = hex;
  if (!value.value || !sameColor(value.value, hex)) commit(hex);
}

function onOpen(next: boolean) {
  open.value = next;
  if (next) {
    draft.value = value.value ? (normalizeHexColor(value.value) ?? "") : "";
    showError.value = false;
  }
}

function onHexInput(e: Event) {
  const text = (e.target as HTMLInputElement).value;
  draft.value = text;
  showError.value = false;
  const hex = normalizeHexColor(text);
  // A complete 6 digit colour applies as you type; 3 digit shorthand waits for Enter or blur.
  if (hex && text.replace("#", "").length === 6 && (!value.value || !sameColor(value.value, hex))) commit(hex);
}

function openNative() {
  const input = nativeEl.value;
  if (!input) return;
  const hex = value.value ? normalizeHexColor(value.value) : null;
  if (hex) input.value = hex;
  input.click();
}

function onNative(e: Event) {
  const hex = normalizeHexColor((e.target as HTMLInputElement).value);
  if (!hex) return;
  draft.value = hex;
  showError.value = false;
  commit(hex);
}

function onSwatch(next: unknown) {
  if (next !== null && next !== undefined) commit(String(next));
}
</script>

<template>
  <NqPopover :open="open" @update:open="onOpen">
    <NqPopoverTrigger as-child>
      <button
        type="button"
        :id="field.id.value"
        :disabled="isDisabled || undefined"
        :aria-label="`${props.ariaLabel ?? t.choose}: ${label ?? t.none}`"
        :aria-invalid="isInvalid || undefined"
        :aria-describedby="field.describedBy.value"
        :data-invalid="isInvalid ? '' : undefined"
        :data-disabled="isDisabled ? '' : undefined"
        data-slot="color-picker-trigger"
        :class="cn(colorTriggerClass, props.class)"
      >
        <NqColorChip :color="value" />
        <span :class="cn('min-w-0 flex-1 truncate text-start', !label && 'text-muted-foreground')" dir="auto">{{ label ?? props.placeholder ?? t.none }}</span>
        <ChevronsUpDown aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />
      </button>
    </NqPopoverTrigger>
    <input v-if="fieldName" type="hidden" :name="fieldName" :value="value ?? ''" />
    <NqPopoverContent align="start" :dir="dir" :lang="locale" :aria-label="t.choose" class="w-64 p-3">
      <div class="flex flex-col gap-3">
        <RadioGroupRoot
          v-if="showSwatches"
          :aria-label="t.swatches"
          :model-value="match?.value ?? null"
          :dir="dir"
          data-slot="color-picker-swatches"
          :style="{ gridTemplateColumns: `repeat(${props.columns}, minmax(0, 1fr))` }"
          class="grid gap-2"
          @update:model-value="onSwatch"
        >
          <RadioGroupItem
            v-for="swatch in swatches"
            :key="swatch.value"
            :value="swatch.value"
            :aria-label="swatch.label"
            :title="swatch.label"
            data-slot="color-picker-swatch"
            :data-checked="match?.value === swatch.value ? '' : undefined"
            :data-unchecked="match?.value === swatch.value ? undefined : ''"
            :style="{ backgroundColor: colorToCss(swatch.value) }"
            :class="
              cn(
                'relative aspect-square w-full cursor-default rounded-control border border-nq-line-strong outline-none',
                'transition-shadow duration-150 ease-nq',
                'hover:shadow-[0_0_0_2px_var(--nq-line-strong)]',
                'data-checked:shadow-[0_0_0_2px_var(--popover),0_0_0_4px_var(--foreground)]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus',
              )
            "
          />
        </RadioGroupRoot>

        <div v-if="props.allowHex" class="flex flex-col gap-1">
          <div
            :class="
              cn(
                'flex h-control items-center gap-2 rounded-control border border-input bg-card px-2',
                'focus-within:border-nq-focus focus-within:outline-1 focus-within:outline-nq-focus',
                showError && 'border-nq-danger',
              )
            "
          >
            <NqColorChip :color="draftHex" />
            <input
              type="text"
              dir="ltr"
              inputmode="text"
              autocomplete="off"
              :spellcheck="false"
              maxlength="7"
              :aria-label="t.hex"
              :aria-invalid="showError || undefined"
              :aria-describedby="showError ? errorId : undefined"
              data-slot="color-picker-hex"
              :value="draft"
              class="h-full min-w-0 flex-1 border-0 bg-transparent text-start font-mono text-body-sm text-foreground outline-none pointer-coarse:text-[16px]"
              @input="onHexInput"
              @blur="submitDraft"
              @keydown.enter.prevent="submitDraft"
            />
          </div>
          <p v-if="showError" :id="errorId" role="alert" data-slot="color-picker-error" class="text-caption text-nq-danger-text">{{ t.invalid }}</p>
        </div>

        <template v-if="props.allowNative">
          <button
            type="button"
            data-slot="color-picker-custom"
            class="inline-flex h-control-sm min-h-[var(--nq-touch-min,0px)] items-center justify-center gap-2 rounded-control border border-border bg-card px-2.5 text-label text-foreground outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus [&_svg]:size-4"
            @click="openNative"
          >
            <Pipette aria-hidden="true" />
            {{ t.custom }}
          </button>
          <input ref="nativeEl" type="color" tabindex="-1" aria-hidden="true" class="sr-only" @change="onNative" />
        </template>
      </div>
    </NqPopoverContent>
  </NqPopover>
</template>
