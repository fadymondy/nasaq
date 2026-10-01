<script setup lang="ts">
import { ChevronsUpDown, X } from "lucide-vue-next";
import { ComboboxAnchor, ComboboxInput, ComboboxTrigger } from "reka-ui";
import { inject, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useT } from "../../provider";
import { boxClass, iconButtonClass, inputClass } from "./classes";
import { COMBOBOX_KEY } from "./context";

// Single-select control: a Select-looking box with a typeahead input, clear button and chevron.
// Native input attributes (placeholder, id, aria-label, name …) go to the text input.
defineOptions({ inheritAttrs: false });
interface Props {
  /** Show a clear button while there is a selection. Default true. */
  clearable?: boolean;
  /** Accessible label of the clear button. Localise it. */
  clearLabel?: string;
  /** Accessible label of the chevron button. Localise it. */
  triggerLabel?: string;
  /** Marks the box invalid. */
  invalid?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { clearable: true, clearLabel: undefined, triggerLabel: undefined });
const ctx = inject(COMBOBOX_KEY);
if (!ctx) throw new Error("NqComboboxInput must be inside NqCombobox");
const t = useT();
</script>

<template>
  <ComboboxAnchor data-slot="combobox-input-group" :class="cn(boxClass, 'h-control ps-3 pe-1.5')">
    <ComboboxInput
      data-slot="combobox-input"
      :display-value="(v: unknown) => ctx.labelOf(v)"
      :disabled="ctx.disabled.value"
      :aria-invalid="props.invalid || undefined"
      :data-invalid="props.invalid ? '' : undefined"
      :class="cn(inputClass, props.class)"
      v-bind="$attrs"
      @input="ctx.search.value = ($event.target as HTMLInputElement).value"
    />
    <button
      v-if="props.clearable"
      type="button"
      data-slot="combobox-clear"
      :aria-label="props.clearLabel ?? t('Clear', 'مسح')"
      :data-hidden="ctx.hasValue.value ? undefined : ''"
      :disabled="ctx.disabled.value"
      :class="cn(iconButtonClass, 'data-[hidden]:hidden')"
      @click="ctx.clear()"
    >
      <X />
    </button>
    <ComboboxTrigger data-slot="combobox-trigger" :aria-label="props.triggerLabel ?? t('Open', 'فتح')" :class="iconButtonClass">
      <ChevronsUpDown />
    </ComboboxTrigger>
  </ComboboxAnchor>
</template>
