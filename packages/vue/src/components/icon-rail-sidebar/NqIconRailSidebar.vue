<script setup lang="ts">
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-vue-next";
import { computed, ref, useId, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { NqIcon } from "../icon";
import { NqSheet, NqSheetBody, NqSheetContent, NqSheetTitle } from "../sheet";
import { NqTooltip } from "../tooltip";
import NqIconRailColumn from "./NqIconRailColumn.vue";
import NqIconRailSub from "./NqIconRailSub.vue";
import { ICON_RAIL_STRINGS, type IconRailSidebarLabels, type RailLink, type RailSection } from "./types";

// Two-level navigation. A slim rail of icons picks the section; a sub-sidebar beside it lists that section's pages, in
// groups, with expandable parents. On narrow screens both fold into a sheet behind a menu button. The page is the default slot.
// Slots: brand, rail-footer (bottom of the rail), sub-header, sub-footer, default.
interface Props {
  sections: readonly RailSection[];
  /** v-model: the active section id. */
  modelValue?: string;
  defaultValue?: string;
  /** The active page id inside the section. */
  activeItem?: string;
  /** v-model:sub-open. Whether the sub-sidebar is shown on wide screens. */
  subOpen?: boolean;
  defaultSubOpen?: boolean;
  labels?: IconRailSidebarLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  defaultValue: undefined,
  activeItem: undefined,
  subOpen: undefined,
  defaultSubOpen: true,
  labels: undefined,
});
// itemSelect: a page (or a section without a sub-sidebar) was chosen.
const emit = defineEmits<{ "update:modelValue": [id: string]; "update:subOpen": [open: boolean]; itemSelect: [id: string, sectionId: string] }>();

const nq = useNasaq();
const t = computed(() => ({ ...ICON_RAIL_STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
const innerValue = ref(props.defaultValue ?? props.sections[0]?.id ?? "");
const innerSub = ref(props.defaultSubOpen);
const menuOpen = ref(false);

// A page chosen from outside (a route change) moves the rail to the section that owns it.
watch(
  () => [props.activeItem, props.modelValue] as const,
  ([activeItem, value]) => {
    if (value !== undefined || !activeItem) return;
    const owns = (links: readonly RailLink[]): boolean => links.some((l) => l.id === activeItem || (l.children ? owns(l.children) : false));
    const owner = props.sections.find((s) => s.groups?.some((g) => owns(g.items)));
    if (owner) innerValue.value = owner.id;
  },
  { immediate: true },
);

const sectionId = computed(() => props.modelValue ?? innerValue.value);
const section = computed(() => props.sections.find((s) => s.id === sectionId.value) ?? props.sections[0]);
const hasSub = computed(() => Boolean(section.value?.groups?.length));
const showSub = computed(() => props.subOpen ?? innerSub.value);
function setSub(next: boolean) {
  if (props.subOpen === undefined) innerSub.value = next;
  emit("update:subOpen", next);
}
const subId = useId();

function pickSection(next: RailSection, event: MouseEvent, fromSheet: boolean) {
  if (!next.href) event.preventDefault();
  if (next.id === section.value?.id && next.groups?.length && !fromSheet) {
    setSub(!showSub.value);
    return;
  }
  if (props.modelValue === undefined) innerValue.value = next.id;
  emit("update:modelValue", next.id);
  if (next.groups?.length) {
    if (!fromSheet) setSub(true);
  } else {
    emit("itemSelect", next.id, next.id);
    if (fromSheet) menuOpen.value = false;
  }
}
function pickItem(link: RailLink, event: MouseEvent, fromSheet: boolean) {
  if (!link.href) event.preventDefault();
  emit("itemSelect", link.id, section.value?.id ?? "");
  if (fromSheet) menuOpen.value = false;
}
</script>

<template>
  <div data-slot="icon-rail-sidebar" :class="cn('flex h-full min-h-0 w-full bg-background text-foreground', props.class)">
    <div class="hidden shrink-0 md:flex">
      <NqIconRailColumn :sections="props.sections" :active-id="section?.id" :label="t.rail" :sub-id="subId" :sub-open="showSub" @pick="(s, e) => pickSection(s, e, false)">
        <template v-if="$slots.brand" #brand><slot name="brand" /></template>
        <template v-if="$slots['rail-footer']" #footer><slot name="rail-footer" /></template>
      </NqIconRailColumn>
      <NqIconRailSub v-if="showSub && section && hasSub" :id="subId" :section="section" :label="t.sub" :active-item="props.activeItem" @pick="(l, e) => pickItem(l, e, false)">
        <template #action>
          <NqTooltip :content="t.hide">
            <NqButton variant="ghost" size="icon-sm" :aria-label="t.hide" class="text-muted-foreground" @click="setSub(false)">
              <NqIcon :icon="PanelLeftClose" directional />
            </NqButton>
          </NqTooltip>
        </template>
        <template v-if="$slots['sub-header']" #header><slot name="sub-header" /></template>
        <template v-if="$slots['sub-footer']" #footer><slot name="sub-footer" /></template>
      </NqIconRailSub>
    </div>
    <div class="flex min-w-0 flex-1 flex-col">
      <div data-slot="icon-rail-mobile-bar" class="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3 md:hidden">
        <NqButton variant="ghost" size="icon-sm" :aria-label="t.menu" @click="menuOpen = true"><Menu /></NqButton>
        <span class="min-w-0 flex-1 truncate text-label">{{ section?.title ?? section?.label }}</span>
      </div>
      <div v-if="hasSub && !showSub" class="hidden px-3 pt-3 md:block">
        <NqTooltip :content="t.show">
          <NqButton variant="ghost" size="icon-sm" :aria-label="t.show" :aria-controls="subId" :aria-expanded="false" class="text-muted-foreground" @click="setSub(true)">
            <NqIcon :icon="PanelLeftOpen" directional />
          </NqButton>
        </NqTooltip>
      </div>
      <div data-slot="icon-rail-content" class="min-h-0 flex-1 overflow-y-auto"><slot /></div>
    </div>
    <NqSheet v-model:open="menuOpen">
      <NqSheetContent side="start" :show-close="false" class="w-[min(20rem,90vw)] p-0">
        <NqSheetTitle class="sr-only">{{ t.menuTitle }}</NqSheetTitle>
        <NqSheetBody class="flex h-full min-h-0 p-0">
          <NqIconRailColumn :sections="props.sections" :active-id="section?.id" :label="t.rail" :sub-id="subId" :sub-open="false" @pick="(s, e) => pickSection(s, e, true)">
            <template v-if="$slots.brand" #brand><slot name="brand" /></template>
            <template v-if="$slots['rail-footer']" #footer><slot name="rail-footer" /></template>
          </NqIconRailColumn>
          <NqIconRailSub v-if="section && hasSub" :section="section" :label="t.sub" :active-item="props.activeItem" @pick="(l, e) => pickItem(l, e, true)">
            <template v-if="$slots['sub-header']" #header><slot name="sub-header" /></template>
            <template v-if="$slots['sub-footer']" #footer><slot name="sub-footer" /></template>
          </NqIconRailSub>
        </NqSheetBody>
      </NqSheetContent>
    </NqSheet>
  </div>
</template>
