<script setup lang="ts">
import { ChevronDown } from "lucide-vue-next";
import { computed, nextTick, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAiFeedback, NqAiGeneratedLabel } from "../ai-states";
import { NqCollapsible, NqCollapsiblePanel, NqCollapsibleTrigger } from "../collapsible";
import { aiCitationCoverage, aiCitedNumbers } from "./ai-citations-logic";
import { aiCitationsWords, type AiCitationsLabels } from "./labels";
import NqAiCitedText from "./NqAiCitedText.vue";
import NqAiEvidenceCard from "./NqAiEvidenceCard.vue";
import NqAiProvenance from "./NqAiProvenance.vue";
import NqAiSourceChips from "./NqAiSourceChips.vue";
import type { AiCitationSource, AiProvenanceInfo } from "./types";

// The whole answer: AI generated label, text with `[n]` markers, source chips, an evidence panel with the quotes, a note when paragraphs
// have no source, provenance, and thumbs. Marker, chip and card light up together.
const props = withDefaults(
  defineProps<{
    text: string;
    sources: readonly AiCitationSource[];
    provenance?: AiProvenanceInfo;
    /** Name after the "AI generated" label. Defaults to `provenance.model`. */
    model?: string;
    /** Show the evidence cards under the chips, open. Default closed. */
    defaultEvidenceOpen?: boolean;
    feedback?: "up" | "down" | null;
    onFeedback?: (value: "up" | "down") => void;
    /** Called when a chip is pressed, after the evidence opens. */
    onSourceOpen?: (source: AiCitationSource) => void;
    labels?: Partial<AiCitationsLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { provenance: undefined, model: undefined, defaultEvidenceOpen: false, feedback: undefined, onFeedback: undefined, onSourceOpen: undefined, labels: undefined },
);
const nq = useNasaq();
const t = computed(() => aiCitationsWords(nq.locale.value, props.labels));
const uid = useId();
const active = ref<string | null>(null);
const open = ref(props.defaultEvidenceOpen);
const setActive = (id: string | null) => (active.value = id);
const cited = computed(() => aiCitedNumbers(props.text, props.sources.length));
const citedIds = computed(() => cited.value.map((n) => props.sources[n - 1]!.id));
const coverage = computed(() => aiCitationCoverage(props.text, props.sources.length));
const partly = computed(() => props.sources.length > 0 && coverage.value.total > 0 && coverage.value.cited < coverage.value.total);
const evidence = computed(() => props.sources.filter((s) => s.quote || s.snippet));
async function openSource(s: AiCitationSource) {
  open.value = true;
  active.value = s.id;
  props.onSourceOpen?.(s);
  await nextTick();
  requestAnimationFrame(() => document.getElementById(`${uid}-ev-${s.id}`)?.scrollIntoView?.({ block: "nearest", behavior: "smooth" }));
}
</script>

<template>
  <section data-slot="ai-cited-answer" :class="cn('flex min-w-0 flex-col gap-3', props.class)">
    <div class="flex items-center justify-between gap-2">
      <NqAiGeneratedLabel :model="props.model ?? props.provenance?.model" />
      <NqAiFeedback v-if="props.onFeedback" :value="props.feedback" :on-change="props.onFeedback" />
    </div>
    <NqAiCitedText :text="props.text" :sources="props.sources" :active-id="active" :on-active-change="setActive" :labels="props.labels" />
    <p v-if="partly" role="note" class="text-caption text-muted-foreground">
      <span class="text-nq-warning-text">{{ t.coverage(coverage.cited, coverage.total) }}</span> {{ t.partlyCited }}
    </p>
    <NqAiSourceChips :sources="props.sources" :cited-ids="citedIds" :active-id="active" :on-active-change="setActive" :on-select="evidence.length > 0 ? (s) => openSource(s) : undefined" :labels="props.labels" />
    <NqCollapsible v-if="evidence.length > 0" v-model:open="open">
      <NqCollapsibleTrigger class="inline-flex min-h-control-sm items-center gap-1.5 rounded-control text-caption text-muted-foreground outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus">
        <ChevronDown aria-hidden="true" :class="cn('size-3.5 transition-transform duration-150 ease-nq', open && 'rotate-180')" />
        {{ open ? t.hideEvidence : t.showEvidence }}
      </NqCollapsibleTrigger>
      <NqCollapsiblePanel>
        <ul :aria-label="t.evidence" class="mt-1 grid gap-2 sm:grid-cols-2">
          <li v-for="s in evidence" :id="`${uid}-ev-${s.id}`" :key="s.id" class="min-w-0" @mouseenter="setActive(s.id)" @mouseleave="setActive(null)">
            <NqAiEvidenceCard :source="s" :index="props.sources.indexOf(s) + 1" :active="active === s.id" :labels="props.labels" />
          </li>
        </ul>
      </NqCollapsiblePanel>
    </NqCollapsible>
    <NqAiProvenance v-if="props.provenance" v-bind="props.provenance" :labels="props.labels" />
  </section>
</template>
