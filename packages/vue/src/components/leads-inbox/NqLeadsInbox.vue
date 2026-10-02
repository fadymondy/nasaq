<script setup lang="ts">
import { ArrowRight, Ban, Inbox, UserPlus } from "lucide-vue-next";
import { computed, h, ref } from "vue";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import type { DataTableColumn, DataTableRowAction } from "../data-table";
import { NqActivityCell, NqCardMeta, NqEntityIdentity, NqEntityList, type EntityListView } from "../entity-list";
import type { CannedSnippet } from "../inbox";
import { NqNum } from "../numeric";
import { NqScoreBadge } from "../score-explainer";
import { NqEmptyState } from "../states";
import { canConvertLead, canMoveLead, classifyLeadSource, LEAD_PIPELINE, LEAD_STATUSES, leadStatusCounts, type LeadStatus } from "./leads-inbox-logic";
import NqLeadConvertDialog from "./NqLeadConvertDialog.vue";
import NqLeadDetail from "./NqLeadDetail.vue";
import NqLeadSourceBadge from "./NqLeadSourceBadge.vue";
import NqLeadStatusBadge from "./NqLeadStatusBadge.vue";
import { leadsInboxWords, type LeadsInboxLabelOverrides } from "./strings";
import type { Lead, LeadActionResult, LeadConversion } from "./types";

// Inquiries from your forms with where each came from (UTM, referrer, Google click id), a stage pipeline with counts,
// a detail panel with reply and canned replies, and conversion into a CRM contact. Built on NqEntityList, so every
// row's actions also open from a context menu. You own the data: the callbacks are async, you send back new `leads`.
const props = withDefaults(defineProps<{
  leads: Lead[];
  /** Saved replies for the composer's bolt menu. */
  canned?: readonly CannedSnippet[];
  /** Move a lead to a stage by hand. Never called with `converted`. */
  onStatusChange?: (lead: Lead, status: LeadStatus) => Promise<LeadActionResult>;
  /** Turn a lead into a contact (and optionally a company and deal). Return it with `status: "converted"` afterwards. */
  onConvert?: (lead: Lead, conversion: LeadConversion) => Promise<LeadActionResult>;
  /** Omit to hide the composer. */
  onReply?: (lead: Lead, message: string) => Promise<LeadActionResult>;
  /** Start with this lead's detail open. */
  defaultOpenId?: string;
  label?: string;
  labels?: LeadsInboxLabelOverrides;
  /** The list's own props. */
  loading?: boolean;
  error?: string | boolean;
  onRetry?: () => void;
  view?: EntityListView;
  defaultView?: EntityListView;
  views?: EntityListView[];
  pageSize?: number;
  contextMenu?: boolean;
  cardMinWidth?: number;
}>(), { contextMenu: true, loading: false, error: undefined, view: undefined, defaultView: undefined, views: undefined, pageSize: undefined, cardMinWidth: undefined });
defineSlots<{ empty?: () => unknown }>();

const nq = useNasaq();
const t = computed(() => leadsInboxWords(nq.locale.value, props.labels));
const stage = ref<LeadStatus | "all">("all");
const openId = ref<string | null>(props.defaultOpenId ?? null);
const converting = ref<string | null>(null);
// The last non-null target, so the dialog keeps its content while it animates out.
const heldTarget = ref<Lead | null>(null);
const counts = computed(() => leadStatusCounts(props.leads));
const shown = computed(() => (stage.value === "all" ? props.leads : props.leads.filter((l) => l.status === stage.value)));
const open = computed(() => props.leads.find((l) => l.id === openId.value) ?? null);
const target = computed(() => props.leads.find((l) => l.id === converting.value) ?? null);
const tabs = computed<(LeadStatus | "all")[]>(() => ["all", ...LEAD_STATUSES]);

function startConvert(id: string) {
  converting.value = id;
  heldTarget.value = props.leads.find((l) => l.id === id) ?? null;
}

const columns = computed<DataTableColumn<Lead>[]>(() => {
  const s = t.value;
  return [
    {
      id: "lead",
      header: s.lead,
      hideable: false,
      cell: (l) => h(NqEntityIdentity, { avatarName: l.name }, { default: () => l.name, subtitle: () => l.company ?? l.email }),
      sortValue: (l) => l.name,
      searchValue: (l) => `${l.name} ${l.email ?? ""} ${l.company ?? ""} ${l.message ?? ""} ${l.attribution?.utmCampaign ?? ""} ${l.attribution?.utmSource ?? ""}`,
      className: "min-w-52",
    },
    { id: "source", header: s.source, cell: (l) => h(NqLeadSourceBadge, { attribution: l.attribution, labels: s }), sortValue: (l) => classifyLeadSource(l.attribution).kind, className: "min-w-44" },
    { id: "stage", header: s.stage, cell: (l) => h(NqLeadStatusBadge, { status: l.status, labels: s }), sortValue: (l) => LEAD_STATUSES.indexOf(l.status) },
    { id: "score", header: s.score, cell: (l) => (l.score ? h(NqScoreBadge, { ...l.score }) : "—"), sortValue: (l) => l.score?.score, align: "end" },
    { id: "received", header: s.received, cell: (l) => h(NqActivityCell, { value: l.receivedAt }), sortValue: (l) => new Date(l.receivedAt), align: "end" },
  ];
});

