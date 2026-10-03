<script setup lang="ts">
import { Bell, BellRing, Check, CheckCheck, ChevronDown, CircleAlert, MessageSquare, RotateCcw, ShieldAlert, TriangleAlert } from "lucide-vue-next";
import { computed, ref, useId, type Component } from "vue";
import { cn } from "../../lib/cn";
import { NqAlert } from "../alert";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqDateTime } from "../numeric";
import { NqStatus, type StatusTone } from "../status";
import { NqTimeline, NqTimelineItem } from "../timeline";
import { canAcknowledge, canReopen, canResolve } from "./alerts-format";
import type { AlertAction, AlertsLabels } from "./strings";
import type { AlertEventType, AlertItem, AlertResult, AlertSeverity, AlertStatus } from "./types";

// One alert: severity, status, source and age, the actions that fit its status, and a details panel with a timeline.
interface Props {
  alert: AlertItem;
  t: AlertsLabels;
  actions?: AlertAction[];
  onAcknowledge?: (id: string) => Promise<AlertResult>;
  onResolve?: (id: string) => Promise<AlertResult>;
  onReopen?: (id: string) => Promise<AlertResult>;
  onAction?: (actionId: string, alertId: string) => Promise<AlertResult>;
}
const props = defineProps<Props>();

const severityBadge: Record<AlertSeverity, "danger" | "warning" | "info" | "outline"> = { critical: "danger", high: "warning", medium: "info", low: "outline", info: "outline" };
const severityIcon: Record<AlertSeverity, Component> = { critical: ShieldAlert, high: TriangleAlert, medium: CircleAlert, low: Bell, info: Bell };
const statusTone: Record<AlertStatus, StatusTone> = { open: "danger", acknowledged: "warning", resolved: "success" };
const eventIcon: Record<AlertEventType, Component> = { created: BellRing, notified: Bell, acknowledged: Check, resolved: CheckCheck, reopened: RotateCcw, escalated: TriangleAlert, comment: MessageSquare };

const open = ref(false);
const busy = ref<string | null>(null);
const error = ref<string | null>(null);
const panelId = `nq-alert-${useId()}`;

async function run(key: string, fn: () => Promise<AlertResult>) {
  busy.value = key;
  error.value = null;
  try {
    const r = await fn();
    if (r && typeof r === "object" && r.error) error.value = r.error;
  } catch {
    error.value = props.t.failed;
  } finally {
    busy.value = null;
  }
}

const timeline = computed(() => [...(props.alert.timeline ?? [])].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()));
const disabled = computed(() => busy.value !== null);
const resolved = computed(() => props.alert.status === "resolved");
const SeverityIcon = computed(() => severityIcon[props.alert.severity]);
const description = (actor?: string, note?: string) => [actor, note].filter(Boolean).join(" - ") || undefined;
</script>

<template>
  <li data-slot="alert-row" :data-severity="props.alert.severity" :data-status="props.alert.status" class="flex flex-col gap-3 rounded-card border border-border bg-card p-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="flex min-w-0 flex-1 flex-col gap-1.5">
        <div class="flex flex-wrap items-center gap-2">
          <NqBadge :variant="severityBadge[props.alert.severity]" :data-severity="props.alert.severity">
            <component :is="SeverityIcon" aria-hidden="true" />
            {{ props.t.severity[props.alert.severity] }}
          </NqBadge>
          <NqStatus :tone="statusTone[props.alert.status]">{{ props.t.status[props.alert.status] }}</NqStatus>
          <span v-if="props.alert.count && props.alert.count > 1" class="text-caption text-muted-foreground">{{ props.t.firedTimes(props.alert.count) }}</span>
        </div>
        <h3 :class="cn('text-label text-foreground', resolved && 'text-muted-foreground')">{{ props.alert.title }}</h3>
        <p class="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
          <span>{{ props.t.source }}: <bdi dir="ltr" class="tabular-nums">{{ props.alert.source }}</bdi></span>
          <NqDateTime :value="props.alert.createdAt" relative />
          <NqBadge v-for="tag in props.alert.tags" :key="tag" variant="outline"><bdi dir="ltr" class="tabular-nums">{{ tag }}</bdi></NqBadge>
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <NqButton v-if="props.onAcknowledge && canAcknowledge(props.alert.status)" type="button" size="sm" variant="secondary" :disabled="disabled" :loading="busy === 'ack'" @click="run('ack', () => props.onAcknowledge!(props.alert.id))">
          <Check aria-hidden="true" />
          {{ props.t.acknowledge }}
        </NqButton>
        <NqButton v-if="props.onResolve && canResolve(props.alert.status)" type="button" size="sm" variant="primary" :disabled="disabled" :loading="busy === 'resolve'" @click="run('resolve', () => props.onResolve!(props.alert.id))">
          <CheckCheck aria-hidden="true" />
          {{ props.t.resolve }}
        </NqButton>
        <NqButton v-if="props.onReopen && canReopen(props.alert.status)" type="button" size="sm" variant="secondary" :disabled="disabled" :loading="busy === 'reopen'" @click="run('reopen', () => props.onReopen!(props.alert.id))">
          <RotateCcw aria-hidden="true" class="rtl:-scale-x-100" />
          {{ props.t.reopen }}
        </NqButton>
        <NqButton type="button" size="sm" variant="ghost" :aria-expanded="open" :aria-controls="panelId" @click="open = !open">
          {{ open ? props.t.hideDetails : props.t.details }}
          <ChevronDown aria-hidden="true" :class="cn('transition-transform motion-reduce:transition-none', open && 'rotate-180')" />
        </NqButton>
      </div>
    </div>
    <NqAlert v-if="error" tone="danger" dismissible @dismiss="error = null">{{ error }}</NqAlert>
    <div v-if="open" :id="panelId" class="grid gap-5 border-t border-border pt-4 lg:grid-cols-2">
      <div class="flex min-w-0 flex-col gap-4">
        <p v-if="props.alert.description" class="text-body-sm text-foreground">{{ props.alert.description }}</p>
        <slot name="extra" :alert="props.alert" />
        <div v-if="props.actions && props.actions.length > 0 && props.onAction && !resolved" class="flex flex-wrap gap-2">
          <NqButton v-for="a in props.actions" :key="a.id" type="button" size="sm" :variant="a.variant ?? 'secondary'" :disabled="disabled" :loading="busy === a.id" @click="run(a.id, () => props.onAction!(a.id, props.alert.id))">
            {{ a.label }}
          </NqButton>
        </div>
      </div>
      <div class="min-w-0">
        <h4 class="mb-3 text-label text-foreground">{{ props.t.timeline }}</h4>
        <p v-if="timeline.length === 0" class="text-body-sm text-muted-foreground">{{ props.t.noTimeline }}</p>
        <NqTimeline v-else>
          <NqTimelineItem v-for="e in timeline" :key="e.id" :title="props.t.events[e.type]" :description="description(e.actor, e.note)" :time="e.at">
            <template #icon><component :is="eventIcon[e.type]" aria-hidden="true" /></template>
          </NqTimelineItem>
        </NqTimeline>
      </div>
    </div>
  </li>
</template>
