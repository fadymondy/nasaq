<script setup lang="ts">
import { ChevronDown, ShieldCheck, ShieldQuestion } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAiConfidenceMeter } from "../ai-states";
import { NqCollapsible, NqCollapsiblePanel, NqCollapsibleTrigger } from "../collapsible";
import { NqDateTime, NqNum } from "../numeric";
import { aiLatencyParts } from "./ai-citations-logic";
import { aiCitationsWords, type AiCitationsLabels } from "./labels";
import type { AiProvenanceInfo } from "./types";

// Where an answer came from: model, response time and whether it is grounded in sources. One quiet line that opens to the full list.
// Nothing here is guessed, you pass what your backend knows.
const props = withDefaults(
  defineProps<
    AiProvenanceInfo & {
      /** Start with the details open. */
      defaultOpen?: boolean;
      labels?: Partial<AiCitationsLabels>;
      class?: HTMLAttributes["class"];
    }
  >(),
  { defaultOpen: false, model: undefined, latencyMs: undefined, grounded: undefined, sourceCount: undefined, tokens: undefined, retrieved: undefined, at: undefined, confidence: undefined, extra: undefined, labels: undefined },
);
const nq = useNasaq();
const t = computed(() => aiCitationsWords(nq.locale.value, props.labels));
const open = ref(props.defaultOpen);
const groundedText = computed(() =>
  props.grounded === undefined ? null : props.grounded ? (props.sourceCount !== undefined ? t.value.groundedIn(props.sourceCount) : t.value.grounded) : t.value.ungrounded,
);
const latency = computed(() => (props.latencyMs === undefined ? null : aiLatencyParts(props.latencyMs)));
const latencyFormat = computed(() => ({ style: "unit" as const, unit: latency.value?.unit === "s" ? "second" : "millisecond", unitDisplay: "narrow" as const, maximumFractionDigits: 1 }));
const hasTokens = computed(() => props.tokens && (props.tokens.input !== undefined || props.tokens.output !== undefined));
</script>

<template>
  <NqCollapsible v-model:open="open" data-slot="ai-provenance" :class="cn('rounded-control border border-border bg-secondary', props.class)">
    <NqCollapsibleTrigger
      as="button"
      class="flex min-h-control-sm w-full flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5 text-start text-caption text-muted-foreground outline-none focus-visible:outline-2 focus-visible:outline-nq-focus"
    >
      <template v-if="props.grounded !== undefined">
        <ShieldCheck v-if="props.grounded" aria-hidden="true" class="size-3.5 shrink-0 text-nq-success-text" />
        <ShieldQuestion v-else aria-hidden="true" class="size-3.5 shrink-0 text-nq-warning-text" />
      </template>
      <span class="sr-only">{{ t.provenance }}</span>
      <span v-if="groundedText" class="text-foreground">{{ groundedText }}</span>
      <bdi v-if="props.model" dir="ltr">{{ props.model }}</bdi>
      <NqNum v-if="latency" :value="latency.value" :format="latencyFormat" />
      <span class="flex-1" />
      <ChevronDown aria-hidden="true" :class="cn('size-3.5 shrink-0 transition-transform duration-150 ease-nq', open && 'rotate-180')" />
    </NqCollapsibleTrigger>
    <NqCollapsiblePanel>
      <div class="flex flex-col gap-3 border-t border-border px-3 py-2">
        <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-caption">
          <div v-if="props.model" class="contents">
            <dt class="text-muted-foreground">{{ t.model }}</dt>
            <dd class="min-w-0 text-foreground"><bdi dir="ltr">{{ props.model }}</bdi></dd>
          </div>
          <div v-if="latency" class="contents">
            <dt class="text-muted-foreground">{{ t.latency }}</dt>
            <dd class="min-w-0 text-foreground"><NqNum :value="latency.value" :format="latencyFormat" /></dd>
          </div>
          <div v-if="hasTokens" class="contents">
            <dt class="text-muted-foreground">{{ t.tokens }}</dt>
            <dd class="min-w-0 text-foreground">
              <span class="flex flex-wrap gap-x-3">
                <span v-if="props.tokens!.input !== undefined"><NqNum :value="props.tokens!.input!" /> {{ t.tokensIn }}</span>
                <span v-if="props.tokens!.output !== undefined"><NqNum :value="props.tokens!.output!" /> {{ t.tokensOut }}</span>
              </span>
            </dd>
          </div>
          <div v-if="props.retrieved !== undefined" class="contents">
            <dt class="text-muted-foreground">{{ t.retrieved }}</dt>
            <dd class="min-w-0 text-foreground"><NqNum :value="props.retrieved" /></dd>
          </div>
          <div v-if="props.at !== undefined" class="contents">
            <dt class="text-muted-foreground">{{ t.generatedAt }}</dt>
            <dd class="min-w-0 text-foreground"><NqDateTime :value="props.at" :format="{ dateStyle: 'medium', timeStyle: 'short' }" /></dd>
          </div>
          <div v-for="(r, i) in props.extra ?? []" :key="i" class="contents">
            <dt class="text-muted-foreground">{{ r.label }}</dt>
            <dd class="min-w-0 text-foreground">{{ r.value }}</dd>
          </div>
        </dl>
        <NqAiConfidenceMeter v-if="props.confidence !== undefined" :value="props.confidence" />
      </div>
    </NqCollapsiblePanel>
  </NqCollapsible>
</template>
