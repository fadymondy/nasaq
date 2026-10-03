<script setup lang="ts">
import { Antenna, Globe, KeyRound, Pencil, RefreshCw, RotateCw, Send, Trash2, Webhook } from "lucide-vue-next";
import { computed, h, onBeforeUnmount, onMounted, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqAlert } from "../alert";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCard, NqCardAction, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { NqCopyField } from "../copy-button";
import {
  NqDataTable,
  NqDataTableFacetFilter,
  NqDataTablePagination,
  NqDataTableSearch,
  NqDataTableToolbar,
  useDataTable,
  type DataTableColumn,
  type DataTableRowAction,
} from "../data-table";
import { NqField, NqFieldLabel } from "../field";
import { NqDateTime, NqNum } from "../numeric";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqStatus } from "../status";
import { NqEmptyState } from "../states";
import { NqSwitch } from "../switch";
import { NqTabs, NqTabsIndicator, NqTabsList, NqTabsPanel, NqTabsTab } from "../tabs";
import NqConfirmDialog from "./NqConfirmDialog.vue";
import NqDeliveryDialog from "./NqDeliveryDialog.vue";
import NqEndpointDialog from "./NqEndpointDialog.vue";
import NqRevealDialog from "./NqRevealDialog.vue";
import { POLL_INTERVALS, canReplay, isSourceStale, maskSecret } from "./format";
import {
  useWebhooksStrings,
  type EndpointInput,
  type InboundSource,
  type PushEndpoint,
  type WebhookDelivery,
  type WebhookEndpoint,
  type WebhookEvent,
  type WebhooksConfirm,
  type WebhooksManagerLabels,
  type WebhooksManagerStrings,
  type WebhooksResult,
  type WebhooksSecretResult,
  type WebhookTestResult,
} from "./strings";
import { statusTone } from "./tones";

// Webhooks in one place: endpoints (URL, channel as text, events, enabled, masked signing secret) with a create and edit
// dialog, a per-endpoint test, secret rotation and a delete that asks first; a delivery log with endpoint and status
// filters, a detail dialog and replay; inbound sources with a poll interval, last status and Poll now; and a push
// endpoint card that shows its token once. A new or rotated secret is revealed once with a snippet for verifying the
// signature. Row actions also open on context-click.
const props = withDefaults(
  defineProps<{
    /** The events that can be subscribed to. */
    events: readonly WebhookEvent[];
    endpoints: readonly WebhookEndpoint[];
    deliveries?: readonly WebhookDelivery[];
    sources?: readonly InboundSource[];
    /** When set, a card shows the push endpoint and its token once. */
    pushEndpoint?: PushEndpoint | null;
    onDismissPush?: () => void;
    /** Creates or updates an endpoint. On create, return `{ secret }` to show it once. */
    onSaveEndpoint: (input: EndpointInput) => Promise<WebhooksSecretResult> | WebhooksSecretResult;
    onDeleteEndpoint: (id: string) => Promise<WebhooksResult> | WebhooksResult;
    onToggleEndpoint?: (id: string, enabled: boolean) => Promise<WebhooksResult> | WebhooksResult;
    /** Rotates the secret. Return `{ secret }` to show the new one once. */
    onRotateSecret?: (id: string) => Promise<WebhooksSecretResult> | WebhooksSecretResult;
    /** Sends a test event to one endpoint. */
    onTest?: (id: string) => Promise<WebhookTestResult> | WebhookTestResult;
    onReplay?: (deliveryId: string) => Promise<WebhooksResult> | WebhooksResult;
    onSetInterval?: (sourceId: string, seconds: number) => Promise<WebhooksResult> | WebhooksResult;
    onPollNow?: (sourceId: string) => Promise<WebhooksResult> | WebhooksResult;
    loading?: boolean;
    labels?: WebhooksManagerLabels;
    class?: HTMLAttributes["class"];
  }>(),
  {
    deliveries: () => [],
    sources: () => [],
    pushEndpoint: undefined,
    onDismissPush: undefined,
    onToggleEndpoint: undefined,
    onRotateSecret: undefined,
    onTest: undefined,
    onReplay: undefined,
    onSetInterval: undefined,
    onPollNow: undefined,
    loading: false,
    labels: undefined,
  },
);

