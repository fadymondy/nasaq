<script setup lang="ts">
import { Sparkles } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { scoreExplainerWords, type ScoreExplainerLabelOverrides } from "./labels";

// The "Inferred" mark: a dashed chip, so it never depends on colour.
const props = defineProps<{ labels?: ScoreExplainerLabelOverrides; class?: HTMLAttributes["class"] }>();
const nq = useNasaq();
const t = computed(() => scoreExplainerWords(nq.locale.value, props.labels));
</script>

<template>
  <span
    data-slot="score-inferred"
    :title="t.inferredHint"
    :class="cn('inline-flex h-5 items-center gap-1 rounded-[4px] border border-dashed border-nq-line-strong px-1.5 text-caption text-muted-foreground [&_svg]:size-3', props.class)"
  >
    <Sparkles aria-hidden="true" />
    {{ t.inferred }}
  </span>
</template>
