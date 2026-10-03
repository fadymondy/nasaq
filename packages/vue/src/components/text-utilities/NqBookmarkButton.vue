<script setup lang="ts">
import { Bookmark } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { useStrings, type TextUtilitiesLabels } from "./strings";

// A save or bookmark toggle. It is optimistic, announces the change to screen readers, and reverts with a message on failure.
interface Props {
  /** Controlled saved state. Omit it to let the button keep its own. */
  saved?: boolean;
  defaultSaved?: boolean;
  /** Called with the wanted state. The button flips at once and goes back if this rejects or resolves with `{ error }`. */
  onSavedChange?: (saved: boolean) => Promise<void | { error?: string }> | void;
  /** Show the word next to the icon. Default false (icon only). */
  showLabel?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "link" | null;
  size?: "sm" | "md" | "lg" | "icon" | "icon-sm" | null;
  disabled?: boolean;
  labels?: TextUtilitiesLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  saved: undefined,
  defaultSaved: false,
  onSavedChange: undefined,
  showLabel: false,
  variant: "ghost",
  size: undefined,
  disabled: undefined,
  labels: undefined,
});
const emit = defineEmits<{ "update:saved": [saved: boolean] }>();
const { t } = useStrings(() => props.labels);
const own = ref(props.defaultSaved);
const optimistic = ref<boolean>();
const message = ref("");
const failed = ref(false);
let busy = false;
const saved = computed(() => optimistic.value ?? props.saved ?? own.value);

async function click() {
  if (busy) return;
  const next = !saved.value;
  busy = true;
  optimistic.value = next;
  failed.value = false;
  message.value = next ? t.value.savedAnnounce : t.value.removedAnnounce;
  try {
    const result = await props.onSavedChange?.(next);
    if (result && typeof result === "object" && result.error) throw new Error(result.error);
    own.value = next;
    emit("update:saved", next);
  } catch {
    failed.value = true;
    message.value = t.value.saveFailed;
  } finally {
    busy = false;
    optimistic.value = undefined;
  }
}
const text = computed(() => (saved.value ? t.value.saved : t.value.save));
</script>

<template>
  <NqButton
    data-slot="bookmark-button"
    :data-saved="saved || undefined"
    :aria-pressed="saved"
    :aria-label="props.showLabel ? undefined : text"
    :variant="props.variant"
    :size="props.size ?? (props.showLabel ? 'md' : 'icon')"
    :disabled="props.disabled"
    :class="cn(saved && 'text-primary', props.class)"
    @click="click"
  >
    <Bookmark aria-hidden="true" :class="cn(saved && 'fill-current')" />
    <template v-if="props.showLabel">{{ text }}</template>
  </NqButton>
  <span role="status" :class="failed ? 'text-caption text-nq-danger-text' : 'sr-only'">{{ message }}</span>
</template>