const t = useWebhooksStrings(() => props.labels);

const failure = ref<string | null>(null);
const notice = ref<{ tone: "success" | "danger"; text: string } | null>(null);
const busy = ref<ReadonlySet<string>>(new Set());
let mounted = true;
onMounted(() => (mounted = true));
onBeforeUnmount(() => (mounted = false));

async function run<R>(key: string, task: () => Promise<R> | R): Promise<R | undefined> {
  failure.value = null;
  busy.value = new Set([...busy.value, key]);
  try {
    return await task();
  } catch {
    if (mounted) failure.value = t.value.genericError;
    return undefined;
  } finally {
    if (mounted) {
      const next = new Set(busy.value);
      next.delete(key);
      busy.value = next;
    }
  }
}
function fail(result: { error?: string } | void): boolean {
  if (result && result.error) {
    failure.value = result.error;
    return true;
  }
  return false;
}

const editing = ref<WebhookEndpoint | "new" | null>(null);
const reveal = ref<{ title: string; secret: string } | null>(null);
const confirm = ref<WebhooksConfirm | null>(null);
const detail = ref<WebhookDelivery | null>(null);
const endpointFilter = ref("all");

const endpointName = (id: string) => props.endpoints.find((e) => e.id === id)?.name ?? id;
const dash = () => h("span", { class: "text-muted-foreground" }, "—");

const endpointColumns = computed<DataTableColumn<WebhookEndpoint>[]>(() => {
  const s = t.value;
  return [
    {
      id: "endpoint",
      header: s.endpoint,
      label: s.endpoint,
      hideable: false,
      sortValue: (e) => e.name,
      searchValue: (e) => `${e.name} ${e.url} ${e.channel ?? ""}`,
      cell: (e) =>
        h("div", { class: "flex min-w-0 flex-col" }, [
          h("span", { dir: "auto", class: "truncate font-medium text-foreground" }, e.name),
          h("bdi", { dir: "ltr", class: "truncate text-start font-mono text-caption text-muted-foreground" }, e.url),
        ]),
    },
    { id: "channel", header: s.channel, label: s.channel, sortValue: (e) => e.channel ?? "", cell: (e) => (e.channel ? h(NqBadge, { variant: "tag" }, () => e.channel) : dash()) },
    {
      id: "events",
      header: s.events,
      label: s.events,
      sortValue: (e) => e.events.length,
      cell: (e) => (e.events.length > 0 && e.events.length === props.events.length ? s.allEvents : s.eventsCount(e.events.length)),
    },
    {
      id: "secret",
      header: s.secret,
      label: s.secret,
      defaultHidden: true,
      cell: (e) => h("bdi", { dir: "ltr", class: "font-mono text-code text-muted-foreground" }, maskSecret(e.secretLast4)),
    },
    {
      id: "last",
      header: s.lastDelivery,
      label: s.lastDelivery,
      sortValue: (e) => (e.lastDeliveryAt === undefined ? null : new Date(e.lastDeliveryAt)),
      cell: (e) =>
        e.lastDeliveryAt === undefined
          ? h("span", { class: "text-muted-foreground" }, s.never)
          : h("span", { class: "inline-flex items-center gap-2" }, [
              e.lastDeliveryStatus ? h(NqStatus, { tone: statusTone[e.lastDeliveryStatus] }, () => s.statuses[e.lastDeliveryStatus!]) : null,
              h(NqDateTime, { value: e.lastDeliveryAt, relative: true, class: "text-muted-foreground" }),
            ]),
    },
    {
      id: "enabled",
      header: s.enabled,
      label: s.enabled,
      sortValue: (e) => (e.enabled ? 1 : 0),
      cell: (e) =>
        props.onToggleEndpoint
          ? h(NqSwitch, {
              "aria-label": s.toggleLabel(e.name),
              modelValue: e.enabled,
              disabled: busy.value.has(e.id),
              "onUpdate:modelValue": (next: boolean) =>
                void run(e.id, async () => {
                  fail(await props.onToggleEndpoint!(e.id, next));
                }),
            })
          : h(NqBadge, { variant: e.enabled ? "success" : "outline" }, () => (e.enabled ? s.enabled : s.disabled)),
    },
  ];
});
const endpointTable = useDataTable({ data: () => props.endpoints as WebhookEndpoint[], columns: endpointColumns, getRowId: (e) => e.id, defaultSort: { id: "endpoint", direction: "asc" }, pageSize: 8 });