const rowActions = (l: Lead): DataTableRowAction[] => [
  { id: "open", label: t.value.open, icon: Inbox, onSelect: () => (openId.value = l.id) },
  ...(props.onConvert && canConvertLead(l.status) ? [{ id: "convert", label: t.value.convert, icon: UserPlus, onSelect: () => startConvert(l.id) }] : []),
  ...(props.onStatusChange
    ? [
        ...LEAD_PIPELINE.filter((s) => s !== "converted" && canMoveLead(l.status, s)).map((s) => ({
          id: `move-${s}`,
          label: t.value.moveTo(t.value.statuses[s]),
          icon: ArrowRight,
          group: "stage",
          onSelect: () => void props.onStatusChange!(l, s),
        })),
        ...(l.status !== "converted"
          ? [{ id: "spam", label: l.status === "spam" ? t.value.notSpam : t.value.markSpam, icon: Ban, danger: l.status !== "spam", group: "danger", onSelect: () => void props.onStatusChange!(l, l.status === "spam" ? "new" : "spam") }]
          : []),
      ]
    : []),
];
</script>

<template>
  <div data-slot="leads-inbox" class="flex min-w-0 flex-col gap-3">
    <div role="group" :aria-label="t.pipeline" class="flex flex-wrap gap-2">
      <NqButton v-for="s in tabs" :key="s" size="sm" :variant="stage === s ? 'primary' : 'secondary'" :aria-pressed="stage === s" @click="stage = s">
        {{ s === "all" ? t.all : t.statuses[s] }}
        <NqNum :value="counts[s]" class="ms-1.5 opacity-80" />
      </NqButton>
    </div>

    <NqEntityList
      :data="shown"
      :columns="columns"
      :get-row-id="(l: Lead) => l.id"
      :row-label="(l: Lead) => l.name"
      :label="props.label ?? t.label"
      :search-placeholder="t.search"
      :selectable="false"
      :default-sort="{ id: 'received', direction: 'desc' }"
      :on-row-click="(l: Lead) => (openId = l.id)"
      :row-actions="rowActions"
      :loading="props.loading"
      :error="props.error"
      :view="props.view"
      :default-view="props.defaultView"
      :views="props.views"
      :page-size="props.pageSize"
      :context-menu="props.contextMenu"
      :on-retry="props.onRetry"
      :card-min-width="props.cardMinWidth"
    >
      <template #card="{ row: l }">
        <div class="flex min-w-0 flex-col gap-2">
          <div class="flex items-start justify-between gap-2">
            <NqEntityIdentity :avatar-name="l.name">
              {{ l.name }}
              <template #subtitle>{{ l.company ?? l.email }}</template>
            </NqEntityIdentity>
            <NqLeadStatusBadge :status="l.status" :labels="t" />
          </div>
          <span v-if="l.message" dir="auto" class="line-clamp-2 text-body-sm text-muted-foreground">{{ l.message }}</span>
          <NqCardMeta :label="t.source"><NqLeadSourceBadge :attribution="l.attribution" :labels="t" /></NqCardMeta>
          <NqCardMeta :label="t.received"><NqActivityCell :value="l.receivedAt" /></NqCardMeta>
        </div>
      </template>
      <template #empty><slot name="empty"><NqEmptyState :icon="Inbox" :title="t.empty" :description="t.emptyHint" class="border-0" /></slot></template>
    </NqEntityList>

    <NqLeadDetail
      v-if="open"
      :key="open.id"
      :lead="open"
      :t="t"
      :canned="props.canned"
      :on-status-change="props.onStatusChange"
      :on-convert="props.onConvert"
      :on-reply="props.onReply"
      @close="openId = null"
      @start-convert="startConvert(open.id)"
    />
    <NqLeadConvertDialog
      v-if="props.onConvert"
      :lead="target"
      :t="t"
      :on-convert="(c: LeadConversion) => props.onConvert!(heldTarget!, c)"
      @close="converting = null"
    />
  </div>
</template>
