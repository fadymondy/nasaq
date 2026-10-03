<script setup lang="ts">
import { BellRing, CheckCheck, Megaphone, PhoneCall, PlayCircle, RotateCcw, SkipForward, UserX } from "lucide-vue-next";
import { computed, h, ref, type Component, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqAlert } from "../alert";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { NqDataTable, useDataTable, type DataTableRowAction } from "../data-table";
import { NqNum } from "../numeric";
import { isCallOverdue, NqQueueLiveIndicator, useQueueNow, waitingOrder, type QueueConnection, type QueueEntry } from "../waiting-screen";
import { useClinicQueueLabels, type ClinicQueueAction, type ClinicQueueLabels } from "./strings";

// A doctor's live patient queue: a big Call next button, the patients who are with the doctor or being called, and a table of everyone
// else with the moves that make sense for each row (call now, call again, skip, start, finish, put back). The same moves
// open from the row's menu, the context menu and the keyboard. Waiting patients come in the order `waitingOrder` gives.
const props = withDefaults(
  defineProps<{
    /** The queue. Show one doctor's list by passing only their entries, or pass everything. */
    entries: readonly QueueEntry[];
    /**
     * Do something to a ticket. `id` is missing for "call-next". Return `{ error }` (or throw) to show a message.
     * The queue rules (order, who may move where) live in `queue-math`: apply them in the handler.
     */
    onAction: (action: ClinicQueueAction, id?: string) => Promise<void | { error?: string }>;
    /** Minutes a called ticket may go unanswered before the panel warns. Default 5. */
    graceMinutes?: number;
    connection?: QueueConnection;
    /** When the queue last updated (epoch ms), for the live indicator. */
    updatedAt?: number;
    /** Overrides the clock (epoch ms) for examples and tests. */
    now?: number;
    labels?: Partial<ClinicQueueLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { graceMinutes: 5, connection: "live", updatedAt: undefined, now: undefined, labels: undefined },
);

const ORDER: Record<string, number> = { serving: 0, called: 1, waiting: 2, skipped: 3 };
const t = useClinicQueueLabels(() => props.labels);
const clock = useQueueNow(() => props.now);
const busy = ref(false);
const error = ref<string | null>(null);

async function run(action: ClinicQueueAction, id?: string) {
  busy.value = true;
  error.value = null;
  try {
    const r = await props.onAction(action, id);
    if (r && r.error) error.value = r.error;
  } catch {
    error.value = t.value.failed;
  } finally {
    busy.value = false;
  }
}

const waiting = computed(() => waitingOrder(props.entries));
const active = computed(() => props.entries.filter((e) => e.status === "called" || e.status === "serving"));
const rows = computed(() => {
  const order = new Map(waiting.value.map((e, i) => [e.id, i]));
  return props.entries
    .filter((e) => e.status in ORDER)
    .sort((a, b) => ORDER[a.status]! - ORDER[b.status]! || (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0) || a.queuedAt - b.queuedAt);
});
const overdue = computed(() => active.value.filter((e) => isCallOverdue(e, clock.value, props.graceMinutes)));

const table = useDataTable<QueueEntry>({
  data: rows,
  getRowId: (e) => e.id,
  columns: computed(() => [
    { id: "ticket", header: t.value.ticket, cell: (e: QueueEntry) => h("bdi", { dir: "ltr", class: "font-mono font-semibold tabular-nums" }, e.ticket) },
    { id: "patient", header: t.value.patient, cell: (e: QueueEntry) => e.name ?? "-" },
    {
      id: "priority",
      header: t.value.priority,
      cell: (e: QueueEntry) => (e.priority === "urgent" ? h(NqBadge, { variant: "danger" }, () => t.value.pr.urgent) : h("span", { class: "text-muted-foreground" }, t.value.pr[e.priority ?? "normal"])),
    },
    {
      id: "status",
      header: t.value.status,
      cell: (e: QueueEntry) => h(NqBadge, { variant: e.status === "serving" ? "brand" : e.status === "called" ? "info" : e.status === "skipped" ? "warning" : "neutral" }, () => t.value.st[e.status]),
    },
    {
      id: "waited",
      header: t.value.waited,
      align: "end" as const,
      cell: (e: QueueEntry) => h("span", { class: "tabular-nums" }, t.value.min(Math.max(0, Math.floor((clock.value - e.queuedAt) / 60000)))),
    },
  ]),
});

function actionsFor(e: QueueEntry): DataTableRowAction[] {
  const a = (id: ClinicQueueAction, icon: Component, extra: Partial<DataTableRowAction> = {}): DataTableRowAction => ({
    id,
    label: t.value.actions[id],
    icon,
    onSelect: () => void run(id, e.id),
    disabled: busy.value,
    ...extra,
  });
  switch (e.status) {
    case "waiting":
      return [a("call", PhoneCall)];
    case "called":
      return [a("start", PlayCircle), a("recall", Megaphone), a("skip", SkipForward, { group: "more" }), a("no-show", UserX, { group: "more", danger: true })];
    case "serving":
      return [a("finish", CheckCheck)];
    case "skipped":
      return [a("recall", RotateCcw, { label: t.value.putBack }), a("no-show", UserX, { danger: true })];
    default:
      return [];
  }
}

const nextUp = computed(() => waiting.value[0]);
</script>

<template>
  <div data-slot="clinic-queue" :class="cn('flex flex-col gap-4', props.class)">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-col">
        <h2 class="text-h3">{{ t.title }}</h2>
        <p class="text-body-sm text-muted-foreground">{{ nextUp ? t.nextIs(nextUp.ticket) : t.empty }}</p>
      </div>
      <div class="flex items-center gap-3">
        <NqQueueLiveIndicator :connection="connection" :updated-at="updatedAt" :now="now" />
        <NqButton size="lg" :disabled="busy || !nextUp" @click="run('call-next')">
          <BellRing aria-hidden="true" />
          {{ t.callNext }}
          <bdi v-if="nextUp" dir="ltr" class="rounded-control bg-primary-foreground/20 px-1.5 font-mono tabular-nums">{{ nextUp.ticket }}</bdi>
        </NqButton>
      </div>
    </div>

    <NqAlert v-if="error" tone="danger">{{ error }}</NqAlert>
    <NqAlert v-for="e in overdue" :key="e.id" tone="warning">{{ t.overdue(e.ticket, Math.floor((clock - (e.calledAt ?? clock)) / 60000)) }}</NqAlert>

    <section :aria-label="t.serving" class="grid gap-3 sm:grid-cols-2">
      <p v-if="active.length === 0" class="text-body-sm text-muted-foreground sm:col-span-2">{{ t.nothingServing }}</p>
      <template v-else>
        <NqCard v-for="e in active" :key="e.id" data-slot="clinic-queue-active" :data-status="e.status">
          <NqCardHeader>
            <NqCardTitle as="h3" class="flex items-center gap-2">
              <bdi dir="ltr" class="font-mono text-h3 tabular-nums">{{ e.ticket }}</bdi>
              <NqBadge :variant="e.status === 'serving' ? 'brand' : 'info'">{{ t.st[e.status] }}</NqBadge>
            </NqCardTitle>
            <NqCardDescription>{{ e.name ?? "" }}{{ e.room ? ` · ${t.room(e.room)}` : "" }}{{ e.recalls ? ` · ${t.recalled(e.recalls + 1)}` : "" }}</NqCardDescription>
          </NqCardHeader>
          <NqCardContent class="flex flex-wrap gap-2">
            <NqButton
              v-for="action in actionsFor(e)"
              :key="action.id"
              size="sm"
              :variant="action.id === 'start' || action.id === 'finish' ? 'primary' : 'secondary'"
              :disabled="busy"
              @click="action.onSelect()"
            >
              {{ action.label }}
            </NqButton>
          </NqCardContent>
        </NqCard>
      </template>
    </section>

    <NqDataTable :table="table" :label="t.table" :row-label="(e: QueueEntry) => t.rowLabel(e.ticket)" :row-actions="actionsFor">
      <template #empty>
        <span>{{ t.empty }}</span>
      </template>
    </NqDataTable>
    <p class="sr-only" aria-live="polite">{{ t.title }}: <NqNum :value="waiting.length" /></p>
  </div>
</template>
