<script setup lang="ts">
import { Lock } from "lucide-vue-next";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import NqPlanBadge from "./NqPlanBadge.vue";
import { useUpgradeStrings, type UpgradeLabels } from "./strings";

// Wraps a paid feature. Unlocked, it renders the default slot as it is. Locked, it shows a blurred preview of it
// (so people see what they would get) with an upgrade panel on top; the preview is inert and hidden from
// assistive technology. Slots: `title`, `description`, `plan`, `actionLabel`.
interface Props {
  /** When true the feature is shown blurred behind an upgrade panel and cannot be used. */
  locked: boolean;
  /** "Custom reports are on Pro". */
  title?: string;
  description?: string;
  /** The plan that unlocks it. Default "Pro". */
  plan?: string;
  /** The button label. Default "See plans". */
  actionLabel?: string;
  onUpgrade: () => void;
  labels?: UpgradeLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { title: undefined, description: undefined, plan: undefined, actionLabel: undefined, labels: undefined });
const { t } = useUpgradeStrings(() => props.labels);
defineOptions({ inheritAttrs: false });
</script>

<template>
  <slot v-if="!props.locked" />
  <div v-else data-slot="feature-gate" data-locked="" :class="cn('relative isolate overflow-hidden rounded-card', props.class)" v-bind="$attrs">
    <div aria-hidden="true" inert class="pointer-events-none select-none blur-[3px] saturate-50"><slot /></div>
    <div class="absolute inset-0 grid place-items-center bg-background/55 p-4">
      <div class="flex max-w-sm flex-col items-center gap-3 rounded-card bg-card p-5 text-center shadow-lg ring-1 ring-border">
        <span class="grid size-10 place-items-center rounded-full bg-secondary text-muted-foreground">
          <Lock aria-hidden="true" class="size-4" />
        </span>
        <NqPlanBadge><slot name="plan">{{ props.plan ?? t.pro }}</slot></NqPlanBadge>
        <p class="text-h4 text-foreground"><slot name="title">{{ props.title }}</slot></p>
        <p v-if="props.description || $slots.description" class="text-body-sm text-muted-foreground"><slot name="description">{{ props.description }}</slot></p>
        <NqButton variant="primary" @click="props.onUpgrade"><slot name="actionLabel">{{ props.actionLabel ?? t.seePlans }}</slot></NqButton>
      </div>
    </div>
  </div>
</template>
