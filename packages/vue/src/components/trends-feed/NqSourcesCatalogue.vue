<script setup lang="ts">
import { CircleCheck, CircleX, Ellipsis, TriangleAlert } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqContextMenuActions, openContextMenuAt, type ContextMenuAction } from "../context-menu";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { formatRelativeTime } from "../numeric";
import { NqEmptyState } from "../states";
import { NqSwitch } from "../switch";
import { TRENDS_STRINGS, type TrendsFeedLabels } from "./strings";
import { isSourceUsable, resolveActiveTier, type SourceHealth } from "./trends-feed-math";
import type { TrendSource } from "./types";

// The news sources in three tiers. Tier 1 feeds the trends while it has a working source; when it has none the feed
// falls back to tier 2, then tier 3, and the catalogue says so. Each source has a switch, its health and its last fetch.
interface Props {
  sources: readonly TrendSource[];
  /** Turn a source on or off. Async: the switch waits, and a rejection shows an error. Update `sources` when it resolves. */
  onEnabledChange?: (source: TrendSource, enabled: boolean) => void | Promise<void>;
  /** Fetch a source again now. Offered for sources that are not working. */
  onRetry?: (source: TrendSource) => void | Promise<void>;
  /** "Now" for the last fetched times. Default: the current time. */
  now?: Date;
  labels?: Partial<TrendsFeedLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { onEnabledChange: undefined, onRetry: undefined, now: undefined, labels: undefined });

const t = useAnalyticsLabels(TRENDS_STRINGS, () => props.labels);
const nq = useNasaq();
const busy = ref<ReadonlySet<string>>(new Set());
const failed = ref<ReadonlySet<string>>(new Set());
const active = computed(() => resolveActiveTier(props.sources));
const reference = computed(() => props.now ?? new Date());
const tiers = [1, 2, 3] as const;
const healthBadge = {
  ok: { variant: "success", icon: CircleCheck },
  degraded: { variant: "warning", icon: TriangleAlert },
  down: { variant: "danger", icon: CircleX },
} as const satisfies Record<SourceHealth, unknown>;

async function run(source: TrendSource, job: () => void | Promise<void>) {
  if (busy.value.has(source.id)) return;
  busy.value = new Set(busy.value).add(source.id);
  const clear = new Set(failed.value);
  clear.delete(source.id);
  failed.value = clear;
  try {
    await job();
  } catch {
    failed.value = new Set(failed.value).add(source.id);
  } finally {
    const next = new Set(busy.value);
    next.delete(source.id);
    busy.value = next;
  }
}

function menuFor(s: TrendSource): ContextMenuAction[] {
  return [
    ...(props.onEnabledChange ? [{ id: "toggle", label: s.enabled ? t.value.disable : t.value.enable, onSelect: () => void run(s, () => props.onEnabledChange!(s, !s.enabled)) }] : []),
    ...(props.onRetry && s.enabled && s.health !== "ok" ? [{ id: "retry", label: t.value.retry, onSelect: () => void run(s, () => props.onRetry!(s)) }] : []),
    ...(s.url ? [{ id: "visit", label: t.value.visit, group: "more", onSelect: () => void window.open(s.url, "_blank", "noreferrer") }] : []),
  ];
}
const inTier = (tier: number) => props.sources.filter((s) => s.tier === tier);
</script>

<template>
  <section data-slot="sources-catalogue" :class="cn('flex flex-col gap-4', props.class)">
    <p v-if="active.tier === null && props.sources.length" role="status" class="flex items-center gap-2 rounded-control border border-nq-danger/40 bg-nq-danger-soft px-3 py-2 text-body-sm text-nq-danger-text">
      <CircleX aria-hidden="true" class="size-4 shrink-0" />
      {{ t.noneWorking }}
    </p>
    <p v-else-if="active.fellBack && active.tier" role="status" class="flex items-center gap-2 rounded-control border border-nq-warning/40 bg-nq-warning-soft px-3 py-2 text-body-sm text-nq-warning-text">
      <TriangleAlert aria-hidden="true" class="size-4 shrink-0" />
      {{ t.fellBack(active.skipped.map((n) => t.tier(n)).join(", "), active.tier) }}
    </p>
    <NqEmptyState v-if="props.sources.length === 0" :title="t.sourcesEmpty" />
    <template v-for="tier in tiers" :key="tier">
      <div v-if="inTier(tier).length" class="flex flex-col gap-2">
        <div class="flex flex-wrap items-center gap-2">
          <h3 class="text-label font-medium">{{ t.tier(tier) }}</h3>
          <NqBadge v-if="active.tier === tier" variant="success"><CircleCheck aria-hidden="true" />{{ t.active }}</NqBadge>
          <p class="text-caption text-muted-foreground">{{ t.tierHint[tier] }}</p>
        </div>
        <ul class="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
          <NqContextMenuActions v-for="s in inTier(tier)" :key="s.id" :actions="menuFor(s)" as="li" :class="cn('flex flex-wrap items-center gap-3 px-4 py-3', !isSourceUsable(s) && 'opacity-90')">
            <NqSwitch :model-value="s.enabled" :disabled="!props.onEnabledChange || busy.has(s.id)" :aria-label="t.enabled(s.name)" @update:model-value="(v: boolean) => run(s, () => props.onEnabledChange?.(s, v))" />
            <div class="min-w-0 flex-1">
              <p class="truncate text-body font-medium">{{ s.name }}</p>
              <p class="text-caption text-muted-foreground">
                {{ t.lastFetched }}: {{ s.lastFetchedAt ? formatRelativeTime(s.lastFetchedAt, nq.locale.value, { now: reference }) : t.never
                }}<template v-if="s.perDay !== undefined"> · {{ t.perDay(new Intl.NumberFormat("en").format(s.perDay)) }}</template>
              </p>
              <p v-if="failed.has(s.id)" role="alert" class="text-caption text-nq-danger-text">{{ t.toggleFailed }}</p>
            </div>
            <NqBadge :variant="healthBadge[s.health].variant">
              <component :is="healthBadge[s.health].icon" aria-hidden="true" />
              {{ t.health[s.health] }}
            </NqBadge>
            <NqButton v-if="menuFor(s).length" variant="ghost" size="icon-sm" :aria-label="t.moreFor(s.name)" @click="(e: MouseEvent) => openContextMenuAt((e.currentTarget as HTMLElement).closest('li') as HTMLElement)">
              <Ellipsis aria-hidden="true" />
            </NqButton>
          </NqContextMenuActions>
        </ul>
      </div>
    </template>
  </section>
</template>
