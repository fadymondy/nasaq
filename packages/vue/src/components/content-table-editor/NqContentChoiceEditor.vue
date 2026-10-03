<script setup lang="ts">
import { Check } from "lucide-vue-next";
import { computed } from "vue";
import { NqBadge } from "../badge";
import { NqPopover, NqPopoverContent, NqPopoverTrigger } from "../popover";
import type { ContentCell, ContentColumn } from "./math";
import type { ContentTableText } from "./strings";

// The option list for select and tags cells, in a popover anchored to the cell content. Internal to the content table editor.
interface Props {
  column: ContentColumn;
  value: ContentCell | undefined;
  open: boolean;
  t: ContentTableText;
}
const props = defineProps<Props>();
const emit = defineEmits<{ "update:open": [open: boolean]; change: [next: string | string[] | null] }>();
const HUES = ["gray", "red", "orange", "amber", "green", "teal", "blue", "violet", "pink"];
const hueOf = (h?: string) => (HUES.includes(h ?? "") ? (h as "gray") : "gray");
const multi = computed(() => props.column.type === "tags");
const chosen = computed<unknown[]>(() => (multi.value ? (Array.isArray(props.value) ? props.value : []) : [props.value]));
const options = computed(() => props.column.options ?? []);
const hasValue = computed(() => !(props.value == null || props.value === "" || (Array.isArray(props.value) && props.value.length === 0)));

function pick(value: string) {
  if (multi.value) {
    const list = chosen.value as string[];
    emit("change", list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  } else {
    emit("change", value);
    emit("update:open", false);
  }
}
function clear() {
  emit("change", multi.value ? [] : null);
  emit("update:open", false);
}
</script>

<template>
  <NqPopover :open="props.open" @update:open="(o: boolean) => emit('update:open', o)">
    <NqPopoverTrigger as-child>
      <div class="flex min-h-6 w-full min-w-0 items-center outline-none"><slot /></div>
    </NqPopoverTrigger>
    <NqPopoverContent align="start" class="w-56 p-1">
      <p v-if="options.length === 0" class="px-2 py-1.5 text-caption text-muted-foreground">{{ props.t.noOptions }}</p>
      <ul v-else role="listbox" :aria-label="props.column.label" :aria-multiselectable="multi || undefined" class="flex max-h-60 flex-col overflow-y-auto">
        <li v-for="o in options" :key="o.value" role="presentation">
          <button
            type="button"
            role="option"
            :aria-selected="chosen.includes(o.value)"
            class="flex h-control-sm w-full items-center gap-2 rounded-[4px] px-2 text-start outline-none hover:bg-nq-hover focus-visible:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus"
            @vue:mounted="(v: { el: HTMLElement }) => chosen.includes(o.value) && v.el.focus()"
            @click="pick(o.value)"
          >
            <span class="flex size-4 shrink-0 items-center justify-center"><Check v-if="chosen.includes(o.value)" aria-hidden="true" class="size-4" /></span>
            <NqBadge variant="tag" :hue="hueOf(o.hue)">{{ o.label }}</NqBadge>
          </button>
        </li>
      </ul>
      <button
        v-if="hasValue"
        type="button"
        class="mt-1 flex h-control-sm w-full items-center rounded-[4px] border-t border-border px-2 text-caption text-muted-foreground outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus"
        @click="clear"
      >
        {{ props.t.clear }}
      </button>
    </NqPopoverContent>
  </NqPopover>
</template>
