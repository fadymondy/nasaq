<script setup lang="ts">
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { isApplePlatform } from "../commands/commands";
import { NqDialog, NqDialogContent } from "../dialog";
import NqQuickCaptureForm from "./NqQuickCaptureForm.vue";
import { captureShortcutKeys, parseCaptureShortcut, type CaptureValue } from "./quick-capture-logic";
import { STRINGS, type QuickCaptureLabels } from "./strings";
import type { QuickCaptureDestination, QuickCapturePage } from "./types";
import { useCaptureShortcut } from "./use-quick-capture";

/**
 * Get a thought or a page into the inbox in a couple of seconds. A global shortcut opens a small dialog with a focused
 * text box; Ctrl/Cmd+Enter saves, Escape closes. With `page` it becomes the web-clipper popup. Use `presentation="panel"`
 * to render only the form (a floating window, extension popup).
 */
interface Props {
  /** Controlled open state (v-model:open). Default uncontrolled, starting at `defaultOpen`. Ignored by `presentation="panel"`. */
  open?: boolean;
  defaultOpen?: boolean;
  /**
   * Save the capture. Return `{ error }` (or throw) to keep the text and show the message.
   * The dialog closes, or the panel clears, only after it resolves.
   */
  onCapture: (capture: CaptureValue) => void | { error?: string } | undefined | Promise<void | { error?: string } | undefined>;
  /** A dialog over the page, or the bare form for a popup, side panel or extension window. Default `dialog`. */
  presentation?: "dialog" | "panel";
  /** Global shortcut that toggles the dialog, like "Mod+Shift+K". Needs a modifier. Pass `null` for no shortcut. */
  shortcut?: string | null;
  /** Turn the shortcut off without unmounting. Default true. */
  shortcutEnabled?: boolean;
  /** The page being clipped (web clipper). Shows its title and link, and the capture becomes a `clip`. */
  page?: QuickCapturePage;
  /** Where captures go. Shows a picker when there is more than one. */
  destinations?: QuickCaptureDestination[];
  defaultDestinationId?: string;
  /** Tags offered as toggles under the text box. */
  suggestedTags?: string[];
  initialText?: string;
  placeholder?: string;
  /** Show the shortcut hints. Default true. */
  showHints?: boolean;
  labels?: QuickCaptureLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  open: undefined,
  defaultOpen: false,
  presentation: "dialog",
  shortcut: "Mod+Shift+K",
  shortcutEnabled: true,
  initialText: "",
  showHints: true,
});
const emit = defineEmits<{ "update:open": [value: boolean] }>();
defineOptions({ inheritAttrs: false });

const nasaq = useNasaq();
const ar = computed(() => nasaq.locale.value.startsWith("ar"));
const t = computed(() => ({ ...STRINGS[ar.value ? "ar" : "en"], ...props.labels }));

const inner = ref(props.defaultOpen);
const isOpen = computed(() => props.open ?? inner.value);
function setOpen(next: boolean) {
  if (props.open === undefined) inner.value = next;
  emit("update:open", next);
}

const dialog = computed(() => props.presentation === "dialog");
const spec = computed(() => parseCaptureShortcut(props.shortcut));
useCaptureShortcut(
  () => props.shortcut,
  () => setOpen(!isOpen.value),
  () => dialog.value && props.shortcutEnabled,
);
const hintKeys = computed(() => (props.showHints && spec.value && dialog.value ? captureShortcutKeys(spec.value, isApplePlatform()) : []));
</script>

<template>
  <div
    v-if="!dialog"
    v-bind="$attrs"
    data-slot="quick-capture"
    data-presentation="panel"
    :class="cn('flex min-w-0 flex-col gap-4 rounded-floating border border-border bg-popover p-4 text-popover-foreground', props.class)"
  >
    <NqQuickCaptureForm
      :t="t"
      :dialog="false"
      :on-capture="props.onCapture"
      :page="page"
      :destinations="destinations"
      :default-destination-id="defaultDestinationId"
      :suggested-tags="suggestedTags"
      :initial-text="initialText"
      :placeholder="placeholder"
      :hint-keys="hintKeys"
      :show-hints="showHints"
      @done="setOpen(false)"
      @close="setOpen(false)"
    />
  </div>
  <NqDialog v-else :open="isOpen" @update:open="setOpen">
    <NqDialogContent v-bind="$attrs" data-slot="quick-capture" data-presentation="dialog" :class="cn('max-w-xl', props.class)" show-close>
      <NqQuickCaptureForm
        :t="t"
        :dialog="true"
        :on-capture="props.onCapture"
        :page="page"
        :destinations="destinations"
        :default-destination-id="defaultDestinationId"
        :suggested-tags="suggestedTags"
        :initial-text="initialText"
        :placeholder="placeholder"
        :hint-keys="hintKeys"
        :show-hints="showHints"
        @done="setOpen(false)"
        @close="setOpen(false)"
      />
    </NqDialogContent>
  </NqDialog>
</template>
