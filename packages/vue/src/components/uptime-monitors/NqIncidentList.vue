<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { NqDateTime } from "../numeric";
import { NqTimeline, NqTimelineItem } from "../timeline";
import { formatIncidentDuration, incidentMinutes, isOpenIncident, type IncidentImpact } from "./format";
import { useUptimeStrings, type UptimeMonitorsLabels } from "./strings";
import type { Incident } from "./types";

// Incidents newest first: title, impact, status, when it started and how long it lasted, and optionally the
// update timeline.
const props = withDefaults(
  defineProps<{
    incidents: readonly Incident[];
    /** Show each incident's updates as a timeline. Default true. */
    showUpdates?: boolean;
    labels?: UptimeMonitorsLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { showUpdates: true, labels: undefined },
);

const impactVariant: Record<IncidentImpact, "warning" | "danger" | "info"> = { minor: "warning", major: "danger", maintenance: "info" };
const t = useUptimeStrings(() => props.labels);
const sorted = computed(() => [...props.incidents].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()));
</script>

<template>
  <p v-if="props.incidents.length === 0" class="rounded-control border border-dashed border-border p-4 text-body-sm text-muted-foreground">{{ t.incidentsEmpty }}</p>
  <ul v-else data-slot="incident-list" :class="cn('grid gap-3', props.class)">
    <li v-for="i in sorted" :key="i.id" data-slot="incident" :data-status="i.status" class="grid gap-2 rounded-control border border-border bg-card p-3">
      <div class="flex flex-wrap items-center gap-2">
        <h4 class="min-w-0 flex-1 text-label text-foreground" dir="auto">{{ i.title }}</h4>
        <NqBadge :variant="impactVariant[i.impact]">{{ t.impact[i.impact] }}</NqBadge>
        <NqBadge :variant="isOpenIncident(i) ? 'warning' : 'success'">{{ t.incidentStatus[i.status] }}</NqBadge>
      </div>
      <p class="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-muted-foreground">
        <span>{{ t.started }} <NqDateTime :value="i.startedAt" relative /></span>
        <span v-if="i.resolvedAt">{{ t.lasted(formatIncidentDuration(incidentMinutes(i.startedAt, i.resolvedAt), t.duration)) }}</span>
        <span v-if="i.services?.length" dir="auto">{{ i.services.join(", ") }}</span>
      </p>
      <NqTimeline v-if="props.showUpdates && i.updates?.length" :aria-label="t.updates" class="mt-1">
        <NqTimelineItem v-for="(u, n) in [...i.updates].reverse()" :key="n" :title="t.incidentStatus[u.status]" :description="u.body" :time="u.at" />
      </NqTimeline>
    </li>
  </ul>
</template>
