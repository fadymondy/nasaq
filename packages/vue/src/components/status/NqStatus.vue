<script setup lang="ts">
import { Circle, CircleAlert, CircleCheck, CircleDot, CircleX } from "lucide-vue-next";
import { computed, useSlots, type Component, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

interface Props {
  /** Generic meaning, shared by every product. Products map their own states onto these five. */
  tone?: StatusTone;
  /** Product-specific glyph (e.g. a half-filled circle for "In progress"). Keep it distinct per state. */
  icon?: Component;
  /** Tint the label as well as the icon. Default false: the label stays body text, the icon carries tone. */
  tinted?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { tone: "neutral", tinted: false });

/** Each tone has its own shape, so status reads without colour (colour-blind users, brand-hue collisions). */
const toneIcon: Record<StatusTone, Component> = {
  neutral: Circle,
  info: CircleDot,
  success: CircleCheck,
  warning: CircleAlert,
  danger: CircleX,
};

const toneText: Record<StatusTone, string> = {
  neutral: "text-muted-foreground",
  info: "text-nq-info-text",
  success: "text-nq-success-text",
  warning: "text-nq-warning-text",
  danger: "text-nq-danger-text",
};

const slots = useSlots();
const Icon = computed(() => props.icon ?? toneIcon[props.tone]);
/** The label as a tooltip when it is plain text (it may truncate). */
function titleOf(): string | undefined {
  const nodes = slots.default?.() ?? [];
  return nodes.length === 1 && typeof nodes[0]!.children === "string" ? (nodes[0]!.children as string) : undefined;
}
</script>

<template>
  <span
    data-slot="status"
    :data-tone="props.tone"
    :class="cn('inline-flex min-w-0 items-center gap-1.5 text-body-sm', props.tinted ? toneText[props.tone] : 'text-foreground', props.class)"
  >
    <component :is="Icon" aria-hidden="true" :class="cn('size-3.5 shrink-0', toneText[props.tone])" />
    <span class="truncate" :title="titleOf()"><slot /></span>
  </span>
</template>
