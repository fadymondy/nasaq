<script setup lang="ts">
import { Check, Gift, Lock, Sparkles } from "lucide-vue-next";
import { computed, onBeforeUnmount, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import NqBadge from "../badge/NqBadge.vue";
import NqButton from "../button/NqButton.vue";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import NqRarityBadge from "./NqRarityBadge.vue";
import type { Rarity } from "./gamification-logic";
import { RARITY_STYLE, type GamificationLabels } from "./strings";
import type { RewardStatus } from "./types";
import { useKit } from "./use-kit";

// A reward or collectible: the art, its rarity, what it costs and a Claim button that handles its own progress and errors.
// The `art` slot is the picture (an image, an icon or any node); default a gift icon.
interface Props {
  title: string;
  description?: string;
  rarity?: Rarity;
  /** Price in points. Omit for a reward that is simply earned. */
  cost?: number;
  /** What the price is in. Default "points" (localised). */
  costUnit?: string;
  /** The points the person has. Used to say how many more are needed. */
  balance?: number;
  status?: RewardStatus;
  /** Why it is locked, e.g. "Reach level 5". */
  lockedReason?: string;
  /** Claims the reward. Resolve with `{ error }` to show a message. */
  onClaim?: () => Promise<void | { error?: string }>;
  labels?: Partial<GamificationLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  description: undefined,
  rarity: "common",
  cost: undefined,
  costUnit: undefined,
  balance: undefined,
  status: "available",
  lockedReason: undefined,
  onClaim: undefined,
  labels: undefined,
});
const { t, num } = useKit(() => props.labels);
const busy = ref(false);
const error = ref<string | undefined>();
let mounted = true;
onBeforeUnmount(() => {
  mounted = false;
});
const s = computed(() => RARITY_STYLE[props.rarity]);
const short = computed(() => (props.cost !== undefined && props.balance !== undefined && props.balance < props.cost ? props.cost - props.balance : 0));
const canClaim = computed(() => props.status === "available" && short.value === 0 && !!props.onClaim);

async function claim() {
  if (!props.onClaim || busy.value) return;
  busy.value = true;
  error.value = undefined;
  try {
    const result = await props.onClaim();
    if (mounted && result && "error" in result && result.error) error.value = result.error;
  } catch {
    if (mounted) error.value = t.value.failed;
  } finally {
    if (mounted) busy.value = false;
  }
}
</script>

<template>
  <NqCard data-slot="reward-card" :data-status="props.status" :data-rarity="props.rarity" :class="cn('min-w-0 gap-3 overflow-hidden py-0', props.status === 'locked' && 'opacity-80', props.class)">
    <div :class="cn('grid h-32 place-items-center border-b [&_svg]:size-12', s.soft, s.ring, s.text)">
      <slot name="art"><Gift aria-hidden="true" /></slot>
    </div>
    <NqCardHeader>
      <NqCardTitle as="h3" class="flex flex-wrap items-center gap-1.5">
        <span dir="auto">{{ props.title }}</span>
        <NqRarityBadge :rarity="props.rarity" :labels="props.labels" />
      </NqCardTitle>
      <NqCardDescription v-if="props.description">
        <span dir="auto">{{ props.description }}</span>
      </NqCardDescription>
    </NqCardHeader>
    <NqCardContent class="flex flex-col gap-2 pb-4">
      <div class="flex items-center justify-between gap-2">
        <span v-if="props.cost !== undefined" class="inline-flex items-center gap-1 text-label tabular-nums text-foreground">
          <Sparkles aria-hidden="true" class="size-4 text-nq-accent-text" />
          <bdi>{{ t.cost(num(props.cost), props.costUnit ?? t.points) }}</bdi>
        </span>
        <span v-else />
        <NqBadge v-if="props.status === 'owned'" variant="success">
          <Check aria-hidden="true" />
          {{ t.claimed }}
        </NqBadge>
        <NqBadge v-else-if="props.status === 'locked'" variant="outline">
          <Lock aria-hidden="true" />
          {{ t.locked }}
        </NqBadge>
        <NqButton v-else size="sm" variant="primary" :loading="busy" :disabled="!canClaim" @click="claim">{{ busy ? t.claiming : t.claim }}</NqButton>
      </div>
      <p v-if="props.status === 'locked' && props.lockedReason" class="text-caption text-muted-foreground">{{ props.lockedReason }}</p>
      <p v-if="props.status === 'available' && short > 0" class="text-caption text-muted-foreground">{{ t.needMore(num(short)) }}</p>
      <p v-if="error" role="alert" class="text-caption text-nq-danger-text">{{ error }}</p>
    </NqCardContent>
  </NqCard>
</template>
