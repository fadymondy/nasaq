<script setup lang="ts">
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { plainToMinor, toPlainDecimal } from "../currency-input/currency-input-logic";
import { NqInputGroup, NqInputGroupAddon, NqInputGroupInput, NqInputGroupText } from "../input-group";

// A number field that keeps an integer at a fixed scale, reads any digit set, and never shows a float.
interface Props {
  /** The value scaled to an integer: 1500 with `scale` 3 is 1.5. `null` is empty. */
  value: number | null;
  /** Decimals kept: 3 for quantities, 2 for percentages held in basis points. */
  scale: number;
  /** Text for a value while the field is not focused ("1.5", "15"). */
  format: (value: number) => string;
  min?: number;
  max?: number;
  suffix?: string;
  invalid?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  ariaLabel: string;
  id?: string;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { min: undefined, max: undefined, suffix: undefined, id: undefined });
const emit = defineEmits<{ change: [value: number | null] }>();

const focused = ref(false);
const text = ref("");
const outOfRange = computed(() => props.value !== null && ((props.min !== undefined && props.value < props.min) || (props.max !== undefined && props.value > props.max)));
const bad = computed(() => props.invalid || outOfRange.value || undefined);
const shown = computed(() => (focused.value ? text.value : props.value === null ? "" : props.format(props.value)));

function onFocus(e: FocusEvent) {
  text.value = props.value === null ? "" : props.format(props.value);
  focused.value = true;
  (e.currentTarget as HTMLInputElement).select();
}
function onInput(e: Event) {
  const el = e.target as HTMLInputElement;
  const plain = toPlainDecimal(el.value);
  if (plain === null) {
    text.value = "";
    emit("change", null);
    return;
  }
  const [whole = "0", fraction] = plain.replace("-", "").split(".");
  const clean = fraction === undefined ? whole : `${whole}.${fraction.slice(0, props.scale)}`;
  const scaled = plainToMinor(clean, props.scale, "truncate");
  if (scaled === null) return;
  text.value = clean;
  el.value = clean;
  if (scaled !== props.value) emit("change", scaled);
}
</script>

<template>
  <NqInputGroup :data-invalid="bad" :class="cn('min-w-0', props.class)">
    <NqInputGroupInput
      :id="props.id"
      ltr
      inputmode="decimal"
      autocomplete="off"
      :spellcheck="false"
      :model-value="shown"
      :disabled="props.disabled"
      :readonly="props.readOnly"
      :aria-invalid="bad"
      :aria-label="props.ariaLabel"
      class="text-end tabular-nums"
      @focus="onFocus"
      @blur="focused = false"
      @input="onInput"
    />
    <NqInputGroupAddon v-if="props.suffix" align="end">
      <NqInputGroupText>{{ props.suffix }}</NqInputGroupText>
    </NqInputGroupAddon>
  </NqInputGroup>
</template>
