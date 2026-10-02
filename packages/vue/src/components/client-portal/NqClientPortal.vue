<script lang="ts">
import type { InvoiceSummary } from "../invoice-list";
import type { ContextMenuAction } from "../context-menu";
import type { DataTableRowAction } from "../data-table";
import type { PortalRequest, PortalTask, PortalWeek } from "./portal-logic";
import type { ClientPortalLabels, ClientPortalTab } from "./strings";

export interface PortalActivity {
  id: string;
  actor?: { name: string; avatar?: string };
  title: string;
  description?: string;
  /** ISO date-time. */
  at: string;
}

export interface PortalProject {
  name: string;
  /** The customer's company. */
  client?: string;
  summary?: string;
  /** ISO date. */
  due?: string;
}

export interface ClientPortalProps {
  project: PortalProject;
  /** The board, shown read only. Titles and status only: no internal notes. */
  tasks: readonly PortalTask[];
  /** Issues still open, as a number. The portal never lists internal issues. */
  openIssues?: number;
  requests: readonly PortalRequest[];
  /** Hours per week, from the time log. Individual entries are not shown. */
  weeks: readonly PortalWeek[];
  /** Hours the customer bought. 0 or missing means no budget. */
  budgetHours?: number;
  /** Every invoice; drafts are filtered out here, so a customer never sees an unsent invoice or its amount. */
  invoices: readonly InvoiceSummary[];
  /** ISO 4217 code for invoice amounts. */
  currency: string;
  activity: readonly PortalActivity[];
  /** Adds the "Ask for something" form. Reject to keep the text and show the message. */
  onRequest?: (input: { title: string; description: string }) => void | Promise<void>;
  onOpenInvoice?: (invoice: InvoiceSummary) => void;
  onPayInvoice?: (invoice: InvoiceSummary) => void;
  onDownloadInvoice?: (invoice: InvoiceSummary) => Promise<void>;
  /** Menus: context-click, long-press, Shift+F10 or the Menu key on a card, request, week or event. */
  taskActions?: (task: PortalTask) => ContextMenuAction[];
  requestActions?: (request: PortalRequest) => ContextMenuAction[];
  weekActions?: (week: PortalWeek) => DataTableRowAction[];
  activityActions?: (item: PortalActivity) => ContextMenuAction[];
  tab?: ClientPortalTab;
  defaultTab?: ClientPortalTab;
  onTabChange?: (tab: ClientPortalTab) => void;
  /** Weeks drawn in the overview chart. Default 8. */
  chartWeeks?: number;
  locale?: string;
  labels?: ClientPortalLabels;
  class?: string;
}
</script>

<script setup lang="ts">
import { computed, h, ref } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAvatar } from "../avatar";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardHeader, NqCardTitle } from "../card";
import { NqContextMenuActions } from "../context-menu";
import { NqDataTable, useDataTable, type DataTableColumn } from "../data-table";
import { NqField, NqFieldError, NqFieldLabel, NqInput, NqTextarea } from "../field";
import { NqInvoiceList } from "../invoice-list";
import { formatDate, formatNumber, type FormatDateOptions, type FormatNumberOptions } from "../numeric";
import { NqProgress } from "../progress";
import { NqStatCard, NqStatGrid } from "../stat-card";
import { NqEmptyState } from "../states";
import { NqStatus, type StatusTone } from "../status";
import { NqTabs, NqTabsList, NqTabsPanel, NqTabsTab } from "../tabs";
import { NqTimeline, NqTimelineItem } from "../timeline";
import { PORTAL_TASK_STATUSES, type PortalRequestStatus, portalBudget, portalPendingRequests, portalProgress, portalRing, portalTotalHours, portalVisibleInvoices, portalWeeksNewestFirst } from "./portal-logic";
import { STRINGS } from "./strings";

// What a customer sees of their project: a progress ring and hours against the budget, a read-only board, their
// requests (with a form to make one), hours per week, sent invoices and an activity feed. Aggregates only: no
// internal issues, no single time entries, no drafts.
const props = withDefaults(defineProps<ClientPortalProps>(), {
  openIssues: undefined,
  budgetHours: 0,
  onRequest: undefined,
  onOpenInvoice: undefined,
  onPayInvoice: undefined,
  onDownloadInvoice: undefined,
  taskActions: undefined,
  requestActions: undefined,
  weekActions: undefined,
  activityActions: undefined,
  tab: undefined,
  defaultTab: "overview",
  onTabChange: undefined,
  chartWeeks: 8,
  locale: undefined,
  labels: undefined,
  class: undefined,
});

