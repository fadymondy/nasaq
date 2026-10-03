<script setup lang="ts">
import { Smile } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { NqPopover, NqPopoverContent, NqPopoverTrigger, type PopupSide } from "../popover";
import type { EmojiData, EmojiSelection, EmojiSkinTone } from "./emoji-data";
import NqEmojiPickerPanel from "./NqEmojiPickerPanel.vue";

// <NqEmojiPicker @emoji-select="({ emoji }) => (text += emoji)" />
interface Props {
  locale?: string;
  skinTone?: EmojiSkinTone;
  columns?: number;
  resolveEmojiData?: (locale: string) => Promise<EmojiData>;
  labels?: Partial<{ search: string; loading: string; empty: (query: string) => string; skinTone: string }>;
  /** Close the popover after an emoji is chosen. Default true. */
  closeOnSelect?: boolean;
  open?: boolean;
  side?: PopupSide;
  align?: "start" | "center" | "end";
  /** Extra classes for the picker panel. */
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  locale: undefined,
  skinTone: "none",
  columns: 8,
  resolveEmojiData: undefined,
  labels: undefined,
  closeOnSelect: true,
  open: undefined,
  side: "bottom",
  align: "start",
});
const emit = defineEmits<{ emojiSelect: [emoji: EmojiSelection]; "update:open": [open: boolean] }>();

const nq = useNasaq();
const triggerLabel = computed(() => (nq.locale.value.startsWith("ar") ? "اختيار رمز تعبيري" : "Choose emoji"));
const innerOpen = ref(false);
const isOpen = computed(() => props.open ?? innerOpen.value);
function setOpen(next: boolean) {
  innerOpen.value = next;
  emit("update:open", next);
}
function onSelect(e: EmojiSelection) {
  emit("emojiSelect", e);
  if (props.closeOnSelect) setOpen(false);
}
</script>

<template>
  <NqPopover :open="isOpen" @update:open="setOpen">
    <NqPopoverTrigger as-child>
      <slot name="trigger">
        <NqButton variant="ghost" size="icon" :aria-label="triggerLabel"><Smile /></NqButton>
      </slot>
    </NqPopoverTrigger>
    <NqPopoverContent :side="props.side" :align="props.align" :dir="nq.isRtl.value ? 'rtl' : 'ltr'" class="w-auto overflow-hidden p-0">
      <NqEmojiPickerPanel
        :class="props.class"
        :locale="props.locale"
        :skin-tone="props.skinTone"
        :columns="props.columns"
        :resolve-emoji-data="props.resolveEmojiData"
        :labels="props.labels"
        @emoji-select="onSelect"
      />
    </NqPopoverContent>
  </NqPopover>
</template>
