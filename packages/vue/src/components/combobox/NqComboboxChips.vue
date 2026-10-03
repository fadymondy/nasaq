<script setup lang="ts">
import { X } from "lucide-vue-next";
import { ComboboxAnchor, ComboboxInput } from "reka-ui";
import { computed, inject, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useT } from "../../provider";
import { boxClass, inputClass } from "./classes";
import { COMBOBOX_KEY } from "./context";

// Multi-select control: selected items as chips followed by the typeahead input. Use inside `<NqCombobox multiple>`.
// Backspace on an empty input removes the last chip. Use the `#chip="{ item }"` slot to change a chip's content.
interface Props {
  placeholder?: string;
  /** Accessible label of each chip's remove button. Localise it. */
  removeLabel?: string;
  /** Attributes for the inline input (id, aria-label, name …). */
  inputProps?: Record<string, unknown>;
  invalid?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { placeholder: undefined, removeLabel: undefined, inputProps: undefined });
const ctx = inject(COMBOBOX_KEY);
if (!ctx) throw new Error("NqComboboxChips must be inside NqCombobox");
const t = useT();
const selected = computed(() => (Array.isArray(ctx.current.value) ? (ctx.current.value as unknown[]) : []));

function onKeydown(e: KeyboardEvent) {
  const el = e.target as HTMLInputElement;
  if (e.key === "Backspace" && el.value === "" && selected.value.length) {
    ctx!.remove(selected.value[selected.value.length - 1]);
  }
}
</script>

<template>
  <ComboboxAnchor data-slot="combobox-chips" :class="cn(boxClass, 'flex-wrap px-1.5 py-1', props.class)">
    <span
      v-for="(item, i) in selected"
      :key="i"
      data-slot="combobox-chip"
      class="inline-flex h-6 max-w-full items-center gap-1 rounded-[4px] border border-border bg-secondary ps-2 pe-0.5 text-body-sm text-foreground outline-none data-highlighted:border-nq-focus"
    >
      <span class="min-w-0 truncate"><slot name="chip" :item="item">{{ ctx.labelOf(item) }}</slot></span>
      <button
        type="button"
        data-slot="combobox-chip-remove"
        :aria-label="props.removeLabel ?? t('Remove', 'إزالة')"
        :disabled="ctx.disabled.value"
        class="flex size-5 shrink-0 cursor-default items-center justify-center rounded-[4px] text-muted-foreground outline-none hover:text-foreground [&_svg]:size-3"
        @click.stop="ctx.remove(item)"
      >
        <X />
      </button>
    </span>
    <ComboboxInput
      data-slot="combobox-input"
      :placeholder="selected.length ? undefined : props.placeholder"
      :disabled="ctx.disabled.value"
      :aria-invalid="props.invalid || undefined"
      :data-invalid="props.invalid ? '' : undefined"
      :class="cn(inputClass, 'h-6 min-w-16 ps-1.5')"
      v-bind="props.inputProps"
      @input="ctx.search.value = ($event.target as HTMLInputElement).value"
      @keydown="onKeydown"
    />
  </ComboboxAnchor>
</template>
