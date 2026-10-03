<script setup lang="ts">
import { computed, ref } from "vue";
import { useT } from "../../provider";
import { NqButton } from "../button";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import NqSidebarCustomizeSection from "./NqSidebarCustomizeSection.vue";
import type { SidebarCustomizeLabels, SidebarCustomizeSection as Section } from "./types";

// The accessible way to arrange the sidebar: drag handles that also work with the keyboard (focus a handle, then
// Up/Down moves one place and Home/End to either end) and a switch per item for show/hide.
interface Props {
  /** Dialog state: `v-model:open`. */
  open: boolean;
  /** One per list. "Reset to default" resets all and is disabled when all are default. */
  sections: Section[];
  labels?: SidebarCustomizeLabels;
}
const props = defineProps<Props>();
const emit = defineEmits<{ "update:open": [value: boolean] }>();

const tr = useT();
const t = computed(() => {
  const l = props.labels;
  return {
    title: l?.title ?? tr("Customize sidebar", "تخصيص الشريط الجانبي"),
    description: l?.description ?? tr("Drag to reorder. Switch items off to hide them.", "اسحب لإعادة الترتيب. أوقف العناصر لإخفائها."),
    reset: l?.reset ?? tr("Reset to default", "إعادة الضبط الافتراضي"),
    done: l?.done ?? tr("Done", "تم"),
    reorder: l?.reorder ?? ((label: string) => tr(`Reorder ${label}`, `إعادة ترتيب ${label}`)),
    moved:
      l?.moved ??
      ((label: string, position: number, total: number) => tr(`${label}, position ${position} of ${total}`, `${label}، الموضع ${position} من ${total}`)),
  };
});
const announcement = ref("");
const allDefault = computed(() => props.sections.every((s) => s.layout.isDefault));
</script>

<template>
  <NqDialog :open="props.open" @update:open="emit('update:open', $event)">
    <NqDialogContent :close-label="props.labels?.close" class="max-w-md gap-0 p-0">
      <NqDialogHeader class="border-b border-border px-5 py-4 pe-12">
        <NqDialogTitle>{{ t.title }}</NqDialogTitle>
        <NqDialogDescription>{{ t.description }}</NqDialogDescription>
      </NqDialogHeader>
      <div class="flex max-h-[60dvh] flex-col gap-4 overflow-y-auto px-3 py-3">
        <NqSidebarCustomizeSection
          v-for="section in props.sections"
          :key="section.id"
          :section="section"
          :reorder-label="t.reorder"
          @moved="(label, position, total) => (announcement = t.moved(label, position, total))"
        />
      </div>
      <div aria-live="polite" class="sr-only">{{ announcement }}</div>
      <NqDialogFooter class="border-t border-border px-5 py-3 sm:justify-between">
        <NqButton variant="ghost" size="sm" :disabled="allDefault" @click="props.sections.forEach((s) => s.layout.reset())">{{ t.reset }}</NqButton>
        <NqButton variant="primary" size="sm" @click="emit('update:open', false)">{{ t.done }}</NqButton>
      </NqDialogFooter>
    </NqDialogContent>
  </NqDialog>
</template>
