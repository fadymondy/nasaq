<script setup lang="ts">
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { commerceValueAvailability, type CommerceOption, type CommerceProduct, type CommerceSelection } from "./commerce";
import { fillTemplate, useListingStrings, type ListingLabels } from "./listing-strings";
import NqStoreProductImage from "./NqStoreProductImage.vue";

// One option axis as a radio group: colour chips, image thumbnails or size buttons. Values with no variant are
// disabled; values that exist but are out of stock stay selectable and are struck through.
// Arrow keys move and select, following the reading direction.
interface Props {
  product: CommerceProduct;
  option: CommerceOption;
  selection: CommerceSelection;
  size?: "sm" | "md";
  /** Show the option name and the selected value above the group. */
  showLabel?: boolean;
  /** Cap the visible swatches; the rest collapse into "+n". */
  max?: number;
  labels?: ListingLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { size: "md", showLabel: false, max: undefined, labels: undefined });
const emit = defineEmits<{ select: [optionId: string, valueId: string]; preview: [valueId: string | null] }>();
const { t } = useListingStrings(() => props.labels);

const root = ref<HTMLElement | null>(null);
const availability = computed(() => commerceValueAvailability(props.product, props.selection, props.option.id));
const selected = computed(() => props.selection[props.option.id]);
const swatch = computed(() => props.option.display === "swatch" || props.option.display === "image");
const shown = computed(() => (props.max && props.option.values.length > props.max ? props.option.values.slice(0, props.max) : props.option.values));
const hidden = computed(() => props.option.values.length - shown.value.length);
const selectedLabel = computed(() => props.option.values.find((v) => v.id === selected.value)?.label);
const firstEnabled = computed(() => shown.value.find((v) => availability.value[v.id] !== "none")?.id);

function onKeydown(event: KeyboardEvent) {
  const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
  if (!keys.includes(event.key)) return;
  const radios = [...(root.value?.querySelectorAll<HTMLButtonElement>('[role="radio"]:not([disabled])') ?? [])];
  if (!radios.length) return;
  event.preventDefault();
  const rtl = getComputedStyle(event.currentTarget as HTMLElement).direction === "rtl";
  const at = radios.findIndex((r) => r === document.activeElement);
  const forward = event.key === "ArrowDown" || event.key === (rtl ? "ArrowLeft" : "ArrowRight");
  const next = event.key === "Home" ? 0 : event.key === "End" ? radios.length - 1 : (at + (forward ? 1 : -1) + radios.length) % radios.length;
  radios[next]?.focus();
  radios[next]?.click();
}
const stateOf = (id: string) => availability.value[id] ?? "none";
const labelOf = (id: string, label: string) => (stateOf(id) === "out" ? `${label}, ${t.value.optionSoldOut}` : stateOf(id) === "none" ? `${label}, ${t.value.optionUnavailable}` : label);
</script>

<template>
  <div data-slot="store-option-picker" :class="cn('flex min-w-0 flex-col gap-1.5', props.class)">
    <p v-if="props.showLabel" class="text-label text-foreground">
      {{ props.option.name }}
      <span v-if="selectedLabel" class="ms-1.5 font-normal text-muted-foreground">{{ selectedLabel }}</span>
    </p>
    <div ref="root" role="radiogroup" :aria-label="props.option.name" class="flex flex-wrap items-center gap-1.5" @keydown="onKeydown" @mouseleave="emit('preview', null)">
      <button
        v-for="value in shown"
        :key="value.id"
        type="button"
        role="radio"
        :aria-checked="selected === value.id"
        :aria-label="swatch ? labelOf(value.id, value.label) : undefined"
        :title="value.label"
        :disabled="stateOf(value.id) === 'none'"
        :tabindex="selected === value.id || (!selected && value.id === firstEnabled) ? 0 : -1"
        :data-state="stateOf(value.id)"
        :class="
          cn(
            'relative shrink-0 outline-none transition-[box-shadow,border-color] duration-150 ease-nq motion-reduce:transition-none',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:cursor-not-allowed disabled:opacity-40',
            swatch
              ? cn('rounded-full border border-nq-line-strong', props.size === 'sm' ? 'size-5' : 'size-8', selected === value.id && 'ring-2 ring-primary ring-offset-2 ring-offset-background')
              : cn(
                  'rounded-control border px-2.5 text-label tabular-nums',
                  props.size === 'sm' ? 'h-7 min-w-7 text-caption' : 'h-9 min-w-10',
                  selected === value.id ? 'border-primary bg-nq-selected text-foreground' : 'border-border bg-card text-foreground hover:bg-nq-hover',
                  stateOf(value.id) === 'out' && 'text-muted-foreground line-through',
                ),
          )
        "
        :style="swatch && value.color ? { backgroundColor: value.color } : undefined"
        @click="emit('select', props.option.id, value.id)"
        @mouseenter="emit('preview', value.id)"
        @focus="emit('preview', value.id)"
        @blur="emit('preview', null)"
      >
        <template v-if="swatch">
          <NqStoreProductImage v-if="props.option.display === 'image' && value.image" :src="value.image" alt="" class="rounded-full" />
          <span v-if="stateOf(value.id) === 'out'" aria-hidden="true" class="absolute inset-0 rounded-full bg-[linear-gradient(to_top_right,transparent_46%,var(--nq-fg)_46%,var(--nq-fg)_54%,transparent_54%)] opacity-70" />
        </template>
        <bdi v-else>{{ value.label }}</bdi>
      </button>
      <span v-if="hidden > 0" class="text-caption text-muted-foreground">{{ fillTemplate(t.moreValues, { n: hidden }) }}</span>
    </div>
  </div>
</template>