async function sendTest(e: WebhookEndpoint) {
  if (!props.onTest) return;
  notice.value = null;
  const result = await run(`test:${e.id}`, () => props.onTest!(e.id));
  if (!result || !mounted) return;
  const s = t.value;
  if (result.ok) notice.value = { tone: "success", text: s.testOk(e.name, String(result.code ?? 200), String(result.durationMs ?? 0)) };
  else notice.value = { tone: "danger", text: s.testFail(e.name, result.error ?? (result.code ? `HTTP ${result.code}` : "")) };
}

function endpointActions(e: WebhookEndpoint): DataTableRowAction[] {
  const s = t.value;
  const locked = busy.value.has(e.id) || busy.value.has(`test:${e.id}`);
  const list: DataTableRowAction[] = [];
  if (props.onTest) list.push({ id: "test", label: s.test, icon: Send, disabled: locked, group: "use", onSelect: () => void sendTest(e) });
  list.push({ id: "edit", label: s.editEndpoint, icon: Pencil, disabled: locked, group: "use", onSelect: () => (editing.value = e) });
  if (props.onRotateSecret) {
    list.push({
      id: "rotate",
      label: s.rotate,
      icon: KeyRound,
      disabled: locked,
      group: "secret",
      onSelect: () =>
        (confirm.value = {
          title: s.rotateTitle(e.name),
          body: s.rotateBody,
          confirm: s.rotateConfirm,
          danger: false,
          run: async () => {
            const result = await run(e.id, () => props.onRotateSecret!(e.id));
            if (!result) return;
            if (fail(result)) return;
            if (result.secret) reveal.value = { title: s.revealTitle, secret: result.secret };
          },
        }),
    });
  }
  list.push({
    id: "delete",
    label: s.delete,
    icon: Trash2,
    danger: true,
    disabled: locked,
    group: "danger",
    onSelect: () =>
      (confirm.value = {
        title: s.deleteTitle(e.name),
        body: s.deleteBody,
        confirm: s.delete,
        danger: true,
        run: async () => {
          const result = await run(e.id, () => props.onDeleteEndpoint(e.id));
          if (result) fail(result);
        },
      }),
  });
  return list;
}

const shownDeliveries = computed(() => (endpointFilter.value === "all" ? props.deliveries : props.deliveries.filter((d) => d.endpointId === endpointFilter.value)));

const deliveryColumns = computed<DataTableColumn<WebhookDelivery>[]>(() => {
  const s = t.value;
  return [
    { id: "status", header: s.status, label: s.status, sortValue: (d) => d.status, filterValue: (d) => d.status, cell: (d) => h(NqStatus, { tone: statusTone[d.status] }, () => s.statuses[d.status]) },
    {
      id: "event",
      header: s.event,
      label: s.event,
      hideable: false,
      sortValue: (d) => d.event,
      searchValue: (d) => `${d.event} ${endpointName(d.endpointId)}`,
      cell: (d) =>
        h("div", { class: "flex min-w-0 flex-col" }, [
          h("bdi", { dir: "ltr", class: "truncate text-start font-mono text-code text-foreground" }, d.event),
          h("span", { dir: "auto", class: "truncate text-caption text-muted-foreground" }, endpointName(d.endpointId)),
        ]),
    },
    {
      id: "response",
      header: s.response,
      label: s.response,
      sortValue: (d) => d.code ?? 0,
      cell: (d) => (d.code === undefined ? dash() : h(NqNum, { value: d.code, format: { useGrouping: false } })),
    },
    {
      id: "duration",
      header: s.duration,
      label: s.duration,
      align: "end",
      defaultHidden: true,
      sortValue: (d) => d.durationMs ?? -1,
      cell: (d) => (d.durationMs === undefined ? dash() : h("span", { class: "whitespace-nowrap" }, [h(NqNum, { value: d.durationMs }), ` ${s.ms}`])),
    },
    { id: "attempt", header: s.attempt, label: s.attempt, align: "end", defaultHidden: true, sortValue: (d) => d.attempt, cell: (d) => h(NqNum, { value: d.attempt }) },
    { id: "when", header: s.when, label: s.when, sortValue: (d) => new Date(d.at), cell: (d) => h(NqDateTime, { value: d.at, relative: true, class: "text-muted-foreground" }) },
  ];
});
const deliveryTable = useDataTable({ data: () => shownDeliveries.value as WebhookDelivery[], columns: deliveryColumns, getRowId: (d) => d.id, defaultSort: { id: "when", direction: "desc" }, pageSize: 10 });

