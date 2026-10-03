<script setup lang="ts">
import { Star } from "lucide-vue-next";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import NqBadge from "../badge/NqBadge.vue";
import type { Rarity } from "./gamification-logic";
import { RARITY_STYLE, type GamificationLabels } from "./strings";
import { useKit } from "./use-kit";

// The rarity as a word with a star, so it is never colour alone.
interface Props {
  rarity: Rarity;
  labels?: Partial<GamificationLabels>;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const { t } = useKit(() => props.labels);
</script>

<template>
  <NqBadge data-slot="rarity-badge" :data-rarity="props.rarity" variant="outline" :class="cn('gap-1', RARITY_STYLE[props.rarity].ring, RARITY_STYLE[props.rarity].text, props.class)">
    <Star aria-hidden="true" class="fill-current" />
    {{ t.rarity[props.rarity] }}
  </NqBadge>
</template>
