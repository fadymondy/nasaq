<script setup lang="ts">
import { Activity, CircleDot, Clock, Code2, FileText, MessageSquare, RefreshCw, UserPlus, X } from "lucide-vue-next";
import { computed, ref, useId, type Component } from "vue";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { formatDate, formatNumber, NqNum } from "../numeric";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqEmptyState } from "../states";
import { NqTimeline, NqTimelineItem } from "../timeline";
import { dayKey, filterFeed, groupByDay } from "./project-logic";
import type { ProjectViewStrings } from "./strings";
import type { ProjectActivityItem } from "./types";

// The whole project activity: filter by type and person, grouped by day, newest first.
const props = defineProps<{
  items: readonly ProjectActivityItem[];
  /** "Today" as a civil date, so the day headings read Today and Yesterday. */
  today: string;
  t: ProjectViewStrings;
}>();

const FEED_KINDS = ["issue", "comment", "status", "member", "file", "code", "time", "other"] as const;
const KIND_ICON: Record<(typeof FEED_KINDS)[number], Component> = { issue: CircleDot, comment: MessageSquare, status: RefreshCw, member: UserPlus, file: FileText, code: Code2, time: Clock, other: Activity };

const nq = useNasaq();
const locale = computed(() => nq.locale.value);
const kind = ref("all");
const actor = ref("all");
const kindId = useId();
const personId = useId();

const people = computed(() => [...new Set(props.items.map((i) => i.actor?.name).filter((n): n is string => Boolean(n)))].sort((a, b) => a.localeCompare(b)));
const kinds = computed(() => FEED_KINDS.filter((k) => props.items.some((i) => (i.kind ?? "other") === k)));
const shown = computed(() => filterFeed(props.items, { kind: kind.value, actor: actor.value }));
const groups = computed(() => groupByDay(shown.value));
const filtered = computed(() => kind.value !== "all" || actor.value !== "all");
const yesterday = computed(() => {
  const d = new Date(`${props.today}T00:00:00`);
  d.setDate(d.getDate() - 1);
  return dayKey(d);
});
const heading = (day: string) => (day === props.today ? props.t.feedToday : day === yesterday.value ? props.t.feedYesterday : formatDate(new Date(`${day}T00:00:00`), locale.value, { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
const clear = () => {
  kind.value = "all";
  actor.value = "all";
};
</script>

<template>
  <div data-slot="project-feed" class="flex min-w-0 flex-col gap-4">
    <div class="flex min-w-0 flex-wrap items-center justify-between gap-3">
      <div class="flex min-w-0 flex-col gap-0.5">
        <h2 class="m-0 text-h3">{{ props.t.feedTitle }}</h2>
        <p role="status" class="m-0 text-body-sm text-muted-foreground">{{ props.t.feedCount(formatNumber(shown.length, locale)) }}</p>
      </div>
      <div class="flex min-w-0 flex-wrap items-center gap-3">
        <div class="flex min-w-0 items-center gap-2">
          <span :id="kindId" class="shrink-0 text-body-sm text-muted-foreground">{{ props.t.feedKind }}</span>
          <NqSelect v-model="kind">
            <NqSelectTrigger :aria-labelledby="kindId" class="min-w-32"><NqSelectValue /></NqSelectTrigger>
            <NqSelectContent>
              <NqSelectItem value="all">{{ props.t.feedAll }}</NqSelectItem>
              <NqSelectItem v-for="k in kinds" :key="k" :value="k">{{ props.t.feedKinds[k] }}</NqSelectItem>
            </NqSelectContent>
          </NqSelect>
        </div>
        <div class="flex min-w-0 items-center gap-2">
          <span :id="personId" class="shrink-0 text-body-sm text-muted-foreground">{{ props.t.feedPerson }}</span>
          <NqSelect v-model="actor">
            <NqSelectTrigger :aria-labelledby="personId" class="min-w-32"><NqSelectValue /></NqSelectTrigger>
            <NqSelectContent>
              <NqSelectItem value="all">{{ props.t.feedAllPeople }}</NqSelectItem>
              <NqSelectItem v-for="p in people" :key="p" :value="p">{{ p }}</NqSelectItem>
            </NqSelectContent>
          </NqSelect>
        </div>
        <NqButton v-if="filtered" size="sm" variant="ghost" @click="clear"><X aria-hidden="true" />{{ props.t.feedClear }}</NqButton>
      </div>
    </div>

    <NqEmptyState v-if="props.items.length === 0" :icon="Activity" :title="props.t.feedEmpty" :description="props.t.feedEmptyHint" />
    <NqEmptyState v-else-if="groups.length === 0" :icon="Activity" :title="props.t.feedNoMatch" :description="props.t.feedNoMatchHint" />
    <div v-else class="flex min-w-0 flex-col gap-5">
      <section v-for="g in groups" :key="g.day" :aria-label="heading(g.day)" class="flex min-w-0 flex-col gap-2">
        <h3 class="m-0 flex items-center gap-2 text-label text-muted-foreground">
          {{ heading(g.day) }}
          <span class="font-normal"><NqNum :value="g.items.length" /></span>
        </h3>
        <NqTimeline :aria-label="heading(g.day)">
          <NqTimelineItem v-for="a in g.items" :key="a.id" :actor="a.actor" :title="a.title" :description="a.description" :time="a.at">
            <template v-if="!a.actor" #icon><component :is="KIND_ICON[a.kind ?? 'other']" /></template>
          </NqTimelineItem>
        </NqTimeline>
      </section>
    </div>
  </div>
</template>
