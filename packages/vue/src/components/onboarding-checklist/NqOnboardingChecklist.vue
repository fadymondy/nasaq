<script lang="ts">
import type { Component } from "vue";

const STRINGS = {
  en: {
    title: "Get started",
    progress: "{done} of {total} done",
    dismiss: "Dismiss the checklist",
    allDone: "You are all set",
    allDoneHint: "Every step is done. Nice work.",
    done: "Done",
    next: "Next",
  },
  ar: {
    title: "ابدأ من هنا",
    progress: "أُنجز {done} من {total}",
    dismiss: "أخفِ القائمة",
    allDone: "كل شيء جاهز",
    allDoneHint: "أنجزت كل الخطوات. أحسنت.",
    done: "تم",
    next: "التالي",
  },
};

export type OnboardingChecklistLabels = (typeof STRINGS)["en"];

export interface OnboardingChecklistItem {
  id: string;
  title: string;
  description?: string;
  done?: boolean;
  /** The button on an open item: "Invite teammates". Omit for a plain item. */
  actionLabel?: string;
  onAction?: () => void | Promise<unknown>;
  /** A component (a lucide icon) shown in the circle of an open item. */
  icon?: Component;
}
</script>

<script setup lang="ts">
import { ArrowRight, CircleCheck, PartyPopper, X } from "lucide-vue-next";
import { computed, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useAuthLocale } from "../auth-layout";
import { NqButton } from "../button";
import { NqCard } from "../card";
import { checklistSummary } from "../onboarding-flow";
import { NqProgress } from "../progress";

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));

// The in-app "Get started" card: how far setup is (x of y), the open items each with one action, and a
// dismiss. The first open item is highlighted as the next thing to do. It only reports clicks: you own which items are done.
const props = defineProps<{
  items: readonly OnboardingChecklistItem[];
  title?: string;
  /** Called by the close button. Omit to hide it. Once everything is done the card offers dismiss regardless. */
  onDismiss?: () => void | Promise<unknown>;
  /** Called when the last item is done, once. */
  onComplete?: () => void;
  labels?: Partial<OnboardingChecklistLabels>;
  class?: HTMLAttributes["class"];
}>();

const locale = useAuthLocale();
const t = computed(() => ({ ...STRINGS[locale.value], ...props.labels }));
const summary = computed(() => checklistSummary(props.items));
const progressText = computed(() => fill(t.value.progress, { done: summary.value.done, total: summary.value.total }));
const pending = ref<string | null>(null);
let notified = false;
watch(
  () => summary.value.complete,
  (complete) => {
    if (complete && !notified) {
      notified = true;
      props.onComplete?.();
    }
    if (!complete) notified = false;
  },
  { immediate: true },
);

async function run(item: OnboardingChecklistItem) {
  pending.value = item.id;
  try {
    await item.onAction?.();
  } finally {
    pending.value = null;
  }
}
</script>

<template>
  <NqCard role="region" :aria-label="props.title ?? t.title" data-slot="onboarding-checklist" :data-complete="summary.complete || undefined" :class="cn('gap-3 p-4', props.class)">
    <header class="flex items-start gap-3">
      <div class="flex min-w-0 flex-1 flex-col gap-1.5">
        <h3 class="text-h3 text-foreground">{{ summary.complete ? t.allDone : (props.title ?? t.title) }}</h3>
        <p class="text-caption text-muted-foreground" data-slot="onboarding-checklist-count">{{ progressText }}</p>
      </div>
      <NqButton v-if="props.onDismiss" variant="ghost" size="icon" :aria-label="t.dismiss" @click="props.onDismiss()">
        <X aria-hidden="true" />
      </NqButton>
    </header>
    <NqProgress :value="summary.percent" :tone="summary.complete ? 'success' : 'default'" size="sm" :aria-label="progressText" />
    <div v-if="summary.complete" class="flex items-center gap-2 rounded-control bg-nq-success-soft px-3 py-2 text-body text-nq-success-text">
      <PartyPopper aria-hidden="true" class="size-4" />
      {{ t.allDoneHint }}
    </div>
    <ol v-else class="flex flex-col gap-1.5">
      <li
        v-for="(item, index) in props.items"
        :key="item.id"
        :data-done="item.done || undefined"
        :data-next="index === summary.nextIndex || undefined"
        :class="cn('flex items-center gap-3 rounded-control border px-3 py-2', index === summary.nextIndex ? 'border-primary bg-nq-selected' : 'border-border bg-card')"
      >
        <span
          aria-hidden="true"
          :class="cn('inline-flex size-5 shrink-0 items-center justify-center rounded-full border', item.done ? 'border-nq-success bg-nq-success text-primary-foreground' : 'border-nq-line-strong text-muted-foreground')"
        >
          <CircleCheck v-if="item.done" class="size-4" />
          <component :is="item.icon" v-else-if="item.icon" />
        </span>
        <span class="flex min-w-0 flex-1 flex-col text-start">
          <span :class="cn('truncate text-label', item.done ? 'text-muted-foreground line-through' : 'text-foreground')">
            {{ item.title }}
            <span class="sr-only">{{ item.done ? `, ${t.done}` : index === summary.nextIndex ? `, ${t.next}` : "" }}</span>
          </span>
          <span v-if="item.description && !item.done" class="truncate text-caption text-muted-foreground">{{ item.description }}</span>
        </span>
        <NqButton v-if="!item.done && item.actionLabel" :variant="index === summary.nextIndex ? 'primary' : 'secondary'" size="sm" :loading="pending === item.id" :disabled="pending !== null" @click="run(item)">
          {{ item.actionLabel }}
          <ArrowRight aria-hidden="true" class="rtl:-scale-x-100" />
        </NqButton>
      </li>
    </ol>
    <NqButton v-if="summary.complete && props.onDismiss" variant="secondary" size="sm" class="self-start" @click="props.onDismiss()">{{ t.dismiss }}</NqButton>
  </NqCard>
</template>
