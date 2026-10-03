<script setup lang="ts">
import { Sparkles } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useSidebarCollapsed } from "../app-shell";
import { NqButton } from "../button";
import { NqMeter } from "../progress";
import { NqTooltip } from "../tooltip";
import { useUpgradeStrings, type UpgradeLabels } from "./strings";

// The upgrade nudge for the sidebar footer. When the sidebar is collapsed it shrinks to a single icon button
// with a tooltip. Slots: `title`, `description`, `actionLabel`.
interface Props {
  title?: string;
  description?: string;
  /** A usage bar, so the reason to upgrade is visible: `{ value: 8, max: 10, label: "8 of 10 projects" }`. */
  usage?: { value: number; max: number; label?: string };
  /** The button label. Default "Upgrade". */
  actionLabel?: string;
  onUpgrade: () => void;
  labels?: UpgradeLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { title: undefined, description: undefined, usage: undefined, actionLabel: undefined, labels: undefined });
const { t } = useUpgradeStrings(() => props.labels);
const collapsed = useSidebarCollapsed();
const isCollapsed = computed(() => collapsed.value);
</script>

<template>
  <NqTooltip v-if="isCollapsed" side="inline-end">
    <NqButton data-slot="upgrade-card" variant="ghost" size="icon" :aria-label="props.actionLabel ?? t.upgrade" class="text-nq-brand" @click="props.onUpgrade">
      <Sparkles aria-hidden="true" />
    </NqButton>
    <template #content><slot name="title">{{ props.title }}</slot></template>
  </NqTooltip>
  <div v-else data-slot="upgrade-card" :class="cn('flex flex-col gap-3 rounded-card bg-[color-mix(in_oklab,var(--nq-brand)_10%,var(--nq-surface))] p-3 ring-1 ring-nq-brand/20', props.class)">
    <div class="flex items-start gap-2">
      <Sparkles aria-hidden="true" class="mt-0.5 size-4 shrink-0 text-nq-brand" />
      <div class="flex min-w-0 flex-col gap-0.5">
        <p class="text-label text-foreground"><slot name="title">{{ props.title }}</slot></p>
        <p v-if="props.description || $slots.description" class="text-caption text-muted-foreground"><slot name="description">{{ props.description }}</slot></p>
      </div>
    </div>
    <NqMeter v-if="props.usage" :value="props.usage.value" :max="props.usage.max" :label="props.usage.label" :show-value="props.usage.label === undefined" size="sm" />
    <NqButton variant="primary" size="sm" @click="props.onUpgrade"><slot name="actionLabel">{{ props.actionLabel ?? t.upgrade }}</slot></NqButton>
  </div>
</template>