async function replay(d: WebhookDelivery) {
  if (!props.onReplay) return;
  notice.value = null;
  const before = failure.value;
  const result = await run(d.id, () => props.onReplay!(d.id));
  if (result === undefined && failure.value && failure.value !== before) return;
  if (result && fail(result)) return;
  if (mounted) notice.value = { tone: "success", text: t.value.replayed(endpointName(d.endpointId)) };
}
async function replayFromDialog(d: WebhookDelivery) {
  await replay(d);
  detail.value = null;
}

function deliveryActions(d: WebhookDelivery): DataTableRowAction[] {
  const s = t.value;
  const list: DataTableRowAction[] = [{ id: "view", label: s.view, icon: Globe, group: "inspect", onSelect: () => (detail.value = d) }];
  if (props.onReplay) list.push({ id: "replay", label: s.replay, icon: RotateCw, disabled: !canReplay(d.status) || busy.value.has(d.id), group: "act", onSelect: () => void replay(d) });
  return list;
}

function intervalItems(current: number, s: WebhooksManagerStrings) {
  const list = POLL_INTERVALS.includes(current) ? [...POLL_INTERVALS] : [...POLL_INTERVALS, current].sort((a, b) => a - b);
  return list.map((sec) => ({ value: String(sec), label: s.intervals(sec) }));
}

const sourceColumns = computed<DataTableColumn<InboundSource>[]>(() => {
  const s = t.value;
  return [
    {
      id: "source",
      header: s.source,
      label: s.source,
      hideable: false,
      sortValue: (x) => x.name,
      searchValue: (x) => `${x.name} ${x.target ?? ""}`,
      cell: (x) =>
        h("div", { class: "flex min-w-0 flex-col" }, [
          h("span", { dir: "auto", class: "truncate font-medium text-foreground" }, x.name),
          x.target ? h("bdi", { dir: "ltr", class: "truncate text-start font-mono text-caption text-muted-foreground" }, x.target) : null,
        ]),
    },
    {
      id: "interval",
      header: s.interval,
      label: s.interval,
      sortValue: (x) => x.intervalSeconds,
      cell: (x) =>
        props.onSetInterval
          ? h(
              NqSelect,
              {
                modelValue: String(x.intervalSeconds),
                "onUpdate:modelValue": (v: string | number | null) => v !== null && v !== "" && void run(x.id, async () => fail(await props.onSetInterval!(x.id, Number(v)))),
              },
              () => [
                h(NqSelectTrigger, { "aria-label": s.intervalLabel(x.name), disabled: busy.value.has(x.id), class: "w-40" }, () => h(NqSelectValue)),
                h(NqSelectContent, null, () => intervalItems(x.intervalSeconds, s).map((o) => h(NqSelectItem, { key: o.value, value: o.value }, () => o.label))),
              ],
            )
          : s.intervals(x.intervalSeconds),
    },
    {
      id: "status",
      header: s.lastStatus,
      label: s.lastStatus,
      sortValue: (x) => x.lastStatus ?? "",
      cell: (x) => {
        if (!x.lastStatus) return h(NqStatus, { tone: "neutral" }, () => s.sourceNever);
        const stale = x.lastStatus === "ok" && isSourceStale(x.lastAt, x.intervalSeconds);
        return h("div", { class: "flex min-w-0 flex-col items-start gap-0.5" }, [
          h(NqStatus, { tone: x.lastStatus === "error" ? "danger" : stale ? "warning" : "success" }, () => (x.lastStatus === "error" ? s.sourceError : stale ? s.sourceStale : s.sourceOk)),
          x.lastStatus === "error" && x.lastError ? h("bdi", { dir: "ltr", class: "max-w-56 truncate text-start text-caption text-muted-foreground" }, x.lastError) : null,
        ]);
      },
    },
    {
      id: "last",
      header: s.lastPolled,
      label: s.lastPolled,
      sortValue: (x) => (x.lastAt === undefined ? null : new Date(x.lastAt)),
      cell: (x) => (x.lastAt === undefined ? dash() : h(NqDateTime, { value: x.lastAt, relative: true, class: "text-muted-foreground" })),
    },
  ];
});
const sourceTable = useDataTable({ data: () => props.sources as InboundSource[], columns: sourceColumns, getRowId: (x) => x.id, defaultSort: { id: "source", direction: "asc" }, pageSize: 8 });

