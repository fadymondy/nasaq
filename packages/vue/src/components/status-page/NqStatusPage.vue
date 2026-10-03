<script setup lang="ts">
import { CircleAlert, CircleCheck, CircleX, Wrench } from "lucide-vue-next";
import { computed, type Component, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { NqDateTime } from "../numeric";
import { NqTimeline, NqTimelineItem } from "../timeline";
import { NqIncidentList, NqUptimeBadge, NqUptimeBar, uptimeOverallStatus, type Incident, type MonitorStatus, type OverallStatus } from "../uptime-monitors";
import { useStatusPageStrings, type StatusPageLabels } from "./strings";
import type { StatusPageMaintenance, StatusPageService } from "./types";

// The public status page: an overall banner, each service with its daily history bar and uptime, active and past
// incidents with their updates, and scheduled maintenance. It has no admin controls and needs no sign-in.
// It is a full page section, so place it in your own layout with a max width.
// Slots: `logo` (your own mark), `title` (instead of the `title` text), `footer` (for example a subscribe link).
const props = withDefaults(
  defineProps<{
    /** Name of the product or company. */
    title?: string;
    services: readonly StatusPageService[];
    incidents?: readonly Incident[];
    maintenance?: readonly StatusPageMaintenance[];
    /** When the data was last refreshed. */
    updatedAt?: Date | number | string;
    labels?: StatusPageLabels;
    /** Override the clock, for tests and stories. */
    now?: Date | number;
    class?: HTMLAttributes["class"];
  }>(),
  { title: undefined, incidents: () => [], maintenance: () => [], updatedAt: undefined, labels: undefined, now: undefined },
);

const bannerTone: Record<OverallStatus, { cls: string; icon: Component }> = {
  operational: { cls: "border-nq-success/30 bg-nq-success/10 [&_svg]:text-nq-success", icon: CircleCheck },
  degraded: { cls: "border-nq-warning/30 bg-nq-warning/10 [&_svg]:text-nq-warning", icon: CircleAlert },
  "partial-outage": { cls: "border-nq-warning/30 bg-nq-warning/10 [&_svg]:text-nq-warning", icon: CircleAlert },
  "major-outage": { cls: "border-nq-danger/30 bg-nq-danger/10 [&_svg]:text-nq-danger", icon: CircleX },
  maintenance: { cls: "border-nq-info/30 bg-nq-info/10 [&_svg]:text-nq-info", icon: Wrench },
};
const statusVariant: Record<MonitorStatus, "success" | "warning" | "danger" | "neutral"> = { up: "success", degraded: "warning", down: "danger", paused: "neutral", unknown: "neutral" };

const t = useStatusPageStrings(() => props.labels);
const clock = computed(() => (props.now === undefined ? Date.now() : new Date(props.now).getTime()));
const running = computed(() => props.maintenance.some((m) => new Date(m.startsAt).getTime() <= clock.value && new Date(m.endsAt).getTime() >= clock.value));
const overall = computed(() =>
  uptimeOverallStatus(
    props.services.map((s) => s.status),
    running.value,
  ),
);
const tone = computed(() => bannerTone[overall.value]);
const active = computed(() => props.incidents.filter((i) => i.status !== "resolved"));
const past = computed(() => props.incidents.filter((i) => i.status === "resolved"));
const upcoming = computed(() => props.maintenance.filter((m) => new Date(m.endsAt).getTime() >= clock.value));
const when = { dateStyle: "medium", timeStyle: "short" } as const;
</script>

<template>
  <div data-slot="status-page" :data-overall="overall" :class="cn('mx-auto grid w-full max-w-3xl gap-8 px-4 py-8 sm:py-12', props.class)">
    <header class="flex items-center gap-3">
      <slot name="logo" />
      <h1 class="text-h1 text-foreground" dir="auto"><slot name="title">{{ props.title }}</slot></h1>
    </header>

    <div role="status" :class="cn('flex items-center gap-3 rounded-card border p-4', tone.cls)">
      <component :is="tone.icon" aria-hidden="true" class="size-6 shrink-0" />
      <div class="grid min-w-0 gap-0.5">
        <p class="text-h4 text-foreground">{{ t.overall[overall] }}</p>
        <p v-if="props.updatedAt" class="text-body-sm text-muted-foreground">{{ t.updated }} <NqDateTime :value="props.updatedAt" relative /></p>
      </div>
    </div>

    <section v-if="active.length" aria-labelledby="sp-active" class="grid gap-3">
      <h2 id="sp-active" class="text-h3 text-foreground">{{ t.active }}</h2>
      <NqIncidentList :incidents="active" />
    </section>

    <section aria-labelledby="sp-services" class="grid gap-3">
      <h2 id="sp-services" class="text-h3 text-foreground">{{ t.services }}</h2>
      <ul class="divide-y divide-border rounded-card border border-border bg-card">
        <li v-for="s in props.services" :key="s.id" data-slot="status-page-service" class="grid gap-2 p-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="grid min-w-0">
              <span class="text-label text-foreground" dir="auto">{{ s.name }}</span>
              <span v-if="s.description" class="text-body-sm text-muted-foreground" dir="auto">{{ s.description }}</span>
            </div>
            <NqBadge :variant="statusVariant[s.status]">{{ t.status[s.status] }}</NqBadge>
          </div>
          <template v-if="s.days?.length">
            <NqUptimeBar :checks="s.days" :label="t.history(s.name)" class="h-8" />
            <div class="flex items-center justify-between text-caption text-muted-foreground">
              <span>{{ t.daysAgo(s.days.length) }}</span>
              <NqUptimeBadge v-if="s.uptime !== undefined" :percent="s.uptime" :period="t.uptime90(s.days.length)" />
              <span>{{ t.today }}</span>
            </div>
          </template>
        </li>
      </ul>
    </section>

    <section aria-labelledby="sp-maint" class="grid gap-3">
      <h2 id="sp-maint" class="text-h3 text-foreground">{{ t.maintenance }}</h2>
      <NqTimeline v-if="upcoming.length">
        <NqTimelineItem v-for="m in upcoming" :key="m.id" :title="m.title" :description="m.description" :time="m.startsAt">
          <template #icon><Wrench aria-hidden="true" /></template>
          <p class="text-caption text-muted-foreground">{{ t.from }} <NqDateTime :value="m.startsAt" :format="when" /> {{ t.until }} <NqDateTime :value="m.endsAt" :format="when" /></p>
        </NqTimelineItem>
      </NqTimeline>
      <p v-else class="text-body-sm text-muted-foreground">{{ t.maintenanceEmpty }}</p>
    </section>

    <section aria-labelledby="sp-past" class="grid gap-3">
      <h2 id="sp-past" class="text-h3 text-foreground">{{ t.past }}</h2>
      <NqIncidentList v-if="past.length" :incidents="past" />
      <p v-else class="text-body-sm text-muted-foreground">{{ t.noIncidents }}</p>
    </section>

    <footer class="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-caption text-muted-foreground">
      <slot name="footer"><span /></slot>
      <span>{{ t.footer }}</span>
    </footer>
  </div>
</template>
