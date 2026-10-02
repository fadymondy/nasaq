<script setup lang="ts">
import { computed, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqCodeBlock } from "../code-block";
import { NqInput } from "../field";
import { NqTabs, NqTabsList, NqTabsPanel, NqTabsTab } from "../tabs";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import NqFeedbackFloatingLauncher from "./NqFeedbackFloatingLauncher.vue";
import {
  FEEDBACK_POSITIONS,
  FEEDBACK_SHAPES,
  feedbackInstallSnippet,
  normalizePosition,
  type FeedbackLauncherConfig,
  type FeedbackLauncherPosition,
  type FeedbackLauncherShape,
} from "./feedback-reporter-utils";
import { feedbackStrings, type FeedbackReporterLabels } from "./strings";

// Chooses the launcher shape, position and text, shows it live in a preview frame, and prints the install code (React next to
// `@nasaq/feedback`, or the plain config as JSON). It is controlled with `v-model`. The public key is never written into the code:
// the sample reads it from an environment variable.
interface Props {
  modelValue: FeedbackLauncherConfig;
  labels?: FeedbackReporterLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { labels: undefined });
const emit = defineEmits<{ "update:modelValue": [value: FeedbackLauncherConfig] }>();

const nq = useNasaq();
const t = computed(() => feedbackStrings(nq.locale.value, props.labels));
const titleId = useId();
const textId = useId();
const shapeNames = computed<Record<FeedbackLauncherShape, string>>(() => ({ pill: t.value.shapePill, circle: t.value.shapeCircle, tab: t.value.shapeTab }));
const positionNames = computed<Record<FeedbackLauncherPosition, string>>(() => ({
  "bottom-end": t.value.posBottomEnd,
  "bottom-start": t.value.posBottomStart,
  "top-end": t.value.posTopEnd,
  "top-start": t.value.posTopStart,
  "edge-end": t.value.posEdgeEnd,
  "edge-start": t.value.posEdgeStart,
}));
const effective = computed(() => normalizePosition(props.modelValue.shape, props.modelValue.position));
const change = (patch: Partial<FeedbackLauncherConfig>) => emit("update:modelValue", { ...props.modelValue, ...patch });
</script>

<template>
  <section data-slot="feedback-configurator" :aria-labelledby="titleId" :class="cn('flex w-full max-w-3xl flex-col gap-4 rounded-card border border-border bg-card p-4', props.class)">
    <header class="flex flex-col gap-1">
      <h2 :id="titleId" class="text-h3">{{ t.configTitle }}</h2>
      <p class="text-body-sm text-muted-foreground">{{ t.configDescription }}</p>
    </header>
    <div class="grid gap-4 md:grid-cols-2">
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1.5">
          <span class="text-label">{{ t.shape }}</span>
          <NqToggleGroup :aria-label="t.shape" :model-value="[props.modelValue.shape]" @update:model-value="(v) => v[0] && change({ shape: v[0] as FeedbackLauncherShape })">
            <NqToggle v-for="s in FEEDBACK_SHAPES" :key="s" :value="s">{{ shapeNames[s] }}</NqToggle>
          </NqToggleGroup>
        </div>
        <div class="flex flex-col gap-1.5">
          <span class="text-label">{{ t.position }}</span>
          <NqToggleGroup :aria-label="t.position" :model-value="[effective]" class="flex-wrap" @update:model-value="(v) => v[0] && change({ position: v[0] as FeedbackLauncherPosition })">
            <NqToggle v-for="p in FEEDBACK_POSITIONS" :key="p" :value="p">{{ positionNames[p] }}</NqToggle>
          </NqToggleGroup>
        </div>
        <div class="flex flex-col gap-1.5">
          <label :for="textId" class="text-label">{{ t.text }}</label>
          <NqInput :id="textId" :model-value="props.modelValue.label" :maxlength="24" @update:model-value="(v) => change({ label: String(v ?? '') })" />
        </div>
      </div>
      <div class="flex flex-col gap-1.5">
        <span class="text-label">{{ t.preview }}</span>
        <div class="relative h-56 overflow-hidden rounded-control border border-dashed border-border bg-background hatch" data-slot="feedback-configurator-preview">
          <NqFeedbackFloatingLauncher :shape="props.modelValue.shape" :position="props.modelValue.position" :label="props.modelValue.label || undefined" placement="absolute" tabindex="-1" />
        </div>
      </div>
    </div>
    <div class="flex flex-col gap-1.5">
      <span class="text-label">{{ t.install }}</span>
      <NqTabs default-value="react">
        <NqTabsList>
          <NqTabsTab value="react">{{ t.react }}</NqTabsTab>
          <NqTabsTab value="json">{{ t.json }}</NqTabsTab>
        </NqTabsList>
        <NqTabsPanel value="react">
          <NqCodeBlock language="tsx" :label="t.codeLabel" :copy-label="t.copyCode" :code="feedbackInstallSnippet(props.modelValue, 'react')" pre-class-name="max-h-72" />
        </NqTabsPanel>
        <NqTabsPanel value="json">
          <NqCodeBlock language="json" :label="t.codeLabel" :copy-label="t.copyCode" :code="feedbackInstallSnippet(props.modelValue, 'json')" />
        </NqTabsPanel>
      </NqTabs>
    </div>
  </section>
</template>
