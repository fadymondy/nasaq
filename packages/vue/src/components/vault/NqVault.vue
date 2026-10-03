<script setup lang="ts">
import { Check as CheckIcon, Copy as CopyIcon, Eye, EyeOff, KeyRound, Lock, Pencil, Plus, Search, Trash2 } from "lucide-vue-next";
import { computed, h, onBeforeUnmount, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { copyText } from "../copy-button/copy-text";
import { NqDataTable, NqDataTableFacetFilter, NqDataTableSearch, NqDataTableToolbar, useDataTable, type DataTableColumn } from "../data-table";
import { NqInputGroup, NqInputGroupAddon, NqInputGroupInput } from "../input-group";
import { NqDateTime } from "../numeric";
import { NqEmptyState, NqLoadingState } from "../states";
import { NqTabs, NqTabsIndicator, NqTabsList, NqTabsPanel, NqTabsTab } from "../tabs";
import { STRINGS, type VaultLabels } from "./strings";
import type { VaultAccessAction, VaultAccessEvent, VaultResult, VaultRevealResult, VaultSecret, VaultSecretInput } from "./types";
import NqVaultDeleteDialog from "./NqVaultDeleteDialog.vue";
import NqVaultSecretDialog from "./NqVaultSecretDialog.vue";
import { daysUntil, expiryState, groupSecrets, matchesSecret, VAULT_MASK } from "./vault-format";

// A secrets vault: secrets grouped by project or service with masked values, reveal and copy that fetch the
// value only when asked (and log it), a value that hides itself again, expiry warnings, add, edit and delete,
// and an access log table. It has no backend: your callbacks hold the values.
const props = withDefaults(
  defineProps<{
    secrets: readonly VaultSecret[];
    accessLog?: readonly VaultAccessEvent[];
    /**
     * Fetch one value when someone reveals or copies it, so values are never in the page until then. `purpose` is
     * what to write in the access log. Resolve `{ value }` or `{ error }`.
     */
    onReveal: (id: string, purpose: "reveal" | "copy") => Promise<VaultRevealResult>;
    /** Add (`id` undefined) or edit. Resolve `{ error }` to keep the dialog open with a message. Omit to hide add and edit. */
    onSave?: (input: VaultSecretInput, id?: string) => Promise<VaultResult>;
    /** Omit to hide Delete. */
    onDelete?: (id: string) => Promise<VaultResult>;
    loading?: boolean;
    /** Hide a revealed value again after this many milliseconds. Default 15000. Minimum 1000. */
    revealTimeout?: number;
    /** Override the clock (stories and tests). */
    now?: Date | number | string;
    /** Replaces the heading (also the `title` slot). */
    title?: string;
    /** Replaces the line under the heading (also the `description` slot). */
    description?: string;
    /** Override any string. Defaults to English or Arabic by the Nasaq locale. */
    labels?: Partial<VaultLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { accessLog: () => [], onSave: undefined, onDelete: undefined, loading: false, revealTimeout: 15_000, now: undefined, title: undefined, description: undefined, labels: undefined },
);

const nasaq = useNasaq();
const ar = computed(() => nasaq.locale.value.startsWith("ar"));
const t = computed<VaultLabels>(() => ({ ...(STRINGS[ar.value ? "ar" : "en"] as VaultLabels), ...props.labels }));

const EXPIRY_VARIANT = { soon: "warning", expired: "danger" } as const;
const ACTION_VARIANT: Record<VaultAccessAction, "warning" | "info" | "success" | "neutral" | "danger"> = {
  reveal: "warning",
  copy: "info",
  create: "success",
  update: "neutral",
  delete: "danger",
};

const tab = ref("secrets");
const filter = ref("");
const shown = ref<Record<string, { value: string }>>({});
const busy = ref<string | null>(null);
const copied = ref<string | null>(null);
const notice = ref<string | null>(null);
const editing = ref<{ id?: string } | null>(null);
const deleting = ref<VaultSecret | null>(null);
const remaining = ref(0);
const timers = new Map<string, ReturnType<typeof setTimeout>>();
let copyTimer: ReturnType<typeof setTimeout> | undefined;
let ticker: ReturnType<typeof setInterval> | undefined;
let lastReveal = 0;
const hideMs = computed(() => Math.max(1000, props.revealTimeout));
const clock = computed(() => props.now ?? Date.now());

onBeforeUnmount(() => {
  for (const timer of timers.values()) clearTimeout(timer);
  clearTimeout(copyTimer);
  clearInterval(ticker);
});

// A countdown for the "hides again in N seconds" line, shared by all revealed values.
const revealedCount = computed(() => Object.keys(shown.value).length);
watch(
  [revealedCount, hideMs],
  ([count]) => {
    clearInterval(ticker);
    if (count === 0) return;
    const tick = () => (remaining.value = Math.max(0, Math.ceil((lastReveal + hideMs.value - Date.now()) / 1000)));
    tick();
    ticker = setInterval(tick, 1000);
  },
  { flush: "sync" },
);

function hide(id: string) {
  clearTimeout(timers.get(id));
  timers.delete(id);
  if (!(id in shown.value)) return;
  const { [id]: _gone, ...rest } = shown.value;
  shown.value = rest;
}

async function toggle(secret: VaultSecret) {
  if (shown.value[secret.id]) return hide(secret.id);
  busy.value = secret.id;
  notice.value = null;
  try {
    const result = await props.onReveal(secret.id, "reveal");
    if ("error" in result) {
      notice.value = result.error || t.value.revealFailed;
      return;
    }
    lastReveal = Date.now();
    shown.value = { ...shown.value, [secret.id]: { value: result.value } };
    clearTimeout(timers.get(secret.id));
    timers.set(secret.id, setTimeout(() => hide(secret.id), hideMs.value));
  } catch {
    notice.value = t.value.revealFailed;
  } finally {
    busy.value = null;
  }
}

async function copy(secret: VaultSecret) {
  notice.value = null;
  busy.value = secret.id;
  try {
    const known = shown.value[secret.id]?.value;
    const result = known !== undefined ? { value: known } : await props.onReveal(secret.id, "copy");
    if ("error" in result) {
      notice.value = result.error || t.value.revealFailed;
      return;
    }
    const ok = await copyText(result.value);
    clearTimeout(copyTimer);
    if (ok) {
      copied.value = secret.id;
      copyTimer = setTimeout(() => (copied.value = null), 1500);
    } else notice.value = t.value.copyFailed;
  } catch {
    notice.value = t.value.revealFailed;
  } finally {
    busy.value = null;
  }
}

const canEdit = computed(() => Boolean(props.onSave));
const visible = computed(() => props.secrets.filter((s) => matchesSecret(s, filter.value)));
const groups = computed(() => groupSecrets(visible.value, nasaq.locale.value));
const existingGroups = computed(() => [...new Set(props.secrets.map((s) => s.group.trim()).filter(Boolean))]);
const editingSecret = computed(() => (editing.value?.id ? props.secrets.find((s) => s.id === editing.value?.id) : undefined));
const heading = computed(() => props.title ?? t.value.title);
const expiry = (s: VaultSecret) => expiryState(s.expiresAt, clock.value);

const log = computed(() => [...props.accessLog]);
const logColumns = computed<DataTableColumn<VaultAccessEvent>[]>(() => {
  const s = t.value;
  return [
    {
      id: "at",
      header: s.time,
      label: s.time,
      cell: (e) => h(NqDateTime, { value: e.at, format: { dateStyle: "medium", timeStyle: "short" } }),
      sortValue: (e) => new Date(e.at),
    },
    { id: "actor", header: s.actor, label: s.actor, cell: (e) => e.actor, sortValue: (e) => e.actor, searchValue: (e) => e.actor },
    {
      id: "action",
      header: s.action,
      label: s.action,
      cell: (e) => h(NqBadge, { variant: ACTION_VARIANT[e.action] }, () => s.actions[e.action]),
      filterValue: (e) => e.action,
    },
    {
      id: "secret",
      header: s.secret,
      label: s.secret,
      cell: (e) => h("bdi", { dir: "ltr", class: "font-mono text-code" }, e.secretName),
      sortValue: (e) => e.secretName,
      searchValue: (e) => e.secretName,
    },
    {
      id: "address",
      header: s.address,
      label: s.address,
      cell: (e) => (e.address ? h("bdi", { dir: "ltr", class: "font-mono text-code text-muted-foreground" }, e.address) : "-"),
      searchValue: (e) => e.address ?? "",
    },
  ];
});
const logTable = useDataTable<VaultAccessEvent>({ data: log, columns: logColumns, getRowId: (e) => e.id, pageSize: 10, defaultSort: { id: "at", direction: "desc" } });
const actionOptions = computed(() => (Object.keys(t.value.actions) as VaultAccessAction[]).map((value) => ({ value, label: t.value.actions[value] })));

async function confirmDelete(): Promise<VaultResult> {
  const target = deleting.value;
  if (!target || !props.onDelete) return;
  const result = await props.onDelete(target.id);
  if (!result?.error) hide(target.id);
  return result;
}
</script>

<template>
  <section data-slot="vault" :aria-label="heading" :class="cn('flex min-w-0 flex-col gap-4', props.class)">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div class="flex min-w-0 flex-col gap-1">
        <h3 class="flex items-center gap-2 text-h3 text-foreground">
          <KeyRound aria-hidden="true" class="size-5 text-muted-foreground" />
          <slot name="title">{{ heading }}</slot>
        </h3>
        <p class="max-w-prose text-body-sm text-muted-foreground"><slot name="description">{{ props.description ?? t.description }}</slot></p>
      </div>
      <NqButton v-if="canEdit" type="button" size="sm" variant="primary" @click="editing = {}">
        <Plus aria-hidden="true" />
        {{ t.add }}
      </NqButton>
    </header>

    <NqAlert v-if="notice" tone="danger" role="alert" dismissible @dismiss="notice = null">{{ notice }}</NqAlert>

    <NqTabs v-model="tab">
      <NqTabsList variant="underline" :aria-label="heading">
        <NqTabsTab value="secrets">
          {{ t.secrets }}
          <span class="ms-1.5 text-caption text-muted-foreground tabular-nums">{{ props.secrets.length }}</span>
        </NqTabsTab>
        <NqTabsTab value="log">{{ t.accessLog }}</NqTabsTab>
        <NqTabsIndicator />
      </NqTabsList>

      <NqTabsPanel value="secrets" class="flex flex-col gap-4">
        <NqLoadingState v-if="props.loading" :label="t.loading" :rows="4" />
        <NqEmptyState v-else-if="props.secrets.length === 0" :icon="KeyRound" :title="t.emptyTitle" :description="t.emptyBody">
          <template v-if="canEdit" #actions>
            <NqButton type="button" variant="primary" @click="editing = {}">
              <Plus aria-hidden="true" />
              {{ t.add }}
            </NqButton>
          </template>
        </NqEmptyState>
        <template v-else>
          <NqInputGroup v-if="props.secrets.length > 5" class="max-w-sm">
            <NqInputGroupAddon align="start">
              <Search aria-hidden="true" class="size-4 text-muted-foreground" />
            </NqInputGroupAddon>
            <NqInputGroupInput v-model="filter" ltr type="search" :placeholder="t.filter" :aria-label="t.filter" />
          </NqInputGroup>
          <p v-if="groups.length === 0" class="rounded-card border border-dashed border-border px-4 py-8 text-center text-body-sm text-muted-foreground">{{ t.noMatch }}</p>
          <section v-for="g in groups" :key="g.group || '__none'" :aria-label="g.group || t.ungrouped" class="flex flex-col gap-2">
            <h4 class="flex items-baseline gap-2 text-label text-foreground">
              <bdi v-if="g.group" dir="auto">{{ g.group }}</bdi>
              <template v-else>{{ t.ungrouped }}</template>
              <span class="text-caption font-normal text-muted-foreground">{{ t.count(g.items.length) }}</span>
            </h4>
            <ul class="m-0 flex list-none flex-col overflow-hidden rounded-card border border-border bg-card p-0">
              <li
                v-for="s in g.items"
                :key="s.id"
                data-slot="vault-secret"
                :data-revealed="shown[s.id] ? '' : undefined"
                class="flex flex-col gap-2 border-b border-border px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-4"
              >
                <div class="flex min-w-0 flex-col gap-1 sm:w-2/5">
                  <div class="flex min-w-0 flex-wrap items-center gap-2">
                    <bdi dir="ltr" class="truncate font-mono text-code font-medium text-foreground">{{ s.name }}</bdi>
                    <NqBadge variant="neutral" class="shrink-0">
                      <Lock aria-hidden="true" />
                      {{ t.kind[s.kind ?? "other"] }}
                    </NqBadge>
                    <NqBadge v-if="expiry(s) === 'soon' || expiry(s) === 'expired'" :variant="EXPIRY_VARIANT[expiry(s) as 'soon' | 'expired']" class="shrink-0">
                      {{ expiry(s) === "expired" ? t.expired : t.expiresIn(Math.max(1, daysUntil(s.expiresAt as Date | number | string, clock))) }}
                    </NqBadge>
                  </div>
                  <span v-if="s.description" class="truncate text-caption text-muted-foreground">{{ s.description }}</span>
                  <span class="text-caption text-muted-foreground">
                    {{ t.lastUsed }}: <NqDateTime v-if="s.lastAccessedAt" :value="s.lastAccessedAt" relative /><template v-else>{{ t.never }}</template>
                  </span>
                </div>
                <div class="min-w-0 flex-1">
                  <div v-if="shown[s.id]" class="flex flex-col gap-0.5">
                    <bdi dir="ltr" data-slot="vault-value" class="block break-all font-mono text-code text-foreground">{{ shown[s.id]!.value }}</bdi>
                    <span class="text-caption text-muted-foreground">{{ t.autoHide(remaining) }}</span>
                  </div>
                  <span v-else data-slot="vault-value" dir="ltr" role="text" :aria-label="t.hidden" class="block font-mono text-code text-muted-foreground">
                    {{ VAULT_MASK }}<span v-if="s.hint" class="ms-1">{{ s.hint }}</span>
                  </span>
                </div>
                <div class="flex shrink-0 items-center gap-0.5">
                  <NqButton
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    :loading="busy === s.id"
                    :aria-label="shown[s.id] ? t.hide(s.name) : t.reveal(s.name)"
                    :aria-pressed="Boolean(shown[s.id])"
                    @click="toggle(s)"
                  >
                    <EyeOff v-if="shown[s.id]" aria-hidden="true" />
                    <Eye v-else aria-hidden="true" />
                  </NqButton>
                  <NqButton type="button" variant="ghost" size="icon-sm" :aria-label="t.copy(s.name)" :data-copied="copied === s.id ? '' : undefined" class="data-copied:text-nq-success-text" @click="copy(s)">
                    <CheckIcon v-if="copied === s.id" />
                    <CopyIcon v-else />
                  </NqButton>
                  <NqButton v-if="canEdit" type="button" variant="ghost" size="icon-sm" :aria-label="t.edit(s.name)" @click="editing = { id: s.id }">
                    <Pencil aria-hidden="true" />
                  </NqButton>
                  <NqButton v-if="props.onDelete" type="button" variant="ghost" size="icon-sm" :aria-label="t.remove(s.name)" class="text-nq-danger-text" @click="deleting = s">
                    <Trash2 aria-hidden="true" />
                  </NqButton>
                </div>
              </li>
            </ul>
          </section>
          <span role="status" aria-live="polite" class="sr-only">{{ copied ? t.copied : "" }}</span>
        </template>
      </NqTabsPanel>

      <NqTabsPanel value="log" class="flex flex-col gap-3">
        <NqDataTableToolbar>
          <NqDataTableSearch :table="logTable" :placeholder="t.logSearch" />
          <NqDataTableFacetFilter :table="logTable" column="action" :title="t.action" :options="actionOptions" />
        </NqDataTableToolbar>
        <NqDataTable :table="logTable" :label="t.logTable" :loading="props.loading">
          <template #empty><NqEmptyState :title="t.logEmpty" /></template>
        </NqDataTable>
      </NqTabsPanel>
    </NqTabs>

    <NqVaultSecretDialog
      v-if="editing && props.onSave"
      :key="editing.id ?? 'new'"
      :initial="editingSecret"
      :groups="existingGroups"
      :secrets="props.secrets"
      :on-save="(input: VaultSecretInput) => props.onSave!(input, editing?.id)"
      :t="t"
      @close="editing = null"
    />
    <NqVaultDeleteDialog v-if="deleting && props.onDelete" :secret="deleting" :on-confirm="confirmDelete" :t="t" @close="deleting = null" />
  </section>
</template>
