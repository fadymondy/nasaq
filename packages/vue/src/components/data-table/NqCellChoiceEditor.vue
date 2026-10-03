<script setup lang="ts">
import { Check } from "lucide-vue-next";
import { NqBadge } from "../badge";
import { NqIcon } from "../icon";
import { NqPopover, NqPopoverContent, NqPopoverTrigger } from "../popover";
import type { DataTableEditOption } from "./use-data-table";

// The option list for a select cell, in a popover anchored to the cell content. Internal to the data table.
interface Props {
  label?: string;
  options?: DataTableEditOption[];
  value: string | number | boolean | null | undefined;
  noOptions: string;
  clearLabel: string;
  clearable?: boolean;
}
const props = withDefaults(defineProps<Props>(), { clearable: false, options: () => [], label: undefined });
const emit = defineEmits<{ change: [value: string | null]; close: [] }>();
const HUES = ["gray", "red", "orange", "amber", "green", "teal", "blue", "violet", "pink"];
const hueOf = (h?: string) => (HUES.includes(h ?? "") ? (h as "gray") : "gray");
const isEmpty = () => props.value == null || props.value === "";
function pick(value: string | null) {
  emit("change", value);
  emit("close");
}
</script>

<template>
  <NqPopover :open="true" @update:open="(o: boolean) => !o && emit('close')">
    <NqPopoverTrigger as-child>
      <div class="flex min-h-6 w-full min-w-0 items-center outline-none"><slot /></div>
    </NqPopoverTrigger>
    <NqPopoverContent align="start" class="w-56 p-1">
      <p v-if="props.options.length === 0" class="px-2 py-1.5 text-caption text-muted-foreground">{{ props.noOptions }}</p>
      <ul v-else role="listbox" :aria-label="props.label" class="flex max-h-60 flex-col overflow-y-auto">
        <li v-for="o in props.options" :key="o.value" role="presentation">
          <button
            type="button"
            role="option"
            :aria-selected="props.value === o.value"
            class="flex h-control-sm w-full items-center gap-2 rounded-[4px] px-2 text-start outline-none hover:bg-nq-hover focus-visible:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus"
            @vue:mounted="(v: { el: HTMLElement }) => props.value === o.value && v.el.focus()"
            @click="pick(o.value)"
          >
            <span class="flex size-4 shrink-0 items-center justify-center"><NqIcon v-if="props.value === o.value" :icon="Check" class="size-4" /></span>
            <NqBadge variant="tag" :hue="hueOf(o.hue)">{{ o.label }}</NqBadge>
          </button>
        </li>
      </ul>
      <button
        v-if="props.clearable && !isEmpty()"
        type="button"
        class="mt-1 flex h-control-sm w-full items-center rounded-[4px] border-t border-border px-2 text-caption text-muted-foreground outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus"
        @click="pick(null)"
      >
        {{ props.clearLabel }}
      </button>
    </NqPopoverContent>
  </NqPopover>
</template>
