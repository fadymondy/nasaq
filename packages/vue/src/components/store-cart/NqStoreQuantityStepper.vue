<script setup lang="ts">
import { Minus, Plus } from "lucide-vue-next";
import { computed, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { commerceClampQuantity } from "./commerce";
import { useStoreCartStrings, type StoreCartLabels } from "./strings";

// Minus, a number you can type in, plus. It is a spin button: Arrow Up and Down step, Home and End jump to the limits,
// and typing more than `max` is lowered to it. At the limit a note says how many are available.
interface Props {
  value: number;
  /** Stock or per-order limit. Plus stops here and typing more is lowered to it. */
  max?: number;
  min?: number;
  /** The product name, so the buttons read "Increase quantity of Everyday cotton tee". */
  name: string;
  disabled?: boolean;
  labels?: StoreCartLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { max: undefined, min: 1, disabled: undefined, labels: undefined });
const emit = defineEmits<{ change: [quantity: number] }>();
const { t, n } = useStoreCartStrings(() => props.labels);
const hintId = useId();
const draft = ref<string | null>(null);
const top = computed(() => (props.max !== undefined ? Math.max(props.max, props.min) : undefined));
const atMax = computed(() => top.value !== undefined && props.value >= top.value);
const toLatin = (value: string) => value.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
const clamp = (q: number) => Math.max(props.min, commerceClampQuantity(q, top.value));
function set(q: number) {
  const next = clamp(q);
  if (next !== props.value || q !== next) emit("change", next);
}
function commit() {
  if (draft.value === null) return;
  const parsed = Number.parseInt(toLatin(draft.value).replace(/[^\d]/g, ""), 10);
  draft.value = null;
  if (Number.isFinite(parsed)) set(parsed);
}
function onKeydown(event: KeyboardEvent) {
  if (event.key === "Enter") return void commit();
  const step = event.key === "ArrowUp" ? 1 : event.key === "ArrowDown" ? -1 : 0;
  if (step) {
    event.preventDefault();
    draft.value = null;
    set(props.value + step);
  } else if (event.key === "Home") {
    event.preventDefault();
    set(props.min);
  } else if (event.key === "End" && top.value !== undefined) {
    event.preventDefault();
    set(top.value);
  }
}
</script>

<template>
  <div data-slot="store-quantity-stepper" :class="cn('flex flex-col gap-1', props.class)">
    <div role="group" :aria-label="t.quantityOf(props.name)" class="inline-flex w-fit items-center rounded-control border border-input bg-card">
      <NqButton variant="ghost" size="icon-sm" :aria-label="t.decrease(props.name)" :disabled="props.disabled || props.value <= props.min" @click="set(props.value - 1)">
        <Minus aria-hidden="true" />
      </NqButton>
      <input
        role="spinbutton"
        type="text"
        inputmode="numeric"
        dir="ltr"
        :aria-label="t.quantity"
        :aria-valuemin="props.min"
        :aria-valuenow="props.value"
        :aria-valuemax="top"
        :aria-describedby="atMax ? hintId : undefined"
        :disabled="props.disabled"
        :value="draft ?? String(props.value)"
        class="h-control-sm w-10 border-0 bg-transparent text-center text-body tabular-nums text-foreground outline-none focus-visible:outline-2 focus-visible:outline-nq-focus pointer-coarse:text-[16px]"
        @input="draft = ($event.target as HTMLInputElement).value"
        @focus="($event.target as HTMLInputElement).select()"
        @blur="commit"
        @keydown="onKeydown"
      />
      <NqButton variant="ghost" size="icon-sm" :aria-label="t.increase(props.name)" :disabled="props.disabled || atMax" @click="set(props.value + 1)">
        <Plus aria-hidden="true" />
      </NqButton>
    </div>
    <span v-if="atMax && top !== undefined" :id="hintId" class="text-caption text-muted-foreground">{{ t.maxReached(n(top)) }}</span>
  </div>
</template>
