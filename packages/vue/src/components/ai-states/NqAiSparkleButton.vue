<script setup lang="ts">
import { Sparkles } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { NqKbd } from "../text";
import { aiStatesWords, type AiStatesLabels } from "./labels";
import { useAiShortcutKeys } from "./shortcut";

// The one entry point to an AI feature: a button with the sparkle. Takes every NqButton prop (variant, size, disabled, type).
const props = defineProps<{
  variant?: "primary" | "secondary" | "ghost" | "danger" | "link" | null;
  size?: "sm" | "md" | "lg" | "icon" | "icon-sm" | null;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  /** Work is running: the button shows the spinner and stays focusable. */
  generating?: boolean;
  /** Draws the Cmd/Ctrl+J hint after the label. */
  showShortcut?: boolean;
  labels?: Partial<AiStatesLabels>;
  class?: HTMLAttributes["class"];
}>();
const nq = useNasaq();
const t = computed(() => aiStatesWords(nq.locale.value, props.labels));
const keys = useAiShortcutKeys("Mod J");
</script>

<template>
  <NqButton
    data-slot="ai-sparkle-button"
    :variant="props.variant"
    :size="props.size"
    :disabled="props.disabled"
    :type="props.type"
    :loading="props.generating"
    :class="cn(props.class)"
  >
    <Sparkles v-if="!props.generating" aria-hidden="true" class="text-nq-accent-text" />
    <slot>{{ props.generating ? t.generating : t.ask }}</slot>
    <span v-if="props.showShortcut && !props.generating" aria-hidden="true" class="ms-1 hidden gap-0.5 sm:inline-flex">
      <NqKbd v-for="k in keys" :key="k">{{ k }}</NqKbd>
    </span>
  </NqButton>
</template>
