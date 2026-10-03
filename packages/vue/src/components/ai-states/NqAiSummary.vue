<script setup lang="ts">
import { ChevronDown, RefreshCw, Sparkles } from "lucide-vue-next";
import { computed, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardFooter, NqCardHeader, NqCardTitle } from "../card";
import { NqCollapsible, NqCollapsiblePanel, NqCollapsibleTrigger } from "../collapsible";
import { NqCopilotSources, type CopilotSource } from "../copilot-chat";
import { NqCopyButton } from "../copy-button";
import { NqIcon } from "../icon";
import { NqMarkdown } from "../markdown";
import { summaryToText } from "./ai-states-logic";
import { aiStatesWords, type AiStatesLabels } from "./labels";
import NqAiConfidenceMeter from "./NqAiConfidenceMeter.vue";
import NqAiFeedback from "./NqAiFeedback.vue";
import NqAiGeneratedLabel from "./NqAiGeneratedLabel.vue";
import NqAiShimmer from "./NqAiShimmer.vue";
import NqAiStreamingText from "./NqAiStreamingText.vue";

// A finished AI summary: TL;DR first, key points, the long version behind a toggle, the sources it came from, how confident the
// model is, and the controls people expect (copy, thumbs, regenerate). Always labelled "AI generated".
const props = withDefaults(
  defineProps<{
    /** One or two sentences. */
    tldr: string;
    /** Key points, one short sentence each. */
    points?: readonly string[];
    /** The long version, as Markdown. Shown when expanded. */
    full?: string;
    sources?: readonly CopilotSource[];
    /** 0 to 1. Shows the confidence meter. */
    confidence?: number;
    /** Model name shown next to the AI generated label. */
    model?: string;
    /** Heading. Default "Summary". */
    title?: string;
    /** No result yet: shows the shimmer and the label. */
    loading?: boolean;
    /** The summary is still being written: streams the TL;DR with a caret. */
    streaming?: boolean;
    defaultExpanded?: boolean;
    feedback?: "up" | "down" | null;
    onFeedback?: (value: "up" | "down") => void;
    onCopy?: (text: string) => void;
    onRegenerate?: () => void;
    labels?: Partial<AiStatesLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { points: undefined, full: undefined, sources: undefined, confidence: undefined, model: undefined, title: undefined, defaultExpanded: false, feedback: undefined },
);
const nq = useNasaq();
const t = computed(() => aiStatesWords(nq.locale.value, props.labels));
const open = ref(props.defaultExpanded);
const headingId = useId();
const busy = computed(() => props.loading || props.streaming);
const copyValue = () => summaryToText({ tldr: props.tldr, points: props.points, full: props.full }, { includeFull: open.value });
</script>

<template>
  <NqCard role="region" data-slot="ai-summary" :aria-labelledby="headingId" :aria-busy="busy || undefined" :class="cn('min-w-0', props.class)">
    <NqCardHeader class="grid-cols-[1fr_auto]">
      <NqCardTitle as="h3" class="flex items-center gap-2">
        <Sparkles aria-hidden="true" class="size-4 text-nq-accent-text" />
        <span :id="headingId">{{ props.title ?? t.summary }}</span>
      </NqCardTitle>
      <NqAiGeneratedLabel :model="props.model" :labels="props.labels" />
    </NqCardHeader>
    <NqCardContent class="flex flex-col gap-4">
      <NqAiShimmer v-if="props.loading" :lines="4" :label="t.loading" />
      <template v-else>
        <div class="flex flex-col gap-1">
          <span class="text-eyebrow text-muted-foreground">{{ t.tldr }}</span>
          <NqAiStreamingText :text="props.tldr" :streaming="props.streaming" :reveal="props.streaming" :markdown="false" :labels="props.labels" class="[&_p]:text-body [&_p]:text-foreground" />
        </div>
        <div v-if="props.points?.length && !props.streaming" class="flex flex-col gap-1.5">
          <span class="text-eyebrow text-muted-foreground">{{ t.keyPoints }}</span>
          <ul class="flex flex-col gap-1.5">
            <li v-for="p in props.points" :key="p" class="flex items-start gap-2 text-body-sm text-nq-fg-body">
              <span aria-hidden="true" class="mt-2 size-1 shrink-0 rounded-full bg-nq-accent" />
              <span dir="auto" class="min-w-0 text-start">{{ p }}</span>
            </li>
          </ul>
        </div>
        <NqCollapsible v-if="props.full && !props.streaming" v-model:open="open">
          <NqCollapsibleTrigger class="inline-flex min-h-control-sm items-center gap-1.5 rounded-control text-label text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">
            {{ open ? t.hideFull : t.showFull }}
            <ChevronDown aria-hidden="true" :class="cn('size-4 transition-transform duration-150 ease-nq motion-reduce:transition-none', open && 'rotate-180')" />
          </NqCollapsibleTrigger>
          <NqCollapsiblePanel>
            <div class="border-t border-border pt-3">
              <NqMarkdown :source="props.full" />
            </div>
          </NqCollapsiblePanel>
        </NqCollapsible>
        <NqCopilotSources v-if="props.sources?.length && !props.streaming" :sources="props.sources" :labels="{ sources: t.sources }" />
      </template>
    </NqCardContent>
    <NqCardFooter v-if="!props.loading" class="flex-col items-stretch gap-3 border-t border-border pt-3">
      <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
        <NqAiConfidenceMeter v-if="props.confidence !== undefined" :value="props.confidence" :labels="props.labels" />
        <span class="ms-auto inline-flex items-center gap-0.5">
          <NqCopyButton :value="copyValue" :label="t.copy" :disabled="props.streaming" @copy="props.onCopy?.($event)" />
          <NqButton v-if="props.onRegenerate" variant="ghost" size="icon-sm" :aria-label="t.regenerate" :disabled="props.streaming" @click="props.onRegenerate?.()">
            <NqIcon :icon="RefreshCw" />
          </NqButton>
          <NqAiFeedback v-if="props.onFeedback" :value="props.feedback" :on-change="props.onFeedback" :labels="props.labels" />
        </span>
      </div>
      <p class="text-caption text-muted-foreground">{{ t.disclaimer }}</p>
    </NqCardFooter>
  </NqCard>
</template>
