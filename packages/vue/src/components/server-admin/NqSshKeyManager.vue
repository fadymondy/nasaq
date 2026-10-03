<script setup lang="ts">
import { KeyRound, Plus, Trash2, Undo2 } from "lucide-vue-next";
import { computed, h, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqAlert } from "../alert";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { NqCheckbox } from "../checkbox";
import { NqDataTable, useDataTable, type DataTableColumn, type DataTableRowAction } from "../data-table";
import { NqDateTime } from "../numeric";
import { NqEmptyState } from "../states";
import { keyCoverage, shortFingerprint } from "./format";
import NqServerAdminConfirm from "./NqServerAdminConfirm.vue";
import NqSshKeyAddDialog from "./NqSshKeyAddDialog.vue";
import { useServerAdminLabels, type ServerAdminLabels } from "./strings";
import type { ConfirmRequest, ServerAdminResult, SshKeyInput, SshKeyRecord, SshServer } from "./types";
import { useRunner } from "./use-runner";

// Which SSH keys can sign in to which servers: one row per key, one column per server, a checkbox in each cell. A checkbox
// installs or removes the key on that server. The row menu (also from the context menu) installs a key everywhere, removes it
// everywhere, or deletes it. Adding a key checks that it is a public key and never accepts a private one.
const props = withDefaults(
  defineProps<{
    servers: readonly SshServer[];
    keys: readonly SshKeyRecord[];
    /** Install (`installed: true`) or remove a key on one server. The host then passes the updated `keys`. */
    onInstallChange: (keyId: string, serverId: string, installed: boolean) => Promise<ServerAdminResult>;
    /** Save a new public key. */
    onAdd: (input: SshKeyInput) => Promise<ServerAdminResult>;
    /** Delete a key everywhere. Adds Delete to the row menu. */
    onRemove?: (keyId: string) => Promise<ServerAdminResult>;
    loading?: boolean;
    labels?: Partial<ServerAdminLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { onRemove: undefined, loading: false, labels: undefined },
);

const t = useServerAdminLabels(() => props.labels);
const runner = useRunner(() => t.value.genericError);
const adding = ref(false);
const confirm = ref<ConfirmRequest | null>(null);
const serverIds = computed(() => props.servers.map((s) => s.id));

const columns = computed<DataTableColumn<SshKeyRecord>[]>(() => {
  const tt = t.value;
  const ids = serverIds.value;
  return [
    {
      id: "key",
      header: tt.sshKey,
      label: tt.sshKey,
      hideable: false,
      sortValue: (k) => k.name,
      searchValue: (k) => `${k.name} ${k.fingerprint} ${k.comment ?? ""}`,
      cell: (k) =>
        h("div", { class: "flex min-w-0 flex-col" }, [
          h("span", { dir: "auto", class: "flex items-center gap-2 text-label text-foreground" }, [
            h(KeyRound, { "aria-hidden": "true", class: "size-3.5 shrink-0 text-muted-foreground" }),
            h("span", { class: "truncate" }, k.name),
            h(NqBadge, { variant: "outline" }, () => k.type),
          ]),
          h("bdi", { dir: "ltr", title: k.fingerprint, class: "truncate text-start font-mono text-caption text-muted-foreground" }, shortFingerprint(k.fingerprint)),
        ]),
    },
    {
      id: "coverage",
      header: tt.sshServers,
      label: tt.sshServers,
      sortValue: (k) => keyCoverage(k.installedOn, ids).installed,
      cell: (k) => {
        const c = keyCoverage(k.installedOn, ids);
        return h(NqBadge, { variant: c.level === "all" ? "success" : c.level === "none" ? "outline" : "neutral" }, () => tt.sshCoverage(c.installed, c.total));
      },
    },
    ...props.servers.map<DataTableColumn<SshKeyRecord>>((server) => ({
      id: `server:${server.id}`,
      header: () => h("bdi", { dir: "auto" }, server.name),
      label: server.name,
      align: "center",
      headerClassName: "whitespace-nowrap",
      cell: (k) => {
        const installed = k.installedOn.includes(server.id);
        const cellKey = `${k.id}:${server.id}`;
        return h(NqCheckbox, {
          modelValue: installed,
          disabled: runner.busy.value.has(cellKey),
          "aria-label": tt.installedOn(k.name, server.name),
          "onUpdate:modelValue": (next: boolean) => void runner.run([cellKey], () => props.onInstallChange(k.id, server.id, next === true)),
        });
      },
    })),
    {
      id: "added",
      header: tt.addedOn,
      label: tt.addedOn,
      defaultHidden: true,
      sortValue: (k) => new Date(k.addedAt),
      cell: (k) => h(NqDateTime, { value: k.addedAt, format: { dateStyle: "medium" }, class: "text-muted-foreground" }),
    },
    {
      id: "used",
      header: tt.lastUsed,
      label: tt.lastUsed,
      defaultHidden: true,
      sortValue: (k) => (k.lastUsedAt ? new Date(k.lastUsedAt) : null),
      cell: (k) => (k.lastUsedAt ? h(NqDateTime, { value: k.lastUsedAt, relative: true, class: "text-muted-foreground" }) : h("span", { class: "text-muted-foreground" }, tt.never)),
    },
  ];
});

const table = useDataTable<SshKeyRecord>({ data: () => [...props.keys], columns, getRowId: (k) => k.id, defaultSort: { id: "key", direction: "asc" } });

function setEverywhere(key: SshKeyRecord, installed: boolean) {
  const todo = serverIds.value.filter((id) => key.installedOn.includes(id) !== installed);
  if (todo.length === 0) return;
  void runner.run(
    todo.map((id) => `${key.id}:${id}`),
    async () => {
      for (const id of todo) {
        const result = await props.onInstallChange(key.id, id, installed);
        if (result && result.error) return result;
      }
    },
  );
}

function rowActions(key: SshKeyRecord): DataTableRowAction[] {
  const tt = t.value;
  const c = keyCoverage(key.installedOn, serverIds.value);
  const list: DataTableRowAction[] = [];
  if (c.level !== "all") list.push({ id: "all", label: tt.installOnAll, icon: Plus, group: "install", onSelect: () => setEverywhere(key, true) });
  if (c.level !== "none") list.push({ id: "none", label: tt.removeFromAll, icon: Undo2, group: "install", onSelect: () => setEverywhere(key, false) });
  if (props.onRemove) {
    const remove = props.onRemove;
    list.push({
      id: "delete",
      label: tt.deleteKey,
      icon: Trash2,
      danger: true,
      group: "danger",
      onSelect: () => (confirm.value = { title: tt.deleteKeyTitle(key.name), body: tt.deleteKeyBody, confirm: tt.deleteKey, run: () => runner.run([key.id], () => remove(key.id)) }),
    });
  }
  return list;
}
</script>

<template>
  <NqCard data-slot="ssh-key-manager" :class="cn('w-full', props.class)">
    <NqCardHeader class="sm:flex sm:items-start sm:justify-between sm:gap-4">
      <div class="flex flex-col gap-1.5">
        <NqCardTitle as="h2">{{ t.sshTitle }}</NqCardTitle>
        <NqCardDescription>{{ t.sshDescription }}</NqCardDescription>
      </div>
      <NqButton type="button" variant="primary" class="mt-3 sm:mt-0" @click="adding = true">
        <Plus aria-hidden="true" />
        {{ t.addKey }}
      </NqButton>
    </NqCardHeader>
    <NqCardContent class="flex flex-col gap-3">
      <NqAlert v-if="runner.error.value" tone="danger" dismissible :dismiss-label="t.dismiss" @dismiss="runner.error.value = null">{{ runner.error.value }}</NqAlert>
      <NqDataTable :table="table" :label="t.sshTable" :row-label="(k: SshKeyRecord) => k.name" :loading="props.loading" :row-actions="rowActions">
        <template #empty>
          <NqEmptyState :icon="KeyRound" :title="t.noKeys" :description="t.noKeysBody" />
        </template>
      </NqDataTable>
    </NqCardContent>
    <NqSshKeyAddDialog v-model:open="adding" :on-add="props.onAdd" :t="t" />
    <NqServerAdminConfirm :request="confirm" :cancel="t.cancel" @close="confirm = null" />
  </NqCard>
</template>
