<script setup lang="ts">
import { Check, Copy } from "lucide-vue-next";
import { computed, onBeforeUnmount, ref, useSlots, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useT } from "../../provider";
import { NqButton } from "../button";
import { copyText } from "./copy-text";

// An icon button that copies text and shows a check for about 1.5 seconds. The result is also announced
// through a polite live region. Visible text goes in the default slot; omit it for an icon-only button.
defineOptions({ inheritAttrs: false });
interface Props {
  /** The text to copy, or a function that returns it at click time. */
  value: string | (() => string);
  /** Accessible name. Default "Copy" / "نسخ" by the Nasaq locale. */
  label?: string;
  /** Announced to screen readers after a copy. */
  copiedLabel?: string;
  /** Announced when copying failed. */
  failedLabel?: string;
  /** How long the check state stays, in milliseconds. Default 1500. */
  resetAfter?: number;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "link" | null;
  size?: "sm" | "md" | "lg" | "icon" | "icon-sm" | null;
  disabled?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { resetAfter: 1500, variant: "ghost" });
const emit = defineEmits<{ copy: [text: string]; copyError: [] }>();
const slots = useSlots();
const t = useT();
const state = ref<"idle" | "copied" | "failed">("idle");
let timer: ReturnType<typeof setTimeout> | undefined;
onBeforeUnmount(() => clearTimeout(timer));

async function copy() {
  const text = typeof props.value === "function" ? props.value() : props.value;
  const ok = await copyText(text);
  clearTimeout(timer);
  state.value = ok ? "copied" : "failed";
  timer = setTimeout(() => (state.value = "idle"), props.resetAfter);
  if (ok) emit("copy", text);
  else emit("copyError");
}

const iconOnly = computed(() => !slots.default);
const name = computed(() => props.label ?? t("Copy", "نسخ"));
const status = computed(() =>
  state.value === "copied"
    ? (props.copiedLabel ?? t("Copied to clipboard", "تم النسخ إلى الحافظة"))
    : state.value === "failed"
      ? (props.failedLabel ?? t("Could not copy", "تعذر النسخ"))
      : "",
);
</script>

<template>
  <NqButton
    v-bind="$attrs"
    type="button"
    data-slot="copy-button"
    :data-copied="state === 'copied' ? '' : undefined"
    :variant="props.variant"
    :size="props.size ?? (iconOnly ? 'icon-sm' : 'sm')"
    :disabled="props.disabled"
    :aria-label="iconOnly ? name : undefined"
    :class="cn('data-copied:text-nq-success-text', props.class)"
    @click="copy"
  >
    <Check v-if="state === 'copied'" aria-hidden="true" />
    <Copy v-else aria-hidden="true" />
    <slot v-if="!iconOnly" />
  </NqButton>
  <span data-slot="copy-button-status" role="status" aria-live="polite" class="sr-only">{{ status }}</span>
</template>
