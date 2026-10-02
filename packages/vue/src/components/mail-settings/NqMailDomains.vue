<script setup lang="ts">
import { Mail, MailPlus, Plus, ShieldCheck, Trash2 } from "lucide-vue-next";
import { computed, h, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqAlertDialog, NqAlertDialogCancel, NqAlertDialogContent, NqAlertDialogDescription, NqAlertDialogFooter, NqAlertDialogHeader, NqAlertDialogTitle } from "../alert-dialog";
import { NqButton } from "../button";
import { NqCard, NqCardAction, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { NqDataTable, NqDataTablePagination, useDataTable, type DataTableColumn, type DataTableRowAction } from "../data-table";
import { NqField, NqFieldLabel } from "../field";
import { NqDateTime } from "../numeric";
import { NqMeter } from "../progress";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqEmptyState } from "../states";
import { NqStatus, type StatusTone } from "../status";
import NqAliasDialog from "./NqAliasDialog.vue";
import NqMailboxDialog from "./NqMailboxDialog.vue";
import NqMailDnsRow from "./NqMailDnsRow.vue";
import { DNS_KINDS, domainHealth, formatMegabytes, quotaFraction } from "./mail-format";
import { STRINGS, type MailSettingsLabels } from "./strings";
import type { AliasInput, MailAlias, MailboxInput, MailDomain, Mailbox, MailResult } from "./types";

// Mail domains: pick a domain and see an SPF, DKIM and DMARC checklist (expected record, what DNS returned, with copy
// fields and a check again button), its mailboxes with quota use, and its aliases. Adding and removing is through
// callbacks; removals ask first. The host does the DNS lookups and passes the statuses back.
interface Props {
  domains: readonly MailDomain[];
  /** Domain shown first. Default the first one. */
  defaultDomainId?: string;
  onRecheck: (domainId: string) => Promise<MailResult> | MailResult;
  onAddMailbox: (domainId: string, input: MailboxInput) => Promise<MailResult> | MailResult;
  onRemoveMailbox: (domainId: string, id: string) => Promise<MailResult> | MailResult;
  onAddAlias: (domainId: string, input: AliasInput) => Promise<MailResult> | MailResult;
  onRemoveAlias: (domainId: string, id: string) => Promise<MailResult> | MailResult;
  loading?: boolean;
  /** Override any built-in English or Arabic string. */
  labels?: Partial<MailSettingsLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { defaultDomainId: undefined, loading: false, labels: undefined });

interface RemoveRequest {
  title: string;
  body: string;
  run: () => Promise<MailResult> | MailResult;
}

const healthTone = { healthy: "success", attention: "info", critical: "warning" } as const satisfies Record<string, StatusTone>;