function sourceActions(x: InboundSource): DataTableRowAction[] {
  const s = t.value;
  if (!props.onPollNow) return [];
  const key = `poll:${x.id}`;
  return [
    {
      id: "poll",
      label: busy.value.has(key) ? s.polling : s.pollNow,
      icon: RefreshCw,
      disabled: busy.value.has(key),
      onSelect: () =>
        void (async () => {
          notice.value = null;
          const result = await run(key, () => props.onPollNow!(x.id));
          if (result && fail(result)) return;
          if (mounted) notice.value = { tone: "success", text: t.value.polled(x.name) };
        })(),
    },
  ];
}

const endpointFilterItems = computed(() => [{ value: "all", label: t.value.allEndpoints }, ...props.endpoints.map((e) => ({ value: e.id, label: e.name }))]);
const statusFacet = computed(() => (["success", "failed", "pending"] as const).map((x) => ({ value: x, label: t.value.statuses[x] })));

async function saveEndpoint(input: EndpointInput) {
  const result = await props.onSaveEndpoint(input);
  if (result && result.error) return { error: result.error };
  if (result && result.secret) reveal.value = { title: t.value.revealTitle, secret: result.secret };
  return undefined;
}
</script>

<template>
  <div data-slot="webhooks-manager" :aria-busy="props.loading || undefined" :class="cn('flex w-full flex-col gap-6', props.class)">
    <header class="flex flex-col gap-1">
      <h2 class="text-h3 text-foreground">{{ t.title }}</h2>
      <p class="text-body-sm text-muted-foreground">{{ t.description }}</p>
    </header>

    <NqCard v-if="props.pushEndpoint" data-slot="webhooks-push" class="w-full">
      <NqCardHeader>
        <NqCardTitle as="h3">{{ t.pushTitle }}</NqCardTitle>
        <NqCardDescription>{{ t.pushBody }}</NqCardDescription>
      </NqCardHeader>
      <NqCardContent class="flex flex-col gap-3">
        <NqAlert tone="warning">{{ t.pushAlert }}</NqAlert>
        <NqField>
          <NqFieldLabel>{{ t.pushUrl }}</NqFieldLabel>
          <NqCopyField :value="props.pushEndpoint.url" :label="t.pushUrl" />
        </NqField>
        <NqField>
          <NqFieldLabel>{{ t.pushToken }}</NqFieldLabel>
          <NqCopyField :value="props.pushEndpoint.token" :label="t.pushToken" />
        </NqField>
        <div v-if="props.onDismissPush" class="flex justify-end">
          <NqButton variant="primary" @click="props.onDismissPush()">{{ t.pushDismiss }}</NqButton>
        </div>
      </NqCardContent>
    </NqCard>

    <NqAlert v-if="failure" tone="danger" dismissible :dismiss-label="t.dismiss" @dismiss="failure = null">{{ failure }}</NqAlert>
    <NqAlert v-if="notice" :tone="notice.tone" dismissible :dismiss-label="t.dismiss" @dismiss="notice = null">{{ notice.text }}</NqAlert>

    <NqTabs default-value="endpoints">
      <NqTabsList variant="underline" :aria-label="t.title">
        <NqTabsTab value="endpoints">{{ t.tabEndpoints }}</NqTabsTab>
        <NqTabsTab value="deliveries">{{ t.tabDeliveries }}</NqTabsTab>
        <NqTabsTab value="inbound">{{ t.tabInbound }}</NqTabsTab>
        <NqTabsIndicator />
      </NqTabsList>

      <NqTabsPanel value="endpoints" class="pt-4">
        <NqCard class="w-full">
          <NqCardHeader>
            <NqCardTitle as="h3">{{ t.endpointsTitle }}</NqCardTitle>
            <NqCardDescription>{{ t.endpointsDescription }}</NqCardDescription>
            <NqCardAction>
              <NqButton size="sm" variant="primary" @click="editing = 'new'">{{ t.addEndpoint }}</NqButton>
            </NqCardAction>
          </NqCardHeader>
          <NqCardContent class="flex flex-col gap-3">
            <NqDataTableToolbar>
              <NqDataTableSearch :table="endpointTable" :placeholder="t.search" />
            </NqDataTableToolbar>
            <NqDataTable :table="endpointTable" :label="t.endpointsTable" :row-label="(e: WebhookEndpoint) => e.name" :loading="props.loading" :row-actions="endpointActions">
              <template #empty><NqEmptyState :icon="Webhook" :title="t.endpointsEmpty" :description="t.endpointsEmptyBody" /></template>
            </NqDataTable>
            <NqDataTablePagination :table="endpointTable" />
          </NqCardContent>
        </NqCard>
      </NqTabsPanel>

      <NqTabsPanel value="deliveries" class="pt-4">
        <NqCard class="w-full">
          <NqCardHeader>
            <NqCardTitle as="h3">{{ t.deliveriesTitle }}</NqCardTitle>
            <NqCardDescription>{{ t.deliveriesDescription }}</NqCardDescription>
          </NqCardHeader>
          <NqCardContent class="flex flex-col gap-3">
            <NqDataTableToolbar>
              <NqDataTableSearch :table="deliveryTable" :placeholder="t.search" />
              <NqSelect :model-value="endpointFilter" @update:model-value="(v: string | number | null) => v !== null && (endpointFilter = String(v))">
                <NqSelectTrigger :aria-label="t.endpoint" class="w-48"><NqSelectValue /></NqSelectTrigger>
                <NqSelectContent>
                  <NqSelectItem v-for="o in endpointFilterItems" :key="o.value" :value="o.value">{{ o.label }}</NqSelectItem>
                </NqSelectContent>
              </NqSelect>
              <NqDataTableFacetFilter :table="deliveryTable" column="status" :title="t.status" :options="statusFacet" />
            </NqDataTableToolbar>
            <NqDataTable
              :table="deliveryTable"
              :label="t.deliveriesTable"
              :row-label="(d: WebhookDelivery) => `${d.event} ${endpointName(d.endpointId)}`"
              :loading="props.loading"
              :on-row-click="(d: WebhookDelivery) => (detail = d)"
              :row-actions="deliveryActions"
            >
              <template #empty><NqEmptyState :icon="Send" :title="t.deliveriesEmpty" /></template>
            </NqDataTable>
            <NqDataTablePagination :table="deliveryTable" />
          </NqCardContent>
        </NqCard>
      </NqTabsPanel>

      <NqTabsPanel value="inbound" class="pt-4">
        <NqCard class="w-full">
          <NqCardHeader>
            <NqCardTitle as="h3">{{ t.inboundTitle }}</NqCardTitle>
            <NqCardDescription>{{ t.inboundDescription }}</NqCardDescription>
          </NqCardHeader>
          <NqCardContent class="flex flex-col gap-3">
            <NqDataTable :table="sourceTable" :label="t.inboundTable" :row-label="(x: InboundSource) => x.name" :loading="props.loading" :row-actions="props.onPollNow ? sourceActions : undefined">
              <template #empty><NqEmptyState :icon="Antenna" :title="t.inboundEmpty" /></template>
            </NqDataTable>
            <NqDataTablePagination :table="sourceTable" />
          </NqCardContent>
        </NqCard>
      </NqTabsPanel>
    </NqTabs>

    <NqEndpointDialog :target="editing" :events="props.events" :t="t" :on-save="saveEndpoint" @close="editing = null" />
    <NqRevealDialog :reveal="reveal" :t="t" @close="reveal = null" />
    <NqDeliveryDialog
      :delivery="detail"
      :name="detail ? endpointName(detail.endpointId) : ''"
      :replayable="props.onReplay !== undefined"
      :busy="detail ? busy.has(detail.id) : false"
      :t="t"
      @close="detail = null"
      @replay="replayFromDialog"
    />
    <NqConfirmDialog :request="confirm" :cancel="t.cancel" @close="confirm = null" />
  </div>
</template>