const requestTone: Record<PortalRequestStatus, StatusTone> = { pending: "warning", accepted: "info", declined: "danger", done: "success" };

const nq = useNasaq();
const locale = computed(() => props.locale ?? nq.locale.value);
const t = computed(() => ({ ...STRINGS[locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }) as typeof STRINGS.en);
const num = (n: number, o?: FormatNumberOptions) => formatNumber(n, locale.value, o);
const hrs = (n: number) => num(n, { maximumFractionDigits: 1 });
const date = (d: string, o: FormatDateOptions) => formatDate(d, locale.value, o);

const inner = ref(props.defaultTab);
const current = computed(() => props.tab ?? inner.value);
function setTab(v: string | number) {
  const next = String(v) as keyof typeof STRINGS.en.tabs;
  inner.value = next;
  props.onTabChange?.(next);
}

const progress = computed(() => portalProgress(props.tasks));
const used = computed(() => portalTotalHours(props.weeks));
const budget = computed(() => portalBudget(props.budgetHours, used.value));
const pending = computed(() => portalPendingRequests(props.requests));
const visibleInvoices = computed(() => portalVisibleInvoices(props.invoices));
const recentWeeks = computed(() => portalWeeksNewestFirst(props.weeks).slice(0, props.chartWeeks).reverse());
const maxWeek = computed(() => Math.max(1, ...recentWeeks.value.map((w) => w.hours)));
const ring = computed(() => portalRing(progress.value.percent, 52));
const percentText = computed(() => num(progress.value.percent / 100, { style: "percent" }));
const sortedRequests = computed(() => [...props.requests].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
const sortedActivity = computed(() => [...props.activity].sort((a, b) => (a.at < b.at ? 1 : -1)));
const cardsOf = (s: string) => props.tasks.filter((x) => x.status === s);
const interactive = (actions: readonly unknown[] | undefined) => (actions && actions.length > 0 ? 0 : undefined);

const weekColumns = computed<DataTableColumn<{ week: string; hours: number }>[]>(() => [
  { id: "week", header: t.value.weekOf, sortValue: (w) => w.week, cell: (w) => date(w.week, { dateStyle: "medium" }) },
  { id: "hours", header: t.value.hours, align: "end", sortValue: (w) => w.hours, cell: (w) => h("span", { class: "tabular-nums" }, hrs(w.hours)) },
]);
const weekTable = useDataTable<{ week: string; hours: number }>({
  data: () => portalWeeksNewestFirst(props.weeks) as { week: string; hours: number }[],
  columns: () => weekColumns.value,
  getRowId: (w) => w.week,
});

// The request form.
const title = ref("");
const description = ref("");
const error = ref<string | null>(null);
const busy = ref(false);
const sent = ref(false);
async function submit() {
  if (!props.onRequest) return;
  sent.value = false;
  if (title.value.trim() === "") {
    error.value = t.value.titleRequired;
    return;
  }
  error.value = null;
  busy.value = true;
  try {
    await props.onRequest({ title: title.value.trim(), description: description.value.trim() });
    title.value = "";
    description.value = "";
    sent.value = true;
  } catch (err) {
    error.value = err instanceof Error && err.message ? err.message : t.value.titleRequired;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div data-slot="client-portal" :class="cn('flex w-full min-w-0 flex-col gap-5', props.class)">
    <slot name="header">
      <header class="flex flex-col gap-1">
        <p v-if="project.client" class="text-caption text-muted-foreground">{{ project.client }}</p>
        <h1 class="text-heading-lg font-semibold">{{ project.name }}</h1>
        <p v-if="project.summary" class="max-w-prose text-body-sm text-muted-foreground">{{ project.summary }}</p>
        <p v-if="project.due" class="text-caption text-muted-foreground">{{ t.due }}: {{ date(project.due, { dateStyle: "medium" }) }}</p>
      </header>
    </slot>

    <NqTabs :model-value="current" @update:model-value="setTab">
      <NqTabsList variant="underline" class="max-w-full overflow-x-auto">
        <NqTabsTab v-for="(label, k) in t.tabs" :key="k" :value="k">{{ label }}</NqTabsTab>
      </NqTabsList>

      <NqTabsPanel value="overview" class="flex flex-col gap-4 pt-4">
        <div class="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <NqCard>
            <NqCardHeader>
              <NqCardTitle as="h2">{{ t.progress }}</NqCardTitle>
            </NqCardHeader>
            <NqCardContent class="flex flex-wrap items-center gap-5">
              <div data-slot="portal-ring" class="relative size-36 shrink-0">
                <svg viewBox="0 0 120 120" role="img" :aria-label="`${percentText} ${t.percentDone}`" class="size-full -rotate-90">
                  <circle cx="60" cy="60" r="52" fill="none" stroke-width="10" class="stroke-muted" />
                  <circle cx="60" cy="60" r="52" fill="none" stroke-width="10" stroke-linecap="round" :stroke-dasharray="ring.circumference" :stroke-dashoffset="ring.offset" class="stroke-primary transition-[stroke-dashoffset] motion-reduce:transition-none" />
                </svg>
                <div aria-hidden="true" class="absolute inset-0 flex flex-col items-center justify-center">
                  <span class="text-heading-lg font-semibold tabular-nums">{{ percentText }}</span>
                  <span class="text-caption text-muted-foreground">{{ t.percentDone }}</span>
                </div>
              </div>
              <div class="flex min-w-0 flex-1 flex-col gap-2">
                <p class="text-body-sm">{{ t.tasksDone(progress.done, progress.total) }}</p>
                <ul class="flex flex-col gap-1 text-caption text-muted-foreground">
                  <li v-for="s in PORTAL_TASK_STATUSES" :key="s" class="flex justify-between gap-3">
                    <span>{{ t.columns[s] }}</span>
                    <span class="tabular-nums">{{ num(progress.byStatus[s]) }}</span>
                  </li>
                </ul>
              </div>
            </NqCardContent>
          </NqCard>
          <div class="flex min-w-0 flex-col gap-4">
            <NqStatGrid>
              <NqStatCard :label="t.hoursUsed"><template #value>{{ hrs(used) }}</template></NqStatCard>
              <NqStatCard :label="budget.budget > 0 ? t.hoursLeft : t.hoursBudget"><template #value>{{ budget.budget > 0 ? hrs(budget.remaining) : t.noBudget }}</template></NqStatCard>
              <NqStatCard :label="t.openIssues" :value="openIssues ?? 0" />
              <NqStatCard :label="t.pendingRequests" :value="pending" />
            </NqStatGrid>
            <NqProgress v-if="budget.budget > 0" :value="budget.percent" :tone="budget.tone" :aria-label="t.budgetUsed(hrs(used), hrs(budget.budget))" :label="budget.over ? t.overBudget : t.budgetUsed(hrs(used), hrs(budget.budget))" />
          </div>
        </div>
        <NqCard>
          <NqCardHeader>
            <NqCardTitle as="h2">{{ t.weekly }}</NqCardTitle>
          </NqCardHeader>
          <NqCardContent>
            <p v-if="recentWeeks.length === 0" class="text-body-sm text-muted-foreground">{{ t.noTime }}</p>
            <div v-else role="img" :aria-label="t.weeklyLabel(recentWeeks.length)" class="flex h-40 items-end gap-2">
              <div v-for="w in recentWeeks" :key="w.week" aria-hidden="true" class="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                <span class="text-caption tabular-nums text-muted-foreground">{{ hrs(w.hours) }}</span>
                <div class="w-full max-w-10 rounded-t-control bg-primary" :style="{ height: `${Math.max(4, (w.hours / maxWeek) * 100)}%` }" />
                <span class="w-full truncate text-center text-caption text-muted-foreground">{{ date(w.week, { month: "short", day: "numeric" }) }}</span>
              </div>
            </div>
          </NqCardContent>
        </NqCard>
      </NqTabsPanel>

      <NqTabsPanel value="board" class="flex flex-col gap-3 pt-4">
        <p class="text-caption text-muted-foreground">{{ t.boardNote }}</p>
        <div class="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <section v-for="s in PORTAL_TASK_STATUSES" :key="s" :aria-label="t.columns[s]" class="flex min-w-0 flex-col gap-2 rounded-card border border-border bg-muted/40 p-2">
            <h3 class="flex items-center justify-between px-1 text-label">
              <span>{{ t.columns[s] }}</span>
              <span class="text-caption tabular-nums text-muted-foreground">{{ num(cardsOf(s).length) }}</span>
            </h3>
            <ul class="flex flex-col gap-2">
              <li v-if="cardsOf(s).length === 0" class="px-1 py-3 text-caption text-muted-foreground">{{ t.noCards }}</li>
              <NqContextMenuActions v-for="c in cardsOf(s)" :key="c.id" as="li" :actions="taskActions?.(c) ?? []" data-slot="portal-task" :tabindex="interactive(taskActions?.(c))" class="flex flex-col gap-2 rounded-control border border-border bg-card p-3 text-body-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span>{{ c.title }}</span>
                <span class="flex items-center gap-2 text-caption text-muted-foreground">
                  <NqAvatar v-if="c.assignee" :name="c.assignee" size="sm" />
                  <span class="truncate">{{ c.assignee ?? t.unassigned }}</span>
                </span>
              </NqContextMenuActions>
            </ul>
          </section>
        </div>
      </NqTabsPanel>

      <NqTabsPanel value="requests" class="flex flex-col gap-4 pt-4">
        <form v-if="onRequest" data-slot="portal-request-form" novalidate class="flex w-full max-w-xl flex-col gap-3 rounded-card border border-border bg-card p-4" @submit.prevent="submit">
          <h2 class="text-heading-sm font-semibold">{{ t.newRequest }}</h2>
          <NqField :invalid="error !== null">
            <NqFieldLabel>{{ t.requestTitle }}</NqFieldLabel>
            <NqInput v-model="title" />
            <NqFieldError v-if="error" :match="true">{{ error }}</NqFieldError>
          </NqField>
          <NqField>
            <NqFieldLabel>{{ t.requestDetails }} {{ t.requestDetailsOptional }}</NqFieldLabel>
            <NqTextarea v-model="description" />
          </NqField>
          <div class="flex items-center gap-3">
            <NqButton type="submit" :loading="busy">{{ t.send }}</NqButton>
            <span v-if="sent" role="status" class="text-body-sm text-muted-foreground">{{ t.sent }}</span>
          </div>
        </form>
        <h2 class="text-heading-sm font-semibold">{{ t.requests }}</h2>
        <NqEmptyState v-if="requests.length === 0" :title="t.noRequests" :description="t.noRequestsBody" />
        <ul v-else class="flex w-full flex-col gap-2">
          <NqContextMenuActions v-for="r in sortedRequests" :key="r.id" as="li" :actions="requestActions?.(r) ?? []" data-slot="portal-request" :tabindex="interactive(requestActions?.(r))" class="flex flex-col gap-1 rounded-card border border-border bg-card p-3 outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="font-medium">{{ r.title }}</span>
              <NqStatus :tone="requestTone[r.status]">{{ t.requestStatus[r.status] }}</NqStatus>
            </div>
            <p v-if="r.description" class="text-body-sm text-muted-foreground">{{ r.description }}</p>
            <p v-if="r.reply" class="text-body-sm">{{ r.reply }}</p>
            <p class="text-caption text-muted-foreground">{{ r.by ? `${t.by} ${r.by} · ` : "" }}{{ date(r.createdAt, { dateStyle: "medium" }) }}</p>
          </NqContextMenuActions>
        </ul>
      </NqTabsPanel>

      <NqTabsPanel value="time" class="pt-4">
        <div class="flex w-full flex-col gap-4">
          <NqStatGrid>
            <NqStatCard :label="t.total"><template #value>{{ hrs(used) }}</template></NqStatCard>
            <NqStatCard :label="t.hoursBudget"><template #value>{{ budget.budget > 0 ? hrs(budget.budget) : t.noBudget }}</template></NqStatCard>
            <NqStatCard :label="t.hoursLeft"><template #value>{{ budget.budget > 0 ? hrs(budget.remaining) : "—" }}</template></NqStatCard>
          </NqStatGrid>
          <NqProgress v-if="budget.budget > 0" :value="budget.percent" :tone="budget.tone" :aria-label="t.budgetUsed(hrs(used), hrs(budget.budget))" />
          <NqDataTable
            :table="weekTable"
            :label="t.weeksTable"
            :row-label="(w) => `${t.weekOf} ${date(w.week, { dateStyle: 'medium' })}`"
            :row-actions="weekActions ? (w) => weekActions!(w as never) : undefined"
          >
            <template #empty>{{ t.noTime }}</template>
          </NqDataTable>
        </div>
      </NqTabsPanel>

      <NqTabsPanel value="invoices" class="pt-4">
        <NqEmptyState v-if="visibleInvoices.length === 0" :title="t.noInvoices" :description="t.noInvoicesBody" />
        <NqInvoiceList v-else :invoices="visibleInvoices" :currency="currency" :on-open="onOpenInvoice" :on-pay="onPayInvoice" :on-download="onDownloadInvoice" />
      </NqTabsPanel>

      <NqTabsPanel value="activity" class="pt-4">
        <NqEmptyState v-if="activity.length === 0" :title="t.noActivity" />
        <NqTimeline v-else>
          <NqContextMenuActions v-for="a in sortedActivity" :key="a.id" :as="NqTimelineItem" :actions="activityActions?.(a) ?? []" :actor="a.actor" :title="a.title" :description="a.description" :time="a.at" :tabindex="interactive(activityActions?.(a))" />
        </NqTimeline>
      </NqTabsPanel>
    </NqTabs>
  </div>
</template>
