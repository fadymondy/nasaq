<script setup lang="ts">
import { Sparkles } from "lucide-vue-next";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { useUpgradeStrings } from "./strings";

// Marks a feature, menu item or setting as part of a paid plan. The default slot is the plan's name (default "Pro").
interface Props {
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const { t } = useUpgradeStrings();
</script>

<template>
  <NqBadge data-slot="plan-badge" variant="brand" :class="cn('gap-1', props.class)">
    <Sparkles aria-hidden="true" class="size-3" />
    <slot>{{ t.pro }}</slot>
  </NqBadge>
</template>
