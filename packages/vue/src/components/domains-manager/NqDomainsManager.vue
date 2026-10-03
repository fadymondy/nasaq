<script setup lang="ts">
import { Globe, Plus, RefreshCw, Star, Trash2 } from "lucide-vue-next";
import { computed, h, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import {
  NqAlertDialog,
  NqAlertDialogAction,
  NqAlertDialogCancel,
  NqAlertDialogContent,
  NqAlertDialogDescription,
  NqAlertDialogFooter,
  NqAlertDialogHeader,
  NqAlertDialogTitle,
} from "../alert-dialog";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { NqCopyButton } from "../copy-button";
import { NqDataTable, useDataTable, type DataTableColumn, type DataTableRowAction } from "../data-table";
import { NqField, NqFieldError, NqFieldLabel, NqInput } from "../field";
import { NqDateTime } from "../numeric";
import { NqStatus, type StatusTone } from "../status";
import { isValidHostname, normalizeHost, summarizeDomains, type DomainCheck } from "./format";
import { DOMAINS_STRINGS, type DomainsManagerLabels } from "./strings";
import type { DomainRecord, DomainsResult } from "./types";

// Custom domains for a site: add a domain, see whether its DNS check passed, check again, make one primary and
// remove one (with a confirm). Row actions also open on context-click. Presentational: your callbacks talk to the
// server and you pass the updated `domains` back.
const props = withDefaults(
  defineProps<{
    domains: readonly DomainRecord[];
    /** The CNAME target people must point their domain at. Shown with a copy button. */
    cnameTarget?: string;
    loading?: boolean;
    /** Add a domain (already normalised). Resolve `{ error }` to show it under the field. */
    onAdd: (host: string) => Promise<DomainsResult>;
    onRemove: (id: string) => Promise<DomainsResult>;
    /** Run the DNS check again. The host then updates `check`. */
    onRecheck: (id: string) => Promise<DomainsResult>;
    /** Shows "Make primary" when set. */
    onMakePrimary?: (id: string) => Promise<DomainsResult>;
    labels?: DomainsManagerLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { cnameTarget: undefined, loading: false, onMakePrimary: undefined, labels: undefined },
);

const nasaq = useNasaq();
const t = computed(() => ({ ...DOMAINS_STRINGS[nasaq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
const value = ref("");
const error = ref<string | null>(null);
const adding = ref(false);
const notice = ref<string | null>(null);
const removing = ref<DomainRecord | null>(null);
const summary = computed(() => summarizeDomains(props.domains));

async function submit() {
  const host = normalizeHost(value.value);
  if (!isValidHostname(host)) {
    error.value = t.value.invalid;
    return;
  }
  if (props.domains.some((d) => d.host === host)) {
    error.value = t.value.duplicate;
    return;
  }
  adding.value = true;
  error.value = null;
  try {
    const result = await props.onAdd(host);
    if (result && result.error) error.value = result.error;
    else value.value = "";
  } catch {
    error.value = t.value.genericError;
  } finally {
    adding.value = false;
  }
}

async function run(fn: () => Promise<DomainsResult>) {
  notice.value = null;
  try {
    const result = await fn();
    if (result && result.error) notice.value = result.error;
  } catch {
    notice.value = t.value.genericError;
  }
}

const checkTone: Record<DomainCheck, StatusTone> = { verified: "success", pending: "warning", checking: "info", failed: "danger" };

const columns = computed<DataTableColumn<DomainRecord>[]>(() => {
  const tt = t.value;
  return [
    {
      id: "domain",
      header: tt.cols.domain,
      label: tt.cols.domain,
      sortValue: (d) => d.host,
      searchValue: (d) => d.host,
      cell: (d) =>
        h("span", { class: "flex flex-wrap items-center gap-2" }, [
          h(Globe, { "aria-hidden": "true", class: "size-4 shrink-0 text-muted-foreground" }),
          h("bdi", { dir: "ltr", class: "font-mono text-body-sm" }, d.host),
          d.primary ? h(NqBadge, { variant: "brand" }, () => tt.primary) : null,
        ]),
    },
    {
      id: "status",
      header: tt.cols.status,
      label: tt.cols.status,
      sortValue: (d) => d.check,
      cell: (d) =>
        h("span", { class: "grid gap-0.5" }, [
          h(NqStatus, { tone: checkTone[d.check] }, () => tt.checks[d.check]),
          d.error && d.check === "failed" ? h("span", { class: "text-caption text-nq-danger-text" }, d.error) : null,
        ]),
    },
    {
      id: "added",
      header: tt.cols.added,
      label: tt.cols.added,
      sortValue: (d) => (d.addedAt ? new Date(d.addedAt) : null),
      cell: (d) => (d.addedAt ? h(NqDateTime, { value: d.addedAt, relative: true, class: "text-muted-foreground" }) : null),
      className: "max-sm:hidden",
      headerClassName: "max-sm:hidden",
    },
  ];
});
const table = useDataTable({ data: () => [...props.domains], columns, getRowId: (d) => d.id });

function actions(d: DomainRecord): DataTableRowAction[] {
  return [
    { id: "recheck", label: t.value.recheck, icon: RefreshCw, group: "check", disabled: d.check === "checking", onSelect: () => void run(() => props.onRecheck(d.id)) },
    ...(props.onMakePrimary && !d.primary
      ? [{ id: "primary", label: t.value.makePrimary, icon: Star, group: "check", disabled: d.check !== "verified", onSelect: () => void run(() => props.onMakePrimary!(d.id)) }]
      : []),
    { id: "remove", label: t.value.remove, icon: Trash2, group: "danger", danger: true, onSelect: () => (removing.value = d) },
  ];
}

function confirmRemove() {
  if (!removing.value) return;
  const id = removing.value.id;
  removing.value = null;
  void run(() => props.onRemove(id));
}
</script>

<template>
  <NqCard data-slot="domains-manager" :class="cn('w-full', props.class)">
    <NqCardHeader>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <NqCardTitle as="h3">{{ t.title }}</NqCardTitle>
        <NqBadge v-if="summary.total" :variant="summary.verified === summary.total ? 'success' : 'warning'">{{ t.summary(summary.verified, summary.total) }}</NqBadge>
      </div>
      <NqCardDescription>{{ t.description }}</NqCardDescription>
    </NqCardHeader>
    <NqCardContent class="grid gap-4">
      <form novalidate class="flex flex-wrap items-start gap-2" data-slot="domains-add" @submit.prevent="submit">
        <NqField :invalid="Boolean(error)" class="min-w-56 flex-1">
          <NqFieldLabel class="sr-only">{{ t.addLabel }}</NqFieldLabel>
          <NqInput
            v-model="value"
            ltr
            placeholder="shop.example.com"
            :aria-label="t.addLabel"
            @update:model-value="error = null"
          />
          <NqFieldError v-if="error" :match="true">{{ error }}</NqFieldError>
          <p v-else class="mt-1 text-caption text-muted-foreground">{{ t.addHint }}</p>
        </NqField>
        <NqButton type="submit" variant="primary" :loading="adding">
          <Plus aria-hidden="true" />
          {{ t.add }}
        </NqButton>
      </form>
      <div
        v-if="props.cnameTarget"
        class="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-control border border-border bg-secondary/40 px-3 py-2 text-body-sm"
        data-slot="domains-setup"
      >
        <span class="min-w-0 flex-1">
          <span class="text-label text-foreground">{{ t.setup }}. </span>
          <span class="text-muted-foreground">{{ t.setupBody }}</span>
        </span>
        <span class="inline-flex items-center gap-1">
          <bdi dir="ltr" class="font-mono text-body-sm">{{ props.cnameTarget }}</bdi>
          <NqCopyButton :value="props.cnameTarget" size="icon-sm" variant="ghost" :label="t.copyTarget" />
        </span>
      </div>
      <NqAlert v-if="notice" tone="danger" dismissible @dismiss="notice = null">{{ notice }}</NqAlert>
      <NqDataTable :table="table" :label="t.table" :row-label="(d: DomainRecord) => d.host" :row-actions="actions" :loading="props.loading" :labels="{ empty: t.empty }" />
    </NqCardContent>

    <NqAlertDialog :open="removing !== null" @update:open="(o: boolean) => !o && (removing = null)">
      <NqAlertDialogContent>
        <template v-if="removing">
          <NqAlertDialogHeader>
            <NqAlertDialogTitle>{{ t.removeTitle(removing.host) }}</NqAlertDialogTitle>
            <NqAlertDialogDescription>{{ t.removeBody }}</NqAlertDialogDescription>
          </NqAlertDialogHeader>
          <NqAlertDialogFooter>
            <NqAlertDialogCancel>{{ t.cancel }}</NqAlertDialogCancel>
            <NqAlertDialogAction @click="confirmRemove">{{ t.remove }}</NqAlertDialogAction>
          </NqAlertDialogFooter>
        </template>
      </NqAlertDialogContent>
    </NqAlertDialog>
  </NqCard>
</template>
