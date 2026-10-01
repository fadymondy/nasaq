<script setup lang="ts">
import { RadioGroupItem, RadioGroupRoot, useId } from "reka-ui";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { commerceValueAvailability, type CommerceOption, type CommerceProduct, type CommerceSelection } from "./commerce";
import { selectOptionValue } from "./pdp-logic";
import { usePdpStrings, type ProductDetailLabels } from "./pdp-strings";

// Option axes as radio groups: colour swatches, size buttons, image tiles or a select. Availability comes from
// `commerceValueAvailability`: sold-out values are crossed out, impossible ones hidden or disabled. Picking a
// value keeps the other picks that still combine and drops the ones that do not (`selectOptionValue`).
// v-model carries the selection (optionId -> valueId). Slot `option-action` ({ option }) sits next to an axis label.
interface Props {
  product: CommerceProduct;
  /** The picks so far (v-model). */
  modelValue: CommerceSelection;
  /**
   * What to do with a value that no variant has together with the other picks (for example size L in a colour
   * that is only made in S and M). "hide" (default) removes it; "disable" keeps it visible and unselectable.
   * Sold-out values are always shown, crossed out, and can still be selected so the page can say so.
   */
  impossible?: "hide" | "disable";
  /** Axes to flag as needing a pick, e.g. after "Add to cart" without a size. */
  invalid?: readonly string[];
  labels?: ProductDetailLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { impossible: "hide", invalid: undefined, labels: undefined });
const emit = defineEmits<{ "update:modelValue": [selection: CommerceSelection] }>();
defineSlots<{ "option-action"?: (props: { option: CommerceOption }) => unknown }>();

const s = usePdpStrings(() => props.labels);
const uid = useId();
const focusRing = "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus";

const axes = computed(() =>
  props.product.options.map((option) => {
    const availability = commerceValueAvailability(props.product, props.modelValue, option.id);
    return {
      option,
      availability,
      values: option.values.filter((v) => props.impossible === "disable" || availability[v.id] !== "none"),
      picked: option.values.find((v) => v.id === props.modelValue[option.id]),
      labelId: `${uid}-${option.id}`,
      display: option.display ?? "button",
      isInvalid: props.invalid?.includes(option.id) ?? false,
    };
  }),
);
const change = (optionId: string, valueId: unknown) => {
  if (typeof valueId === "string" && valueId) emit("update:modelValue", selectOptionValue(props.product, props.modelValue, optionId, valueId));
};
const stateOf = (a: (typeof axes.value)[number], id: string) => a.availability[id] ?? "available";
const spoken = (label: string, state: string) => (state === "out" ? `${label}, ${s.value.t.soldOut}` : state === "none" ? `${label}, ${s.value.t.unavailable}` : label);
const checked = (a: (typeof axes.value)[number], id: string) => props.modelValue[a.option.id] === id;
</script>

