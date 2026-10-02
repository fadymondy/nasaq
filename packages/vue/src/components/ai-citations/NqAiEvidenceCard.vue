<script setup lang="ts">
import { ExternalLink, FileText, Quote } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqBadge } from "../badge";
import { copilotHostOf, copilotIsSafeUrl } from "../copilot-chat";
import { NqNum } from "../numeric";
import { NqProgress } from "../progress";
import { aiSplitHighlight } from "./ai-citations-logic";
import { aiCitationsWords, type AiCitationsLabels } from "./labels";
import type { AiCitationSource } from "./types";

// A source with the passage the answer used. The quote is plain text with matches marked, never HTML.
const props = defineProps<{
  source: AiCitationSource;
  /** 1-based number shown in the corner, matching the `[n]` in the text. */
  index?: number;
  /** Highlights the card, for example while its marker is hovered. */
  active?: boolean;
  /** Hide the relevance bar and the open link (used inside a popover). */
  compact?: boolean;
  labels?: Partial<AiCitationsLabels>;
  class?: HTMLAttributes["class"];
}>();
const nq = useNasaq();
const t = computed(() => aiCitationsWords(nq.locale.value, props.labels));
const quote = computed(() => props.source.quote ?? props.source.snippet);
const parts = computed(() => aiSplitHighlight(quote.value ?? "", props.source.highlight));
const safe = computed(() => copilotIsSafeUrl(props.source.url));
const host = computed(() => copilotHostOf(props.source.url));
const score = computed(() => (props.source.score === undefined ? undefined : Math.min(1, Math.max(0, props.source.score))));
</script>

<template>
  <div
    data-slot="ai-evidence-card"
    :data-active="props.active ? '' : undefined"
    :class="
      cn(
        'flex min-w-0 flex-col gap-2 rounded-control border border-border bg-card p-3 text-start transition-colors duration-150 ease-nq',
        props.active && 'border-nq-accent bg-nq-hover',
        props.class,
      )
    "
  >
    <div class="flex items-start gap-2">
      <span v-if="props.index !== undefined" class="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-secondary text-[11px] tabular-nums text-foreground">
        <NqNum :value="props.index" />
      </span>
      <FileText v-else aria-hidden="true" class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div class="flex min-w-0 flex-1 flex-col">
        <span dir="auto" class="text-body-sm font-medium text-foreground">{{ props.source.title }}</span>
        <span class="flex flex-wrap items-center gap-x-2 text-caption text-muted-foreground">
          <bdi v-if="host" dir="ltr">{{ host }}</bdi>
          <bdi v-if="props.source.locator" dir="ltr">{{ props.source.locator }}</bdi>
        </span>
      </div>
      <NqBadge v-if="props.source.kind" variant="outline">{{ props.source.kind }}</NqBadge>
    </div>
    <figure class="flex flex-col gap-1">
      <figcaption class="sr-only">{{ t.excerpt }}</figcaption>
      <blockquote v-if="quote" dir="auto" class="flex gap-2 border-s-2 border-nq-line-strong ps-3 text-body-sm text-nq-fg-body">
        <Quote aria-hidden="true" class="mt-0.5 size-3.5 shrink-0 text-muted-foreground rtl:-scale-x-100" />
        <span>
          <template v-for="(p, i) in parts" :key="i">
            <mark v-if="p.hit" class="rounded-[2px] bg-nq-accent/20 px-0.5 text-foreground">{{ p.text }}</mark>
            <span v-else>{{ p.text }}</span>
          </template>
        </span>
      </blockquote>
      <p v-else class="text-caption text-muted-foreground">{{ t.noExcerpt }}</p>
    </figure>
    <div v-if="!props.compact && (score !== undefined || safe)" class="flex flex-wrap items-center justify-between gap-2 text-caption text-muted-foreground">
      <span v-if="score !== undefined" class="flex items-center gap-2">
        {{ t.relevance }}
        <NqProgress :value="Math.round(score * 100)" size="sm" :aria-label="t.relevance" class="w-14" />
        <span class="text-foreground"><NqNum :value="score" :format="{ style: 'percent' }" /></span>
      </span>
      <span v-else />
      <a
        v-if="safe"
        :href="props.source.url"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-1 rounded-[2px] text-foreground underline decoration-nq-line-strong underline-offset-4 outline-none hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus"
      >
        {{ t.openSource }}
        <ExternalLink aria-hidden="true" class="size-3 rtl:-scale-x-100" />
      </a>
    </div>
  </div>
</template>
