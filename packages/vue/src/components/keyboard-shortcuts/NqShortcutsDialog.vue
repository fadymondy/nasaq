<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useNasaq } from "../../provider";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogHeader, NqDialogTitle } from "../dialog";
import { hotkeyMatches, hotkeyParse } from "./hotkey-logic";
import { isApplePlatform, STRINGS, type KeyboardShortcutsLabels, type ShortcutGroup, type ShortcutPlatform } from "./keyboard-shortcuts";
import NqShortcutsReference from "./NqShortcutsReference.vue";

// The reference in a dialog, opened with "?" from anywhere (outside text fields).
interface Props {
  groups: readonly ShortcutGroup[];
  /** Controlled open state (`v-model:open`). */
  open?: boolean;
  defaultOpen?: boolean;
  /** Key that opens the dialog from anywhere outside a text field. Default "?". `null` turns it off. */
  hotkey?: string | null;
  platform?: ShortcutPlatform;
  showPlatformSwitch?: boolean;
  searchable?: boolean;
  description?: string;
  locale?: string;
  labels?: KeyboardShortcutsLabels;
}
const props = withDefaults(defineProps<Props>(), {
  open: undefined,
  defaultOpen: false,
  hotkey: "?",
  platform: undefined,
  showPlatformSwitch: true,
  searchable: true,
  description: undefined,
  locale: undefined,
  labels: undefined,
});
const emit = defineEmits<{ "update:open": [open: boolean]; "update:platform": [platform: ShortcutPlatform] }>();

const nq = useNasaq();
const locale = computed(() => props.locale ?? nq.locale.value);
const t = computed(() => ({ ...STRINGS[locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
const own = ref(props.defaultOpen);
const isOpen = computed(() => props.open ?? own.value);
function setOpen(next: boolean) {
  if (props.open === undefined) own.value = next;
  emit("update:open", next);
}

function onKeyDown(event: KeyboardEvent) {
  const step = props.hotkey ? hotkeyParse(props.hotkey)?.[0] : undefined;
  if (!step) return;
  const target = event.target;
  if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
  if (event.defaultPrevented || event.isComposing || !hotkeyMatches(step, event, isApplePlatform())) return;
  event.preventDefault();
  setOpen(!isOpen.value);
}
onMounted(() => window.addEventListener("keydown", onKeyDown));
onBeforeUnmount(() => window.removeEventListener("keydown", onKeyDown));
</script>

<template>
  <NqDialog :open="isOpen" @update:open="setOpen">
    <NqDialogContent data-slot="shortcuts-dialog" :close-label="t.close" class="max-h-[85dvh] w-[min(56rem,calc(100vw-2rem))] max-w-none overflow-y-auto">
      <NqDialogHeader>
        <NqDialogTitle class="text-title">{{ t.title }}</NqDialogTitle>
        <NqDialogDescription>{{ t.description }}</NqDialogDescription>
      </NqDialogHeader>
      <NqShortcutsReference
        :groups="props.groups"
        :platform="props.platform"
        :show-platform-switch="props.showPlatformSwitch"
        :searchable="props.searchable"
        :description="props.description"
        :title="null"
        :locale="locale"
        :labels="props.labels"
        @update:platform="emit('update:platform', $event)"
      />
    </NqDialogContent>
  </NqDialog>
</template>
