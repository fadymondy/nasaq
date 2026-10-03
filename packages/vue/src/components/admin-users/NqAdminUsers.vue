<script setup lang="ts">
import { BadgeCheck, Eye, KeyRound, Plus, ShieldCheck, UserCheck, UserRoundX, UserX } from "lucide-vue-next";
import { computed, h, onBeforeUnmount, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqAlertDialog, NqAlertDialogContent, NqAlertDialogDescription, NqAlertDialogFooter, NqAlertDialogHeader, NqAlertDialogTitle } from "../alert-dialog";
import { NqAvatar } from "../avatar";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import {
  NqDataTable,
  NqDataTableBulkActions,
  NqDataTableFacetFilter,
  NqDataTablePagination,
  NqDataTableSearch,
  NqDataTableToolbar,
  NqDataTableViewOptions,
  useDataTable,
  type DataTableColumn,
} from "../data-table";
import { formatNumber, NqDateTime } from "../numeric";
import { NqEmptyState } from "../states";
import { NqStatCard, NqStatGrid } from "../stat-card";
import { NqStatus } from "../status";
import NqAddUserDialog from "./NqAddUserDialog.vue";
import NqUserRolesDialog from "./NqUserRolesDialog.vue";
import { adminUsersStrings, type AdminUsersLabels } from "./strings";
import { adminUsersAttempt, type AddUserResult, type AdminActionResult, type ManagedRole, type ManagedUser, type ManagedUserStatus, type NewUserValues } from "./types";

// The user management suite for an admin area: summary tiles, a searchable, filterable table, an add-user dialog,
// and per-row actions (verify email, edit roles, reset password, impersonate, disable or enable). Risky actions ask first.
// You own the data: every action is an async callback, and you send back new `users`.
type Confirm = { kind: "disable" | "reset" | "impersonate"; user: ManagedUser };

