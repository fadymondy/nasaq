<script lang="ts">
const STRINGS = {
  en: {
    title: "History",
    empty: "No changes recorded yet",
    created: "Created the flag",
    toggledOn: (env: string) => `Turned on in ${env}`,
    toggledOff: (env: string) => `Turned off in ${env}`,
    rollout: (env: string, from: string, to: string) => `Changed rollout in ${env} from ${from}% to ${to}%`,
    rules: "Updated targeting rules",
    variants: "Updated variants",
    killed: "Killed the flag",
    restored: "Restored the flag",
    reason: (r: string) => `Reason: ${r}`,
    list: "Audit history of this flag",
  },
  ar: {
    title: "السجل",
    empty: "لا تغييرات مسجّلة بعد",
    created: "أنشأ المفتاح",
    toggledOn: (env: string) => `شغّله في ${env}`,
    toggledOff: (env: string) => `أوقفه في ${env}`,
    rollout: (env: string, from: string, to: string) => `غيّر الإطلاق في ${env} من ${from}% إلى ${to}%`,
    rules: "حدّث قواعد الاستهداف",
    variants: "حدّث المتغيّرات",
    killed: "أوقف المفتاح طارئًا",
    restored: "أعاد تشغيل المفتاح",
    reason: (r: string) => `السبب: ${r}`,
    list: "سجل تدقيق هذا المفتاح",
  },
};
export type FlagAuditLabels = typeof STRINGS.en;
</script>

<script setup lang="ts">
import { Gauge, History, OctagonX, Plus, Power, RotateCcw, Shapes, Target } from "lucide-vue-next";
import { computed, type Component, type HTMLAttributes } from "vue";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { NqEmptyState } from "../states";
import { NqTimeline, NqTimelineItem } from "../timeline";
import type { FlagAuditAction, FlagAuditEntry } from "./flag-audit";

// Who changed what and when on a flag, newest first: toggles, rollout changes, rule and variant edits, kills and restores.
const props = defineProps<{
  entries: readonly FlagAuditEntry[];
  class?: HTMLAttributes["class"];
  labels?: Partial<FlagAuditLabels>;
}>();

const t = useAnalyticsLabels(STRINGS, () => props.labels);
const ICON: Record<FlagAuditAction, Component> = { created: Plus, toggled: Power, rollout: Gauge, rules: Target, variants: Shapes, killed: OctagonX, restored: RotateCcw };
const sorted = computed(() => [...props.entries].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)));

function text(e: FlagAuditEntry): string {
  const tt = t.value;
  switch (e.action) {
    case "created":
      return tt.created;
    case "toggled":
      return e.to === "on" ? tt.toggledOn(e.environment ?? "") : tt.toggledOff(e.environment ?? "");
    case "rollout":
      return tt.rollout(e.environment ?? "", e.from ?? "0", e.to ?? "0");
    case "rules":
      return tt.rules;
    case "variants":
      return tt.variants;
    case "killed":
      return tt.killed;
    case "restored":
      return tt.restored;
  }
  return "";
}
</script>

<template>
  <NqEmptyState v-if="sorted.length === 0" :icon="History" :title="t.empty" :class="props.class" />
  <NqTimeline v-else data-slot="flag-audit-history" :aria-label="t.list" :class="props.class">
    <NqTimelineItem v-for="e in sorted" :key="e.id" :title="text(e)" :description="e.reason ? t.reason(e.reason) : undefined" :time="e.at">
      <template #icon>
        <component :is="ICON[e.action]" aria-hidden="true" />
      </template>
      <span dir="auto" class="text-caption text-muted-foreground">{{ e.actor }}</span>
    </NqTimelineItem>
  </NqTimeline>
</template>