const nq = useNasaq();
const t = computed<MailSettingsLabels>(() => ({ ...STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));

const domainId = ref(props.defaultDomainId ?? props.domains[0]?.id ?? "");
const domain = computed(() => props.domains.find((d) => d.id === domainId.value) ?? props.domains[0]);
const failure = ref<string | null>(null);
const checking = ref(false);
const mailboxOpen = ref(false);
const aliasOpen = ref(false);
const removing = ref<RemoveRequest | null>(null);
const held = ref<RemoveRequest | null>(null);
const removePending = ref(false);
watch(removing, (r) => {
  if (r) held.value = r;
});

async function guard(task: () => Promise<MailResult> | MailResult) {
  failure.value = null;
  try {
    const result = await task();
    if (result && result.error) failure.value = result.error;
  } catch {
    failure.value = t.value.genericError;
  }
}

async function recheck() {
  if (!domain.value) return;
  const id = domain.value.id;
  checking.value = true;
  try {
    await guard(() => props.onRecheck(id));
  } finally {
    checking.value = false;
  }
}

async function confirmRemove() {
  const request = held.value;
  if (!request) return;
  removePending.value = true;
  try {
    await guard(request.run);
  } finally {
    removePending.value = false;
    removing.value = null;
  }
}

const isolate = (s: string) => `⁦${s}⁩`;
const bdi = (cls: string, text: string) => h("bdi", { dir: "ltr", class: cls }, text);

const mailboxColumns = computed<DataTableColumn<Mailbox>[]>(() => [
  {
    id: "address",
    header: t.value.address,
    label: t.value.address,
    hideable: false,
    sortValue: (m) => m.local,
    searchValue: (m) => m.local,
    cell: (m) => bdi("text-start font-mono text-code text-foreground", `${m.local}@${domain.value?.name}`),
  },
  {
    id: "used",
    header: t.value.used,
    label: t.value.used,
    sortValue: (m) => quotaFraction(m.usedMb, m.quotaMb),
    headerClassName: "min-w-40",
    cell: (m) =>
      h(NqMeter, {
        size: "sm",
        "aria-label": `${t.value.used}: ${m.local}`,
        value: m.usedMb,
        max: m.quotaMb,
        showValue: true,
        valueText: isolate(`${formatMegabytes(m.usedMb)} / ${formatMegabytes(m.quotaMb)}`),
      }),
  },
]);
const mailboxTable = useDataTable<Mailbox>({ data: computed(() => (domain.value?.mailboxes ?? []) as Mailbox[]), columns: mailboxColumns, getRowId: (m) => m.id, defaultSort: { id: "address", direction: "asc" }, pageSize: 8 });

const aliasColumns = computed<DataTableColumn<MailAlias>[]>(() => [
  {
    id: "source",
    header: t.value.aliasSource,
    label: t.value.aliasSource,
    hideable: false,
    sortValue: (a) => a.source,
    searchValue: (a) => `${a.source} ${a.destination}`,
    cell: (a) => bdi("text-start font-mono text-code text-foreground", `${a.source}@${domain.value?.name}`),
  },
  {
    id: "destination",
    header: t.value.aliasDestination,
    label: t.value.aliasDestination,
    sortValue: (a) => a.destination,
    cell: (a) => bdi("text-start font-mono text-code text-muted-foreground", a.destination),
  },
]);
const aliasTable = useDataTable<MailAlias>({ data: computed(() => (domain.value?.aliases ?? []) as MailAlias[]), columns: aliasColumns, getRowId: (a) => a.id, defaultSort: { id: "source", direction: "asc" }, pageSize: 8 });

const health = computed(() => (domain.value ? domainHealth(domain.value.checks) : "healthy"));
const domainItems = computed(() => props.domains.map((d) => ({ value: d.id, label: d.name })));

function mailboxActions(m: Mailbox): DataTableRowAction[] {
  const d = domain.value!;
  return [
    {
      id: "remove",
      label: t.value.remove,
      icon: Trash2,
      danger: true,
      onSelect: () => {
        removing.value = { title: t.value.removeMailboxTitle(`${m.local}@${d.name}`), body: t.value.removeMailboxBody, run: () => props.onRemoveMailbox(d.id, m.id) };
      },
    },
  ];
}
function aliasActions(a: MailAlias): DataTableRowAction[] {
  const d = domain.value!;
  return [
    {
      id: "remove",
      label: t.value.remove,
      icon: Trash2,
      danger: true,
      onSelect: () => {
        removing.value = { title: t.value.removeAliasTitle(`${a.source}@${d.name}`), body: t.value.removeAliasBody, run: () => props.onRemoveAlias(d.id, a.id) };
      },
    },
  ];
}
const mailboxLabel = (m: Mailbox) => `${m.local}@${domain.value?.name}`;
const aliasLabel = (a: MailAlias) => `${a.source}@${domain.value?.name}`;
</script>

<template>
  <NqCard v-if="!domain" data-slot="mail-domains" :class="cn('w-full', props.class)">
    <NqCardContent>
      <NqEmptyState :icon="Mail" :title="t.noDomains" :description="t.noDomainsBody" />
    </NqCardContent>
  </NqCard>

  <div v-else data-slot="mail-domains" :aria-busy="props.loading || undefined" :class="cn('flex w-full flex-col gap-6', props.class)">
    <NqCard class="w-full">
      <NqCardHeader>
        <NqCardTitle as="h2">{{ t.domainsTitle }}</NqCardTitle>
        <NqCardDescription>{{ t.domainsDescription }}</NqCardDescription>
        <NqCardAction>
          <NqStatus :tone="healthTone[health]" :data-health="health">{{ t.health[health] }}</NqStatus>
        </NqCardAction>
      </NqCardHeader>
      <NqCardContent class="flex flex-col gap-4">
        <NqAlert v-if="failure" tone="danger" dismissible :dismiss-label="t.dismiss" @dismiss="failure = null">{{ failure }}</NqAlert>
        <NqField class="max-w-sm">
          <NqFieldLabel>{{ t.domain }}</NqFieldLabel>
          <NqSelect :model-value="domain.id" @update:model-value="(v: unknown) => v && (domainId = String(v))">
            <NqSelectTrigger><NqSelectValue /></NqSelectTrigger>
            <NqSelectContent>
              <NqSelectItem v-for="o in domainItems" :key="o.value" :value="o.value"><bdi dir="ltr">{{ o.label }}</bdi></NqSelectItem>
            </NqSelectContent>
          </NqSelect>
        </NqField>
      </NqCardContent>
    </NqCard>

    <NqCard data-slot="mail-dns" class="w-full">
      <NqCardHeader>
        <NqCardTitle as="h3">{{ t.checklistTitle }}</NqCardTitle>
        <NqCardDescription>
          {{ t.checklistDescription }}
          <template v-if="domain.checkedAt">
            {{ " " }}{{ t.lastChecked }} <NqDateTime :value="domain.checkedAt" relative />.
          </template>
        </NqCardDescription>
        <NqCardAction>
          <NqButton size="sm" variant="secondary" :loading="checking" @click="recheck">
            <ShieldCheck aria-hidden="true" class="size-4" />
            {{ checking ? t.checking : t.recheck }}
          </NqButton>
        </NqCardAction>
      </NqCardHeader>
      <NqCardContent class="flex flex-col gap-4">
        <NqMailDnsRow v-for="kind in DNS_KINDS" :key="kind" :kind="kind" :check="domain.checks.find((c) => c.kind === kind)" :t="t" />
      </NqCardContent>
    </NqCard>

    <NqCard data-slot="mail-mailboxes" class="w-full">
      <NqCardHeader>
        <NqCardTitle as="h3">{{ t.mailboxesTitle }}</NqCardTitle>
        <NqCardDescription>{{ t.mailboxesDescription }}</NqCardDescription>
        <NqCardAction>
          <NqButton size="sm" variant="secondary" @click="mailboxOpen = true">
            <MailPlus aria-hidden="true" class="size-4" />
            {{ t.addMailbox }}
          </NqButton>
        </NqCardAction>
      </NqCardHeader>
      <NqCardContent class="flex flex-col gap-3">
        <NqDataTable :table="mailboxTable" :label="t.mailboxesTable" :row-label="mailboxLabel" :loading="props.loading" :row-actions="mailboxActions">
          <template #empty><NqEmptyState :icon="Mail" :title="t.mailboxesEmpty" /></template>
        </NqDataTable>
        <NqDataTablePagination :table="mailboxTable" />
      </NqCardContent>
    </NqCard>

    <NqCard data-slot="mail-aliases" class="w-full">
      <NqCardHeader>
        <NqCardTitle as="h3">{{ t.aliasesTitle }}</NqCardTitle>
        <NqCardDescription>{{ t.aliasesDescription }}</NqCardDescription>
        <NqCardAction>
          <NqButton size="sm" variant="secondary" @click="aliasOpen = true">
            <Plus aria-hidden="true" class="size-4" />
            {{ t.addAlias }}
          </NqButton>
        </NqCardAction>
      </NqCardHeader>
      <NqCardContent class="flex flex-col gap-3">
        <NqDataTable :table="aliasTable" :label="t.aliasesTable" :row-label="aliasLabel" :loading="props.loading" :row-actions="aliasActions">
          <template #empty><NqEmptyState :icon="Mail" :title="t.aliasesEmpty" /></template>
        </NqDataTable>
        <NqDataTablePagination :table="aliasTable" />
      </NqCardContent>
    </NqCard>

    <NqMailboxDialog v-model:open="mailboxOpen" :domain="domain.name" :t="t" :on-add="(input) => props.onAddMailbox(domain!.id, input)" />
    <NqAliasDialog v-model:open="aliasOpen" :domain="domain.name" :t="t" :on-add="(input) => props.onAddAlias(domain!.id, input)" />

    <NqAlertDialog :open="removing !== null" @update:open="(open: boolean) => !open && !removePending && (removing = null)">
      <NqAlertDialogContent data-slot="mail-remove">
        <NqAlertDialogHeader>
          <NqAlertDialogTitle>{{ held?.title }}</NqAlertDialogTitle>
          <NqAlertDialogDescription>{{ held?.body }}</NqAlertDialogDescription>
        </NqAlertDialogHeader>
        <NqAlertDialogFooter>
          <NqAlertDialogCancel :disabled="removePending">{{ t.cancel }}</NqAlertDialogCancel>
          <NqButton variant="danger" :loading="removePending" @click="confirmRemove">{{ t.remove }}</NqButton>
        </NqAlertDialogFooter>
      </NqAlertDialogContent>
    </NqAlertDialog>
  </div>
</template>