const props = withDefaults(
  defineProps<{
    users: readonly ManagedUser[];
    /** The roles that can be given. */
    roles: readonly ManagedRole[];
    /** The signed-in admin. Their own row cannot be disabled or impersonated. */
    currentUserId?: string;
    loading?: boolean;
    error?: string | boolean;
    onRetry?: () => void;
    pageSize?: number;
    onAddUser?: (values: NewUserValues) => Promise<AddUserResult> | AddUserResult;
    onVerify?: (user: ManagedUser) => Promise<AdminActionResult> | AdminActionResult;
    onSetDisabled?: (user: ManagedUser, disabled: boolean) => Promise<AdminActionResult> | AdminActionResult;
    onResetPassword?: (user: ManagedUser) => Promise<AdminActionResult> | AdminActionResult;
    onImpersonate?: (user: ManagedUser) => Promise<AdminActionResult> | AdminActionResult;
    onUpdateRoles?: (user: ManagedUser, roles: string[]) => Promise<AdminActionResult> | AdminActionResult;
    /** Called when a row is clicked. */
    onOpenUser?: (user: ManagedUser) => void;
    /** Hide the four summary tiles above the table. */
    hideStats?: boolean;
    labels?: AdminUsersLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { pageSize: 10, hideStats: false, error: undefined },
);

const nq = useNasaq();
const locale = computed(() => nq.locale.value);
const t = computed(() => ({ ...adminUsersStrings(locale.value), ...props.labels }));

const adding = ref(false);
const editing = ref<ManagedUser | null>(null);
const confirm = ref<Confirm | null>(null);
const confirmBusy = ref(false);
const confirmError = ref<string | null>(null);
const notice = ref<{ tone: "success" | "danger"; text: string } | null>(null);
let timer: ReturnType<typeof setTimeout> | undefined;
watch(notice, (v) => {
  clearTimeout(timer);
  if (v) timer = setTimeout(() => (notice.value = null), 6000);
});
onBeforeUnmount(() => clearTimeout(timer));

const roleLabel = computed(() => new Map(props.roles.map((r) => [r.id, r.label])));
const statusLabel = computed<Record<ManagedUserStatus, string>>(() => ({ active: t.value.statusActive, disabled: t.value.statusDisabled, invited: t.value.statusInvited }));
const muted = "text-body-sm text-muted-foreground";

const columns = computed<DataTableColumn<ManagedUser>[]>(() => [
  {
    id: "user",
    header: t.value.user,
    label: t.value.user,
    hideable: false,
    sortValue: (u) => u.name,
    searchValue: (u) => `${u.name} ${u.email}`,
    cell: (u) =>
      h("div", { class: "flex min-w-0 items-center gap-3" }, [
        h(NqAvatar, { name: u.name, src: u.avatar, size: "sm" }),
        h("div", { class: "flex min-w-0 flex-col" }, [
          h("span", { class: "flex items-center gap-1.5 truncate text-label text-foreground" }, [u.name, u.id === props.currentUserId ? h(NqBadge, { variant: "outline" }, () => t.value.you) : null]),
          h("bdi", { dir: "ltr", class: "truncate text-caption text-muted-foreground" }, u.email),
        ]),
      ]),
  },
  {
    id: "roles",
    header: t.value.roles,
    label: t.value.roles,
    filterValue: (u) => u.roles[0] ?? "",
    cell: (u) =>
      u.roles.length
        ? h("div", { class: "flex flex-wrap gap-1" }, [
            ...u.roles.slice(0, 2).map((r) => h(NqBadge, { key: r, variant: "neutral" }, () => roleLabel.value.get(r) ?? r)),
            u.roles.length > 2 ? h(NqBadge, { variant: "outline" }, () => `+${formatNumber(u.roles.length - 2, locale.value)}`) : null,
          ])
        : h("span", { class: muted }, t.value.noRoles),
  },
  {
    id: "status",
    header: t.value.status,
    label: t.value.status,
    sortValue: (u) => u.status,
    filterValue: (u) => u.status,
    cell: (u) => h(NqStatus, { tone: u.status === "active" ? "success" : u.status === "disabled" ? "danger" : "info" }, () => statusLabel.value[u.status]),
  },
  {
    id: "verified",
    header: t.value.email,
    label: t.value.email,
    filterValue: (u) => (u.verified ? "verified" : "unverified"),
    sortValue: (u) => (u.verified ? 1 : 0),
    cell: (u) => (u.verified ? h(NqStatus, { tone: "success", icon: BadgeCheck }, () => t.value.verified) : h(NqStatus, { tone: "warning" }, () => t.value.notVerified)),
  },
  { id: "workspace", header: t.value.workspace, label: t.value.workspace, sortValue: (u) => u.workspace, searchValue: (u) => u.workspace ?? "", defaultHidden: true, cell: (u) => u.workspace ?? "" },
  {
    id: "lastActive",
    header: t.value.lastActive,
    label: t.value.lastActive,
    sortValue: (u) => (u.lastActive ? new Date(u.lastActive) : null),
    cell: (u) => (u.lastActive ? h(NqDateTime, { value: u.lastActive, relative: true, class: muted }) : h("span", { class: muted }, t.value.never)),
  },
  {
    id: "created",
    header: t.value.joined,
    label: t.value.joined,
    align: "end",
    sortValue: (u) => new Date(u.createdAt),
    cell: (u) => h(NqDateTime, { value: u.createdAt, format: { dateStyle: "medium" }, class: muted }),
  },
]);

const table = useDataTable({ data: () => props.users as ManagedUser[], columns: () => columns.value, getRowId: (u) => u.id, pageSize: props.pageSize, selectable: true, defaultSort: { id: "created", direction: "desc" } });

const stats = computed(() => ({
  total: props.users.length,
  active: props.users.filter((u) => u.status === "active").length,
  unverified: props.users.filter((u) => !u.verified).length,
  disabled: props.users.filter((u) => u.status === "disabled").length,
}));

function report(failure: string | null, ok: string) {
  notice.value = failure === null ? { tone: "success", text: ok } : { tone: "danger", text: failure || t.value.failed };
  return failure === null;
}
const verify = async (u: ManagedUser) => report(await adminUsersAttempt(() => props.onVerify?.(u)), t.value.verifiedOk(u.name));
const setDisabled = async (u: ManagedUser, disabled: boolean) => report(await adminUsersAttempt(() => props.onSetDisabled?.(u, disabled)), disabled ? t.value.disabledOk(u.name) : t.value.enabledOk(u.name));

async function runConfirm() {
  if (!confirm.value) return;
  const { kind, user } = confirm.value;
  confirmBusy.value = true;
  confirmError.value = null;
  const failure = await adminUsersAttempt(() => (kind === "disable" ? props.onSetDisabled?.(user, true) : kind === "reset" ? props.onResetPassword?.(user) : props.onImpersonate?.(user)));
  confirmBusy.value = false;
  if (failure === null) {
    confirm.value = null;
    notice.value = { tone: "success", text: kind === "disable" ? t.value.disabledOk(user.name) : kind === "reset" ? t.value.resetOk(user.name) : t.value.impersonateOk(user.name) };
  } else confirmError.value = failure || t.value.failed;
}

async function bulk(kind: "verify" | "disable") {
  const targets = table.selectedRows.filter((u) => (kind === "verify" ? !u.verified : u.status !== "disabled" && u.id !== props.currentUserId));
  const results = await Promise.all(targets.map((u) => adminUsersAttempt(() => (kind === "verify" ? props.onVerify?.(u) : props.onSetDisabled?.(u, true)))));
  const failed = results.filter((r) => r !== null).length;
  report(failed ? t.value.failed : null, t.value.bulkOk(formatNumber(targets.length, locale.value)));
  table.setSelection(new Set());
}

const copy = computed(() => {
  const c = confirm.value;
  if (!c) return null;
  return {
    title: c.kind === "disable" ? t.value.disableTitle(c.user.name) : c.kind === "reset" ? t.value.resetTitle(c.user.name) : t.value.impersonateTitle(c.user.name),
    body: c.kind === "disable" ? t.value.disableBody : c.kind === "reset" ? t.value.resetBody : t.value.impersonateBody,
    action: c.kind === "disable" ? t.value.disableConfirm : c.kind === "reset" ? t.value.resetConfirm : t.value.impersonateConfirm,
  };
});

const roleOptions = computed(() => props.roles.map((r) => ({ value: r.id, label: r.label })));
const statusOptions = computed(() => [
  { value: "active", label: t.value.statusActive },
  { value: "invited", label: t.value.statusInvited },
  { value: "disabled", label: t.value.statusDisabled },
]);
const verifiedOptions = computed(() => [
  { value: "verified", label: t.value.verified },
  { value: "unverified", label: t.value.notVerified },
]);

const rowActions = (u: ManagedUser) => {
  const self = u.id === props.currentUserId;
  return [
    ...(props.onVerify ? [{ id: "verify", label: t.value.verify, icon: BadgeCheck, disabled: u.verified, onSelect: () => void verify(u), group: "manage" }] : []),
    ...(props.onUpdateRoles ? [{ id: "roles", label: t.value.editRoles, icon: ShieldCheck, onSelect: () => (editing.value = u), group: "manage" }] : []),
    ...(props.onResetPassword ? [{ id: "reset", label: t.value.resetPassword, icon: KeyRound, onSelect: () => (confirm.value = { kind: "reset", user: u }), group: "access" }] : []),
    ...(props.onImpersonate ? [{ id: "impersonate", label: t.value.impersonate, icon: Eye, disabled: self || u.status !== "active", onSelect: () => (confirm.value = { kind: "impersonate", user: u }), group: "access" }] : []),
    ...(props.onSetDisabled
      ? [
          u.status === "disabled"
            ? { id: "enable", label: t.value.enable, icon: UserCheck, onSelect: () => void setDisabled(u, false), group: "danger" }
            : { id: "disable", label: t.value.disable, icon: UserX, danger: true, disabled: self, onSelect: () => (confirm.value = { kind: "disable", user: u }), group: "danger" },
        ]
      : []),
  ];
};
const rowLabel = (u: ManagedUser) => u.name;

async function addUser(values: NewUserValues) {
  const result = await props.onAddUser!(values);
  if (!(result && typeof result === "object" && (result.error || result.fieldErrors))) notice.value = { tone: "success", text: t.value.addedOk(values.name) };
  return result;
}
async function saveRoles(user: ManagedUser, next: string[]) {
  const result = await props.onUpdateRoles!(user, next);
  if (!(result && typeof result === "object" && result.error)) notice.value = { tone: "success", text: t.value.rolesOk(user.name) };
  return result;
}
</script>

<template>
  <div data-slot="admin-users" :class="cn('flex flex-col gap-5', props.class)">
    <NqStatGrid v-if="!props.hideStats">
      <NqStatCard :label="t.total" :value="stats.total" :loading="props.loading"><template #icon><ShieldCheck /></template></NqStatCard>
      <NqStatCard :label="t.active" :value="stats.active" :loading="props.loading"><template #icon><UserCheck /></template></NqStatCard>
      <NqStatCard :label="t.unverified" :value="stats.unverified" :loading="props.loading"><template #icon><BadgeCheck /></template></NqStatCard>
      <NqStatCard :label="t.disabled" :value="stats.disabled" :loading="props.loading"><template #icon><UserX /></template></NqStatCard>
    </NqStatGrid>

    <NqAlert v-if="notice" :tone="notice.tone" dismissible :dismiss-label="t.dismiss" @dismiss="notice = null">{{ notice.text }}</NqAlert>

    <NqDataTableBulkActions v-if="table.selection.size > 0" :table="table">
      <NqButton size="sm" variant="secondary" @click="bulk('verify')"><BadgeCheck />{{ t.selectedVerify }}</NqButton>
      <NqButton size="sm" variant="secondary" @click="bulk('disable')"><UserRoundX />{{ t.selectedDisable }}</NqButton>
    </NqDataTableBulkActions>
    <NqDataTableToolbar v-else>
      <NqDataTableSearch :table="table" :placeholder="t.search" />
      <NqDataTableFacetFilter :table="table" column="status" :title="t.status" :options="statusOptions" />
      <NqDataTableFacetFilter :table="table" column="roles" :title="t.roles" :options="roleOptions" />
      <NqDataTableFacetFilter :table="table" column="verified" :title="t.email" :options="verifiedOptions" />
      <NqDataTableViewOptions :table="table" />
      <NqButton v-if="props.onAddUser" variant="primary" size="sm" class="ms-auto" @click="adding = true"><Plus />{{ t.addUser }}</NqButton>
    </NqDataTableToolbar>

    <NqDataTable :table="table" :label="t.table" :row-label="rowLabel" :loading="props.loading" :error="props.error" :on-retry="props.onRetry" :on-row-click="props.onOpenUser" :row-actions="rowActions">
      <template #empty>
        <NqEmptyState :title="t.empty" :description="t.emptyHint">
          <template v-if="props.onAddUser" #actions><NqButton variant="primary" @click="adding = true"><Plus />{{ t.addUser }}</NqButton></template>
        </NqEmptyState>
      </template>
    </NqDataTable>
    <NqDataTablePagination :table="table" />

    <NqAddUserDialog v-if="props.onAddUser" :open="adding" :roles="props.roles" :labels="props.labels" :on-submit="addUser" @update:open="(open: boolean) => (adding = open)" />
    <NqUserRolesDialog v-if="props.onUpdateRoles" :user="editing" :roles="props.roles" :labels="props.labels" :on-save="saveRoles" @update:open="(open: boolean) => !open && (editing = null)" />

    <NqAlertDialog :open="!!confirm" @update:open="(open: boolean) => !open && !confirmBusy && (confirm = null)">
      <NqAlertDialogContent>
        <NqAlertDialogHeader>
          <NqAlertDialogTitle>{{ copy?.title }}</NqAlertDialogTitle>
          <NqAlertDialogDescription>{{ copy?.body }}</NqAlertDialogDescription>
        </NqAlertDialogHeader>
        <NqAlert v-if="confirmError" tone="danger" role="alert">{{ confirmError }}</NqAlert>
        <NqAlertDialogFooter>
          <NqButton variant="ghost" :disabled="confirmBusy" @click="confirm = null">{{ t.cancel }}</NqButton>
          <NqButton :variant="confirm?.kind === 'disable' ? 'danger' : 'primary'" :loading="confirmBusy" @click="runConfirm">{{ copy?.action }}</NqButton>
        </NqAlertDialogFooter>
      </NqAlertDialogContent>
    </NqAlertDialog>
  </div>
</template>
