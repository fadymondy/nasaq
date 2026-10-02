<script setup lang="ts">
import { NqBadge } from "../badge";
import { formatUptime, uptimeTone, type UptimeTone } from "./format";

// The uptime figure as a badge, coloured by how healthy it is (99.9 and up, 99 and up, below).
const props = defineProps<{
  percent: number | null | undefined;
  /** Shown after the figure, like "30d". */
  period?: string;
}>();

const badgeVariant: Record<UptimeTone, "success" | "warning" | "danger" | "neutral"> = { success: "success", warning: "warning", danger: "danger", neutral: "neutral" };
</script>

<template>
  <NqBadge data-slot="uptime-badge" :variant="badgeVariant[uptimeTone(props.percent)]">
    <bdi dir="ltr" class="tabular-nums">{{ formatUptime(props.percent) }}</bdi>
    <span v-if="props.period" class="font-normal opacity-80">{{ props.period }}</span>
  </NqBadge>
</template>
