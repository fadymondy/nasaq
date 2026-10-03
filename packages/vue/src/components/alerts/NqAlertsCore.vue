<script setup lang="ts">
import { Bell, Search } from "lucide-vue-next";
import { computed, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqInput } from "../field";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqEmptyState, NqSkeleton } from "../states";
import { NqTabs, NqTabsList, NqTabsTab } from "../tabs";
import { countAlerts, filterAlerts, SEVERITIES, sortAlerts, sourcesOf, type AlertSeverity, type AlertSort, type AlertStatus } from "./alerts-format";
import NqAlertRow from "./NqAlertRow.vue";
import { alertsStrings, type AlertAction, type AlertsLabels } from "./strings";
import type { AlertItem, AlertResult } from "./types";

// Shared by NqAlertList and NqSecurityAlerts: tabs, filters, search, sort and the rows.
interface Props {
  alerts: AlertItem[];
  loading?: boolean;
  defaultStatus?: AlertStatus | "all";
  defaultSort?: AlertSort;
  onAcknowledge?: (id: string) => Promise<AlertResult>;
  onResolve?: (id: string) => Promise<AlertResult>;
  onReopen?: (id: string) => Promise<AlertResult>;
  hideFilters?: boolean;
  title?: string;
  labels?: Partial<AlertsLabels>;
  isSecurity?: boolean;
  extraSearch?: (a: AlertItem) => (string | undefined)[];
  actions?: AlertAction[];
  onAction?: (actionId: string, alertId: string) => Promise<AlertResult>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { loading: false, defaultStatus: "open", defaultSort: "severity", hideFilters: false, isSecurity: false });

const nq = useNasaq();
const t = computed(() => alertsStrings(nq.locale.value, props.labels));
const status = ref<AlertStatus | "all">(props.defaultStatus);
const severity = ref<AlertSeverity | "all">("all");
const source = ref("all");
const sort = ref<AlertSort>(props.defaultSort);
const query = ref("");
const headingId = `nq-alerts-${useId()}`;

const counts = computed(() => countAlerts(props.alerts));
const sources = computed(() => sourcesOf(props.alerts));
const visible = computed(() => sortAlerts(filterAlerts(props.alerts, { query: query.value, severity: severity.value, status: status.value, source: source.value }, props.extraSearch), sort.value));
const filtered = computed(() => query.value.trim() !== "" || severity.value !== "all" || source.value !== "all");

const sevItems = computed(() => [{ value: "all", label: t.value.allSeverities }, ...SEVERITIES.map((s) => ({ value: s, label: t.value.severity[s] }))]);
const srcItems = computed(() => [{ value: "all", label: t.value.allSources }, ...sources.value.map((s) => ({ value: s, label: s }))]);
const sortItems = computed(() => (["severity", "newest"] as const).map((s) => ({ value: s, label: t.value.sort[s] })));
const statuses = ["all", "open", "acknowledged", "resolved"] as const;

function clear() {
  query.value = "";
  severity.value = "all";
  source.value = "all";
  status.value = "all";
}
</script>

<template>
  <section :data-slot="props.isSecurity ? 'security-alerts' : 'alert-list'" :aria-labelledby="headingId" :class="cn('flex flex-col gap-4', props.class)">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 :id="headingId" class="text-heading-sm text-foreground">
        <slot name="title">{{ props.title ?? (props.isSecurity ? t.securityTitle : t.title) }}</slot>
      </h2>
      <p class="text-caption text-muted-foreground" aria-live="polite">{{ t.shown(visible.length, props.alerts.length) }}</p>
    </div>

    <NqTabs v-model="status">
      <NqTabsList variant="underline" :aria-label="t.label">
        <NqTabsTab v-for="s in statuses" :key="s" :value="s">
          {{ t.status[s] }}
          <NqBadge variant="outline"><bdi dir="ltr">{{ s === "all" ? counts.total : counts.byStatus[s] }}</bdi></NqBadge>
        </NqTabsTab>
      </NqTabsList>
    </NqTabs>

    <div v-if="!props.hideFilters" class="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_11rem_11rem_12rem]">
      <div class="relative sm:col-span-2 lg:col-span-1">
        <Search aria-hidden="true" class="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <NqInput v-model="query" type="search" :aria-label="t.search" :placeholder="t.searchPlaceholder" class="ps-9" />
      </div>
      <NqSelect v-model="severity">
        <NqSelectTrigger :aria-label="t.severityFilter"><NqSelectValue /></NqSelectTrigger>
        <NqSelectContent>
          <NqSelectItem v-for="o in sevItems" :key="o.value" :value="o.value">{{ o.label }}</NqSelectItem>
        </NqSelectContent>
      </NqSelect>
      <NqSelect v-model="source">
        <NqSelectTrigger :aria-label="t.sourceFilter"><NqSelectValue /></NqSelectTrigger>
        <NqSelectContent>
          <NqSelectItem v-for="o in srcItems" :key="o.value" :value="o.value">{{ o.label }}</NqSelectItem>
        </NqSelectContent>
      </NqSelect>
      <NqSelect v-model="sort">
        <NqSelectTrigger :aria-label="t.sortLabel"><NqSelectValue /></NqSelectTrigger>
        <NqSelectContent>
          <NqSelectItem v-for="o in sortItems" :key="o.value" :value="o.value">{{ o.label }}</NqSelectItem>
        </NqSelectContent>
      </NqSelect>
    </div>

    <div v-if="props.loading" role="status" :aria-label="t.loading" class="flex flex-col gap-3">
      <NqSkeleton v-for="n in 3" :key="n" class="h-24 w-full rounded-card" />
    </div>
    <NqEmptyState v-else-if="visible.length === 0" :icon="Bell" :title="t.emptyTitle" :description="props.alerts.length === 0 ? t.emptyAll : t.emptyBody">
      <template v-if="filtered || status !== 'all'" #actions>
        <NqButton type="button" variant="secondary" size="sm" @click="clear">{{ t.clear }}</NqButton>
      </template>
    </NqEmptyState>
    <ul v-else class="m-0 flex list-none flex-col gap-3 p-0">
      <NqAlertRow
        v-for="a in visible"
        :key="a.id"
        :alert="a"
        :t="t"
        :actions="props.actions"
        :on-acknowledge="props.onAcknowledge"
        :on-resolve="props.onResolve"
        :on-reopen="props.onReopen"
        :on-action="props.onAction"
      >
        <template v-if="$slots.extra" #extra="{ alert }"><slot name="extra" :alert="alert" /></template>
      </NqAlertRow>
    </ul>
  </section>
</template>
