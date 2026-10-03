<script setup lang="ts">
import { Shapes } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { NqPopover, NqPopoverContent, NqPopoverTrigger, type PopupSide } from "../popover";
import { ICON_CATALOG, type IconEntry } from "./icon-catalog";
import { findIcon, PAGE, RECENT_KEY, STRINGS, type IconPickerLabels } from "./icon-picker";
import NqIconPickerPanel from "./NqIconPickerPanel.vue";

// <NqIconPicker v-model="icon" />  (a popover; choosing an icon emits its kebab-case name and closes it)
interface Props {
  modelValue?: string | null;
  defaultValue?: string | null;
  icons?: readonly IconEntry[];
  recent?: string[];
  recentKey?: string | null;
  columns?: number;
  pageSize?: number;
  labels?: Partial<Omit<IconPickerLabels, "categories">> & { categories?: Record<string, string> };
  /** Close the popover after choosing. Default true. */
  closeOnSelect?: boolean;
  open?: boolean;
  side?: PopupSide;
  align?: "start" | "center" | "end";
  disabled?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  defaultValue: null,
  icons: () => ICON_CATALOG,
  recent: undefined,
  recentKey: RECENT_KEY,
  columns: 8,
  pageSize: PAGE,
  closeOnSelect: true,
  open: undefined,
  side: "bottom",
  align: "start",
});
const emit = defineEmits<{
  "update:modelValue": [name: string];
  select: [name: string, entry: IconEntry];
  "update:open": [open: boolean];
  "update:recent": [recent: string[]];
}>();

const nq = useNasaq();
const t = computed(() => ({ ...STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
const innerOpen = ref(false);
const innerValue = ref<string | null>(props.defaultValue);
const isOpen = computed(() => props.open ?? innerOpen.value);
const value = computed(() => (props.modelValue === undefined ? innerValue.value : props.modelValue));
const current = computed(() => findIcon(value.value, props.icons));
const Glyph = computed(() => current.value?.icon ?? Shapes);

function setOpen(next: boolean) {
  innerOpen.value = next;
  emit("update:open", next);
}
function onSelect(name: string, entry: IconEntry) {
  innerValue.value = name;
  emit("update:modelValue", name);
  emit("select", name, entry);
  if (props.closeOnSelect) setOpen(false);
}
</script>

<template>
  <NqPopover :open="isOpen" @update:open="setOpen">
    <NqPopoverTrigger as-child>
      <slot name="trigger">
        <NqButton
          variant="secondary"
          size="icon"
          :disabled="props.disabled"
          :aria-label="current ? t.chosen(current.name) : t.trigger"
          :title="current?.name ?? t.trigger"
          :class="props.class"
        >
          <component :is="Glyph" aria-hidden="true" :class="cn(!current && 'text-muted-foreground')" />
        </NqButton>
      </slot>
    </NqPopoverTrigger>
    <NqPopoverContent :side="props.side" :align="props.align" :dir="nq.isRtl.value ? 'rtl' : 'ltr'" class="w-auto overflow-hidden p-0">
      <NqIconPickerPanel
        :model-value="value"
        :icons="props.icons"
        :recent="props.recent"
        :recent-key="props.recentKey"
        :columns="props.columns"
        :page-size="props.pageSize"
        :labels="props.labels"
        auto-focus
        @select="onSelect"
        @update:recent="emit('update:recent', $event)"
      />
    </NqPopoverContent>
  </NqPopover>
</template>
