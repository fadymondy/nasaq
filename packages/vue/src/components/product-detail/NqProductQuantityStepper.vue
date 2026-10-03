<script setup lang="ts">
import { Minus, Plus } from "lucide-vue-next";
import { computed, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useFormatNumber } from "../numeric";
import { commerceClampQuantity } from "./commerce";
import { usePdpStrings, type ProductDetailLabels } from "./pdp-strings";

// A quantity stepper clamped to 1..max. Type a number and it is clamped when you leave the field or press
// Enter; ArrowUp/ArrowDown step. Reaching the limit says so in a live region. v-model carries the quantity.
interface Props {
  /** The quantity (v-model). */
  modelValue: number;
  /** Highest allowed (stock or per-order cap). Undefined = unlimited. */
  max?: number;
  disabled?: boolean;
  labels?: ProductDetailLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { max: undefined, disabled: undefined, labels: undefined });
const emit = defineEmits<{ "update:modelValue": [value: number] }>();
defineOptions({ inheritAttrs: false });

const s = usePdpStrings(() => props.labels);
const fmt = useFormatNumber();
const draft = ref<string | null>(null);
const hint = ref(false);
const limit = computed(() => (props.max !== undefined ? Math.max(props.max, 1) : undefined));
const clamped = computed(() => commerceClampQuantity(props.modelValue, limit.value));
watch([clamped, () => props.modelValue], () => clamped.value !== props.modelValue && emit("update:modelValue", clamped.value), { immediate: true });

/** Arabic-Indic digits typed on an Arabic keyboard to Latin, so Number() reads them. */
const toLatin = (text: string) => text.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));

function commit(raw: number) {
  const next = commerceClampQuantity(raw, limit.value);
  hint.value = limit.value !== undefined && Math.floor(raw) > limit.value;
  draft.value = null;
  emit("update:modelValue", next);
}
const atMax = computed(() => limit.value !== undefined && clamped.value >= limit.value);
const btn =
  "inline-flex size-control items-center justify-center text-foreground outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4";

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Enter") commit(draft.value === null ? clamped.value : Number(toLatin(draft.value)));
  else if (event.key === "ArrowUp") {
    event.preventDefault();
    commit(clamped.value + 1);
  } else if (event.key === "ArrowDown") {
    event.preventDefault();
    commit(clamped.value - 1);
  }
}
</script>

<template>
  <div data-slot="product-quantity" v-bind="$attrs" :class="cn('flex flex-col gap-1', props.class)">
    <div role="group" :aria-label="s.t.quantity" class="inline-flex w-fit items-center overflow-hidden rounded-control border border-border bg-card">
      <button type="button" :aria-label="s.t.decrease" :disabled="props.disabled || clamped <= 1" :class="btn" @click="commit(clamped - 1)">
        <Minus aria-hidden="true" />
      </button>
      <input
        type="text"
        inputmode="numeric"
        role="spinbutton"
        :aria-label="s.t.quantity"
        aria-valuemin="1"
        :aria-valuemax="limit"
        :aria-valuenow="clamped"
        :disabled="props.disabled"
        dir="ltr"
        :value="draft ?? fmt(clamped, { useGrouping: false })"
        class="h-control w-12 border-x border-border bg-transparent text-center text-body tabular-nums text-foreground outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus disabled:opacity-50 pointer-coarse:text-[16px]"
        @input="draft = ($event.target as HTMLInputElement).value.replace(/[^\d٠-٩]/g, '')"
        @focus="($event.target as HTMLInputElement).select()"
        @blur="draft !== null && commit(Number(toLatin(draft)))"
        @keydown="onKeydown"
      />
      <button type="button" :aria-label="s.t.increase" :disabled="props.disabled || atMax" :class="btn" @click="commit(clamped + 1)">
        <Plus aria-hidden="true" />
      </button>
    </div>
    <p aria-live="polite" :class="cn('text-caption text-nq-warning-text', !hint && 'sr-only')">{{ hint && limit !== undefined ? s.t.maxReached(fmt(limit)) : "" }}</p>
  </div>
</template>
