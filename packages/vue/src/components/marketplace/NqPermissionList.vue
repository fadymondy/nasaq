<script setup lang="ts">
import { Lock, ShieldAlert, ShieldCheck } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { sortPermissions } from "./marketplace-format";
import { riskVariant, useMarketplaceLabels, type MarketplaceLabels, type MarketplacePermission } from "./strings";

// What an extension asks to do, most sensitive first. Risk is spelled out, never colour alone.
interface Props {
  permissions: MarketplacePermission[];
  class?: HTMLAttributes["class"];
  labels?: Partial<MarketplaceLabels>;
}
const props = withDefaults(defineProps<Props>(), { labels: undefined });
const { t } = useMarketplaceLabels(() => props.labels);
const sorted = computed(() => sortPermissions(props.permissions));
const iconOf = (risk: "low" | "medium" | "high") => (risk === "high" ? ShieldAlert : risk === "medium" ? ShieldCheck : Lock);
</script>

<template>
  <p v-if="props.permissions.length === 0" :class="cn('text-body-sm text-muted-foreground', props.class)">{{ t.noPermissions }}</p>
  <ul v-else data-slot="permission-list" :class="cn('flex flex-col divide-y divide-border rounded-card border border-border bg-card', props.class)">
    <li v-for="p in sorted" :key="p.id" :data-risk="p.risk ?? 'low'" class="flex items-start gap-3 px-3 py-2.5">
      <component :is="iconOf(p.risk ?? 'low')" aria-hidden="true" class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div class="min-w-0 flex-1">
        <p dir="auto" class="text-body-sm text-foreground">{{ p.label }}</p>
        <p v-if="p.description" dir="auto" class="text-caption text-muted-foreground">{{ p.description }}</p>
      </div>
      <NqBadge :variant="riskVariant[p.risk ?? 'low']" class="shrink-0">{{ t.risk[p.risk ?? "low"] }}</NqBadge>
    </li>
  </ul>
</template>
