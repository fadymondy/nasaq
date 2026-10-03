<script setup lang="ts">
import { ExternalLink, Sparkles } from "lucide-vue-next";
import { computed } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { scoreExplainerWords, type ScoreExplainerLabelOverrides } from "./labels";
import type { ScoreSource } from "./types";

// A source of evidence. A link when it has a URL, a button when the host handles it, plain text otherwise.
const props = defineProps<{ source: ScoreSource; onClick?: () => void; labels?: ScoreExplainerLabelOverrides }>();
const nq = useNasaq();
const t = computed(() => scoreExplainerWords(nq.locale.value, props.labels));
const chip = "inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-caption outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus";
const tone = computed(() => (props.source.inferred ? "border-dashed border-nq-line-strong text-muted-foreground" : "border-border bg-secondary text-foreground"));
const title = computed(() => (props.source.inferred ? t.value.inferredHint : undefined));
</script>

<template>
  <a v-if="props.source.url" data-slot="score-source" :href="props.source.url" target="_blank" rel="noopener noreferrer" :class="cn(chip, tone, 'hover:bg-nq-hover')" :title="title">
    <span v-if="props.source.kind" class="text-muted-foreground">{{ props.source.kind }}</span>
    <span dir="auto" class="truncate">{{ props.source.label }}</span>
    <Sparkles v-if="props.source.inferred" aria-hidden="true" class="size-3 shrink-0 text-muted-foreground" />
    <ExternalLink aria-hidden="true" class="size-3 shrink-0 text-muted-foreground rtl:-scale-x-100" />
    <span class="sr-only">{{ t.opensNewTab }}</span>
  </a>
  <button v-else-if="props.onClick" data-slot="score-source" type="button" :class="cn(chip, tone, 'cursor-pointer hover:bg-nq-hover')" :title="title" @click="props.onClick">
    <span v-if="props.source.kind" class="text-muted-foreground">{{ props.source.kind }}</span>
    <span dir="auto" class="truncate">{{ props.source.label }}</span>
    <Sparkles v-if="props.source.inferred" aria-hidden="true" class="size-3 shrink-0 text-muted-foreground" />
  </button>
  <span v-else data-slot="score-source" :class="cn(chip, tone)" :title="title">
    <span v-if="props.source.kind" class="text-muted-foreground">{{ props.source.kind }}</span>
    <span dir="auto" class="truncate">{{ props.source.label }}</span>
    <Sparkles v-if="props.source.inferred" aria-hidden="true" class="size-3 shrink-0 text-muted-foreground" />
  </span>
</template>
