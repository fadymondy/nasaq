<script setup lang="ts">
import { Sparkles, X } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAiConfidenceMeter, NqAiFeedback, NqAiShimmer, NqAiStreamingText } from "../ai-states";
import { NqAiSourceChips, type AiCitationSource } from "../ai-citations";
import { NqButton } from "../button";
import { NqCard, NqCardContent } from "../card";
import { NqMarkdown } from "../markdown";
import { NqNum, type FormatNumberOptions } from "../numeric";
import { askAiDeltaTone } from "./ask-ai-logic";
import { askAiWords, type AskAiLabels } from "./labels";

type InsightTone = "info" | "success" | "warning" | "danger" | "neutral";

export interface AiInsightAction {
  id: string;
  label: string;
  variant?: "primary" | "secondary" | "ghost";
}
export interface AiInsightMetric {
  label: string;
  value: number | string;
  format?: FormatNumberOptions;
  /** Change as a fraction: 0.124 is +12.4%. */
  delta?: number;
  /** Down is good, for costs and errors. */
  invert?: boolean;
}

const TONE_BORDER: Record<InsightTone, string> = {
  neutral: "border-s-nq-accent",
  info: "border-s-nq-info",
  success: "border-s-nq-success",
  warning: "border-s-nq-warning",
  danger: "border-s-nq-danger",
};
const TONE_TEXT: Record<InsightTone, string> = {
  neutral: "text-nq-accent-text",
  info: "text-nq-info-text",
  success: "text-nq-success-text",
  warning: "text-nq-warning-text",
  danger: "text-nq-danger-text",
};

// An insight the AI found, placed where it applies: a labelled card with the finding, a metric, the reasoning, the sources it used,
// how sure it is, and what to do next. Always marked as AI output. It holds no model logic.
const props = withDefaults(
  defineProps<{
    /** The finding in one line: "Signups dropped 18% on mobile". */
    title: string;
    /** Markdown with the detail: why it matters and what to do. */
    body?: string;
    /** Colours the edge and the small label. Default `neutral` (the AI accent). */
    tone?: InsightTone;
    metric?: AiInsightMetric;
    /** 0 to 1. */
    confidence?: number;
    sources?: readonly AiCitationSource[];
    model?: string;
    actions?: readonly AiInsightAction[];
    onAction?: (id: string) => void;
    /** Adds an "Ask AI about this" button that starts a follow-up. */
    onAsk?: () => void;
    /** Adds a dismiss button. */
    onDismiss?: () => void;
    feedback?: "up" | "down" | null;
    onFeedback?: (value: "up" | "down") => void;
    loading?: boolean;
    streaming?: boolean;
    /** `inline` drops the card chrome: a tinted strip. Default `card`. */
    variant?: "card" | "inline";
    labels?: Partial<AskAiLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  {
    body: undefined,
    tone: "neutral",
    metric: undefined,
    confidence: undefined,
    sources: undefined,
    model: undefined,
    actions: undefined,
    onAction: undefined,
    onAsk: undefined,
    onDismiss: undefined,
    feedback: undefined,
    onFeedback: undefined,
    loading: false,
    streaming: false,
    variant: "card",
    labels: undefined,
  },
);
const nq = useNasaq();
const t = computed(() => askAiWords(nq.locale.value, props.labels));
const dTone = computed(() => (props.metric?.delta === undefined ? "neutral" : askAiDeltaTone(props.metric.delta, props.metric.invert)));
const hasActions = computed(() => Boolean(props.actions?.length || props.onAsk || props.onFeedback));
</script>

<template>
  <component
    :is="props.variant === 'inline' ? 'section' : NqCard"
    data-slot="ai-insight-card"
    :data-variant="props.variant"
    :data-tone="props.tone"
    :aria-busy="props.loading || props.streaming || undefined"
    :class="
      props.variant === 'inline'
        ? cn('flex min-w-0 flex-col gap-2 rounded-control border-s-4 bg-secondary p-3', TONE_BORDER[props.tone], props.class)
        : cn('min-w-0 border-s-4', TONE_BORDER[props.tone], props.class)
    "
  >
    <component :is="props.variant === 'inline' ? 'div' : NqCardContent" :class="props.variant === 'inline' ? 'contents' : 'flex flex-col gap-3'">
      <div class="flex items-start gap-2">
        <Sparkles aria-hidden="true" :class="cn('mt-0.5 size-4 shrink-0', TONE_TEXT[props.tone])" />
        <div class="flex min-w-0 flex-1 flex-col gap-0.5">
          <span :class="cn('text-caption font-medium', TONE_TEXT[props.tone])">
            {{ t.insight }}<span aria-hidden="true"> · </span>{{ t.tone[props.tone] }}
          </span>
          <div dir="auto" class="text-body-sm font-semibold text-foreground">{{ props.title }}</div>
        </div>
        <bdi v-if="props.model" dir="ltr" class="hidden shrink-0 text-caption text-muted-foreground sm:inline">{{ props.model }}</bdi>
        <NqButton v-if="props.onDismiss" variant="ghost" size="icon-sm" :aria-label="t.dismiss" class="-my-1 -me-1" @click="props.onDismiss?.()"><X aria-hidden="true" /></NqButton>
      </div>
      <NqAiShimmer v-if="props.loading" :lines="2" :label="t.loading" />
      <template v-else>
        <div v-if="props.metric" class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span class="text-caption text-muted-foreground">{{ props.metric.label }}</span>
          <span class="text-h3 tabular-nums text-foreground">
            <NqNum v-if="typeof props.metric.value === 'number'" :value="props.metric.value" :format="props.metric.format" />
            <template v-else>{{ props.metric.value }}</template>
          </span>
          <span
            v-if="props.metric.delta !== undefined"
            :class="cn('text-caption tabular-nums', dTone === 'positive' && 'text-nq-success-text', dTone === 'negative' && 'text-nq-danger-text', dTone === 'neutral' && 'text-muted-foreground')"
          >
            <NqNum :value="props.metric.delta" :format="{ style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero' }" />
          </span>
        </div>
        <template v-if="props.body">
          <NqAiStreamingText v-if="props.streaming" :text="props.body" streaming />
          <NqMarkdown v-else :source="props.body" class="text-body-sm" />
        </template>
        <NqAiConfidenceMeter v-if="props.confidence !== undefined" :value="props.confidence" />
        <NqAiSourceChips v-if="props.sources && props.sources.length > 0" :sources="props.sources" :label="t.sources" />
      </template>
      <div v-if="!props.loading && hasActions" class="flex flex-wrap items-center gap-2">
        <NqButton v-for="a in props.actions" :key="a.id" size="sm" :variant="a.variant ?? 'secondary'" @click="props.onAction?.(a.id)">{{ a.label }}</NqButton>
        <NqButton v-if="props.onAsk" size="sm" variant="ghost" @click="props.onAsk?.()">
          <Sparkles aria-hidden="true" class="text-nq-accent-text" />
          {{ t.askMore }}
        </NqButton>
        <span class="flex-1" />
        <NqAiFeedback v-if="props.onFeedback" :value="props.feedback" :on-change="props.onFeedback" :labels="{ good: t.good, bad: t.bad }" />
      </div>
    </component>
  </component>
</template>
