<script setup lang="ts">
import { Sparkles, X } from "lucide-vue-next";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { useUpgradeStrings, type UpgradeLabels } from "./strings";

// A strip across the top of a page: a trial ending, a limit near, an offer. One at a time. Slots: `icon`, `title`,
// `description`, `action` (usually a NqButton).
interface Props {
  /** "brand" for an offer or trial, "warning" when a limit is near or the trial is ending. */
  tone?: "brand" | "warning";
  title?: string;
  description?: string;
  /** Shows a dismiss button. Only for offers; never for a limit the person has actually hit. */
  onDismiss?: () => void;
  labels?: UpgradeLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { tone: "brand", title: undefined, description: undefined, onDismiss: undefined, labels: undefined });
const { t } = useUpgradeStrings(() => props.labels);
</script>

<template>
  <div
    data-slot="upgrade-banner"
    :data-tone="props.tone"
    role="region"
    :aria-label="props.title"
    :class="
      cn(
        '@container flex items-center gap-3 rounded-card px-4 py-3',
        props.tone === 'brand' ? 'bg-[color-mix(in_oklab,var(--nq-brand)_10%,var(--nq-surface))] ring-1 ring-nq-brand/25' : 'bg-nq-warning-soft ring-1 ring-nq-warning/30',
        props.class,
      )
    "
  >
    <span
      :class="
        cn(
          'grid size-8 shrink-0 place-items-center rounded-full [&_svg]:size-4',
          props.tone === 'brand' ? 'bg-primary text-primary-foreground' : 'bg-nq-surface text-nq-warning-text ring-1 ring-nq-warning/40',
        )
      "
    >
      <slot name="icon"><Sparkles aria-hidden="true" /></slot>
    </span>
    <div class="flex min-w-0 flex-1 flex-col gap-2 @xl:flex-row @xl:items-center @xl:gap-4">
      <div class="min-w-0 flex-1">
        <p :class="cn('text-label', props.tone === 'brand' ? 'text-foreground' : 'text-nq-warning-text')"><slot name="title">{{ props.title }}</slot></p>
        <p v-if="props.description || $slots.description" class="text-body-sm text-muted-foreground"><slot name="description">{{ props.description }}</slot></p>
      </div>
      <div v-if="$slots.action" class="shrink-0"><slot name="action" /></div>
    </div>
    <NqButton v-if="props.onDismiss" variant="ghost" size="icon" :aria-label="t.dismiss" class="size-7 shrink-0 self-start" @click="props.onDismiss">
      <X aria-hidden="true" />
    </NqButton>
  </div>
</template>