<template>
  <div data-slot="product-variant-picker" :class="cn('flex flex-col gap-4', props.class)">
    <div v-for="a in axes" :key="a.option.id" data-slot="product-option" :data-option="a.option.id" :data-invalid="a.isInvalid ? '' : undefined" class="flex flex-col gap-2">
      <div class="flex items-baseline justify-between gap-3">
        <span :id="a.labelId" class="text-label text-foreground">
          {{ a.option.name }}
          <span v-if="a.picked" class="text-muted-foreground">{{ ": " }}</span>
          <span v-if="a.picked" class="font-normal text-muted-foreground">{{ a.picked.label }}</span>
        </span>
        <slot name="option-action" :option="a.option" />
      </div>
      <NqSelect v-if="a.display === 'select'" :model-value="props.modelValue[a.option.id] ?? undefined" @update:model-value="change(a.option.id, $event)">
        <NqSelectTrigger :aria-labelledby="a.labelId" :invalid="a.isInvalid" class="max-w-xs">
          <NqSelectValue :placeholder="s.t.selectOption(a.option.name)" />
        </NqSelectTrigger>
        <NqSelectContent>
          <NqSelectItem v-for="v in a.values" :key="v.id" :value="v.id" :disabled="a.availability[v.id] === 'none'">
            {{ v.label }}{{ a.availability[v.id] === "out" ? ` · ${s.t.soldOut}` : "" }}
          </NqSelectItem>
        </NqSelectContent>
      </NqSelect>
      <RadioGroupRoot
        v-else
        :model-value="props.modelValue[a.option.id] ?? undefined"
        :dir="s.rtl ? 'rtl' : 'ltr'"
        :aria-labelledby="a.labelId"
        :aria-invalid="a.isInvalid || undefined"
        :class="cn('flex flex-wrap gap-2', a.isInvalid && 'rounded-control outline-1 outline-offset-4 outline-nq-danger')"
        @update:model-value="change(a.option.id, $event)"
      >
        <template v-for="v in a.values" :key="v.id">
          <RadioGroupItem
            v-if="a.display === 'swatch'"
            :value="v.id"
            :disabled="stateOf(a, v.id) === 'none'"
            :aria-label="spoken(v.label, stateOf(a, v.id))"
            :data-availability="stateOf(a, v.id)"
            :data-checked="checked(a, v.id) ? '' : undefined"
            :data-unchecked="checked(a, v.id) ? undefined : ''"
            :title="stateOf(a, v.id) === 'out' ? `${v.label} · ${s.t.soldOut}` : v.label"
            :class="
              cn(
                'relative inline-flex size-9 items-center justify-center rounded-full border border-nq-line-strong p-0.5 transition-shadow duration-150 ease-nq',
                focusRing,
                'data-checked:border-foreground data-checked:ring-1 data-checked:ring-foreground',
                'data-disabled:cursor-not-allowed data-disabled:opacity-40',
              )
            "
          >
            <span aria-hidden="true" class="relative block size-full overflow-hidden rounded-full border border-border" :style="{ backgroundColor: v.color }">
              <span v-if="stateOf(a, v.id) === 'out'" class="absolute start-1/2 top-1/2 h-px w-[150%] -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-nq-danger" />
            </span>
          </RadioGroupItem>
          <RadioGroupItem
            v-else-if="a.display === 'image'"
            :value="v.id"
            :disabled="stateOf(a, v.id) === 'none'"
            :aria-label="spoken(v.label, stateOf(a, v.id))"
            :data-availability="stateOf(a, v.id)"
            :data-checked="checked(a, v.id) ? '' : undefined"
            :data-unchecked="checked(a, v.id) ? undefined : ''"
            :class="
              cn(
                'relative size-14 overflow-hidden rounded-control border border-border bg-secondary transition-colors duration-150 ease-nq',
                focusRing,
                'data-checked:border-foreground data-checked:ring-1 data-checked:ring-foreground',
                'data-disabled:cursor-not-allowed data-disabled:opacity-40',
                stateOf(a, v.id) === 'out' && 'opacity-60',
              )
            "
          >
            <img v-if="v.image" :src="v.image" alt="" width="56" height="56" loading="lazy" class="size-full object-cover" />
            <span v-else class="flex size-full items-center justify-center text-caption">{{ v.label }}</span>
            <span v-if="stateOf(a, v.id) === 'out'" aria-hidden="true" class="absolute start-1/2 top-1/2 h-px w-[150%] -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-nq-danger" />
          </RadioGroupItem>
          <RadioGroupItem
            v-else
            :value="v.id"
            :disabled="stateOf(a, v.id) === 'none'"
            :aria-label="spoken(v.label, stateOf(a, v.id))"
            :data-availability="stateOf(a, v.id)"
            :data-checked="checked(a, v.id) ? '' : undefined"
            :data-unchecked="checked(a, v.id) ? undefined : ''"
            :class="
              cn(
                'relative inline-flex h-control min-w-11 items-center justify-center rounded-control border px-3 text-label transition-colors duration-150 ease-nq',
                focusRing,
                'border-border bg-card text-foreground hover:bg-nq-hover',
                'data-checked:border-foreground data-checked:ring-1 data-checked:ring-foreground',
                'data-disabled:cursor-not-allowed data-disabled:opacity-40 data-disabled:hover:bg-card',
                stateOf(a, v.id) === 'out' && 'border-dashed text-muted-foreground line-through decoration-nq-danger',
              )
            "
          >
            <bdi>{{ v.label }}</bdi>
          </RadioGroupItem>
        </template>
      </RadioGroupRoot>
    </div>
  </div>
</template>
