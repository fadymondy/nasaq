<script setup lang="ts">
import { Crown, LogOut, Mail, RotateCw, UserMinus, UserPlus, X } from "lucide-vue-next";
import { computed, h, onBeforeUnmount, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqAlertDialog, NqAlertDialogContent, NqAlertDialogDescription, NqAlertDialogFooter, NqAlertDialogHeader, NqAlertDialogTitle } from "../alert-dialog";
import { NqAvatar } from "../avatar";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqDataTable, NqDataTableFacetFilter, NqDataTablePagination, NqDataTableSearch, NqDataTableToolbar, useDataTable, type DataTableColumn } from "../data-table";
import { formatNumber, NqDateTime } from "../numeric";
import { NqProfileHoverCard, type PersonProfile } from "../profile-card";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqEmptyState } from "../states";
import { NqStatus } from "../status";
import { NqTabs, NqTabsIndicator, NqTabsList, NqTabsPanel, NqTabsTab } from "../tabs";
import { NqTooltip } from "../tooltip";
import NqInviteMembersDialog from "./NqInviteMembersDialog.vue";
import { canLeave, removeBlock, roleChangeBlock, roleChoices } from "./members-rules";
import { membersManagerStrings, type MembersManagerLabels } from "./strings";
import { membersAttempt, type InviteResult, type InviteValues, type MemberActionResult, type MemberRoleOption, type PendingInvite, type TeamMember } from "./types";

// Members and roles of a workspace: a searchable table with an inline role select limited to the roles you can
// grant, an invite-by-email dialog, pending invites with resend and revoke, transfer of ownership, and leave.
// The last owner is protected everywhere. Every action is an async callback and you send back the new lists.
type Confirm = { kind: "remove" | "transfer"; member: TeamMember } | { kind: "leave" };

const props = withDefaults(
  defineProps<{
    members: readonly TeamMember[];
    /** Pending invitations. The "Pending invites" tab shows when this prop is passed. */
    invites?: readonly PendingInvite[];
    roles: readonly MemberRoleOption[];
    currentUserId?: string;
    grantableRoles?: readonly string[];
    ownerRole?: string;
    canManage?: boolean;
    loading?: boolean;
    pageSize?: number;
    onInvite?: (values: InviteValues) => Promise<InviteResult> | InviteResult;
    onChangeRole?: (member: TeamMember, role: string) => Promise<MemberActionResult> | MemberActionResult;
    onRemove?: (member: TeamMember) => Promise<MemberActionResult> | MemberActionResult;
    onResendInvite?: (invite: PendingInvite) => Promise<MemberActionResult> | MemberActionResult;
    onRevokeInvite?: (invite: PendingInvite) => Promise<MemberActionResult> | MemberActionResult;
    onTransferOwnership?: (member: TeamMember) => Promise<MemberActionResult> | MemberActionResult;
    onLeave?: () => Promise<MemberActionResult> | MemberActionResult;
    /** Turns a member into the person a profile card shows. Return null to skip a row. */
    profile?: (member: TeamMember) => PersonProfile | null | undefined;
    /** Quick actions on those cards. */
    profileActions?: { onMessage?: (p: PersonProfile) => void; onMention?: (p: PersonProfile) => void; onViewProfile?: (p: PersonProfile) => void; viewerTimeZone?: string };
    labels?: MembersManagerLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { ownerRole: "owner", canManage: true, pageSize: 8, invites: undefined },
);

const nq = useNasaq();
const locale = computed(() => nq.locale.value);
const t = computed(() => ({ ...membersManagerStrings(locale.value), ...props.labels }));
const tab = ref("members");
const inviting = ref(false);
const confirm = ref<Confirm | null>(null);
const confirmBusy = ref(false);
const confirmError = ref<string | null>(null);
const busyIds = ref<ReadonlySet<string>>(new Set());
const notice = ref<{ tone: "success" | "danger"; text: string } | null>(null);
let timer: ReturnType<typeof setTimeout> | undefined;
watch(notice, (v) => {
  clearTimeout(timer);
  if (v) timer = setTimeout(() => (notice.value = null), 6000);
});
onBeforeUnmount(() => clearTimeout(timer));

const roleLabel = computed(() => new Map(props.roles.map((r) => [r.id, r.label])));
const me = computed(() => props.members.find((m) => m.id === props.currentUserId));
const iAmOwner = computed(() => me.value?.role === props.ownerRole);
const grantable = computed(() => props.grantableRoles ?? props.roles.filter((r) => r.id !== props.ownerRole).map((r) => r.id));
const inviteRoles = computed(() => props.roles.filter((r) => grantable.value.includes(r.id) && r.id !== props.ownerRole));
const reasonText = computed(() => ({ "self-last-owner": t.value.blockLastOwner, "owner-only": t.value.blockOwnerOnly, "not-grantable": t.value.blockNotGrantable, self: t.value.blockSelf }) as const);

function report(failure: string | null, ok: string) {
  notice.value = failure === null ? { tone: "success", text: ok } : { tone: "danger", text: failure || t.value.failed };
  return failure === null;
}
async function withBusy(id: string, fn: () => Promise<void>) {
  busyIds.value = new Set(busyIds.value).add(id);
  try {
    await fn();
  } finally {
    const next = new Set(busyIds.value);
    next.delete(id);
    busyIds.value = next;
  }
}
const resend = (i: PendingInvite) => withBusy(i.id, async () => void report(await membersAttempt(() => props.onResendInvite?.(i)), t.value.resentOk(i.email)));
const revokeInvite = (i: PendingInvite) => withBusy(i.id, async () => void report(await membersAttempt(() => props.onRevokeInvite?.(i)), t.value.revokedOk(i.email)));

const muted = "text-body-sm text-muted-foreground";
const columns = computed<DataTableColumn<TeamMember>[]>(() => [
  {
    id: "member",
    header: t.value.member,
    label: t.value.member,
    hideable: false,
    sortValue: (m) => m.name,
    searchValue: (m) => `${m.name} ${m.email}`,
    cell: (m) => {
      const identity = h("div", { class: "flex min-w-0 items-center gap-3" }, [
        h(NqAvatar, { name: m.name, src: m.avatar, size: "sm" }),
        h("div", { class: "flex min-w-0 flex-col" }, [
          h("span", { class: "flex items-center gap-1.5 truncate text-label text-foreground" }, [m.name, m.id === props.currentUserId ? h(NqBadge, { variant: "outline" }, () => t.value.you) : null]),
          h("bdi", { dir: "ltr", class: "truncate text-caption text-muted-foreground" }, m.email),
        ]),
      ]);
      const person = props.profile?.(m);
      if (!person) return identity;
      return h(NqProfileHoverCard, { person, ...props.profileActions }, () =>
        h(
          "button",
          { type: "button", "data-slot": "member-profile-trigger", class: "min-w-0 max-w-full rounded-control text-start outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus" },
          [identity],
        ),
      );
    },
  },
  {
    id: "role",
    header: t.value.role,
    label: t.value.role,
    sortValue: (m) => props.roles.findIndex((r) => r.id === m.role),
    filterValue: (m) => m.role,
    cell: (m) => {
      const block = !props.canManage || !props.onChangeRole ? "not-grantable" : roleChangeBlock(m, props.members, grantable.value, props.ownerRole);
      const choices = roleChoices(m, props.roles, grantable.value, props.ownerRole);
      if (block) {
        const badge = h(
          NqBadge,
          { variant: m.role === props.ownerRole ? "accent" : "neutral", tabindex: 0, "aria-label": `${t.value.roleFor(m.name)}: ${roleLabel.value.get(m.role) ?? m.role}` },
          () => [m.role === props.ownerRole ? h(Crown, { "aria-hidden": "true" }) : null, roleLabel.value.get(m.role) ?? m.role],
        );
        return props.canManage && props.onChangeRole && block !== "not-grantable" ? h(NqTooltip, { content: reasonText.value[block] }, () => badge) : badge;
      }
      return h(
        NqSelect,
        {
          modelValue: m.role,
          disabled: busyIds.value.has(m.id),
          "onUpdate:modelValue": (next: string | number | null) => {
            if (!next || next === m.role) return;
            void withBusy(m.id, async () => {
              report(await membersAttempt(() => props.onChangeRole?.(m, String(next))), t.value.roleOk(m.name));
            });
          },
        },
        () => [
          h(NqSelectTrigger, { "aria-label": t.value.roleFor(m.name), class: "h-control-sm w-40" }, () => h(NqSelectValue)),
          h(NqSelectContent, null, () => choices.map((r) => h(NqSelectItem, { key: r.id, value: r.id }, () => r.label))),
        ],
      );
    },
  },
  {
    id: "lastActive",
    header: t.value.lastActive,
    label: t.value.lastActive,
    sortValue: (m) => (m.lastActive ? new Date(m.lastActive) : null),
    cell: (m) => (m.lastActive ? h(NqDateTime, { value: m.lastActive, relative: true, class: muted }) : h("span", { class: muted }, t.value.never)),
  },
  {
    id: "joined",
    header: t.value.joined,
    label: t.value.joined,
    align: "end",
    sortValue: (m) => new Date(m.joinedAt),
    cell: (m) => h(NqDateTime, { value: m.joinedAt, format: { dateStyle: "medium" }, class: muted }),
  },
]);

const table = useDataTable({ data: () => props.members as TeamMember[], columns: () => columns.value, getRowId: (m) => m.id, pageSize: props.pageSize, defaultSort: { id: "joined", direction: "asc" } });

async function runConfirm() {
  const c = confirm.value;
  if (!c) return;
  confirmBusy.value = true;
  confirmError.value = null;
  const failure = await membersAttempt(() => (c.kind === "remove" ? props.onRemove?.(c.member) : c.kind === "transfer" ? props.onTransferOwnership?.(c.member) : props.onLeave?.()));
  confirmBusy.value = false;
  if (failure === null) {
    if (c.kind === "remove") notice.value = { tone: "success", text: t.value.removedOk(c.member.name) };
    else if (c.kind === "transfer") notice.value = { tone: "success", text: t.value.transferredOk(c.member.name) };
    confirm.value = null;
  } else confirmError.value = failure || t.value.failed;
}
function closeConfirm() {
  confirm.value = null;
  confirmError.value = null;
}
const copy = computed(() => {
  const c = confirm.value;
  if (c?.kind === "remove") return { title: t.value.removeTitle(c.member.name), body: t.value.removeBody, action: t.value.removeConfirm, danger: true };
  if (c?.kind === "transfer") return { title: t.value.transferTitle(c.member.name), body: t.value.transferBody, action: t.value.transferConfirm, danger: false };
  return { title: t.value.leaveTitle, body: t.value.leaveBody, action: t.value.leaveConfirm, danger: true };
});

const roleOptions = computed(() => props.roles.map((r) => ({ value: r.id, label: r.label })));
const rowActions = (m: TeamMember) => {
  if (!props.canManage) return [];
  const reason = removeBlock(m, props.members, props.currentUserId, props.ownerRole);
  return [
    ...(props.onTransferOwnership && iAmOwner.value && m.role !== props.ownerRole ? [{ id: "transfer", label: t.value.transfer, icon: Crown, onSelect: () => (confirm.value = { kind: "transfer", member: m }), group: "ownership" }] : []),
    ...(props.onRemove
      ? [{ id: "remove", label: reason && reason !== "self" ? `${t.value.remove.replace("…", "")} — ${reasonText.value[reason]}` : t.value.remove, icon: UserMinus, danger: true, disabled: !!reason, onSelect: () => (confirm.value = { kind: "remove", member: m }), group: "danger" }]
      : []),
  ];
};

const showInvites = computed(() => props.invites !== undefined);
const pendingCount = computed(() => props.invites?.length ?? 0);
const isExpired = (i: PendingInvite) => (i.expiresAt ? new Date(i.expiresAt).getTime() < Date.now() : false);
const num = (n: number) => formatNumber(n, locale.value);

async function invite(values: InviteValues) {
  const result = await props.onInvite!(values);
  if (!(result && typeof result === "object" && (result.error || result.emailsError))) notice.value = { tone: "success", text: t.value.invitedOk(num(values.emails.length)) };
  return result;
}
</script>

<template>
  <div data-slot="members-manager" :class="cn('flex flex-col gap-5', props.class)">
    <NqAlert v-if="notice" :tone="notice.tone" dismissible :dismiss-label="t.dismiss" @dismiss="notice = null">{{ notice.text }}</NqAlert>

    <NqTabs :model-value="tab" @update:model-value="(v: string | number | null) => v && (tab = String(v))">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <NqTabsList v-if="showInvites" :aria-label="t.title">
          <NqTabsTab value="members">{{ t.members }} <span class="text-muted-foreground">{{ num(props.members.length) }}</span></NqTabsTab>
          <NqTabsTab value="pending">{{ t.pending }} <span class="text-muted-foreground">{{ num(pendingCount) }}</span></NqTabsTab>
          <NqTabsIndicator />
        </NqTabsList>
        <h2 v-else class="text-h3 text-foreground">{{ t.members }} <span class="text-muted-foreground">{{ num(props.members.length) }}</span></h2>
        <NqButton v-if="props.canManage && props.onInvite" variant="primary" :disabled="!inviteRoles.length" @click="inviting = true"><UserPlus />{{ t.invite }}</NqButton>
      </div>
      <NqTabsPanel value="members" class="mt-4">
        <div class="flex flex-col gap-4">
          <NqDataTableToolbar>
            <NqDataTableSearch :table="table" :placeholder="t.search" />
            <NqDataTableFacetFilter :table="table" column="role" :title="t.role" :options="roleOptions" />
          </NqDataTableToolbar>
          <NqDataTable :table="table" :label="t.table" :row-label="(m: TeamMember) => m.name" :loading="props.loading" :row-actions="rowActions">
            <template #empty><NqEmptyState :title="t.empty" :description="t.emptyHint" /></template>
          </NqDataTable>
          <NqDataTablePagination :table="table" />
        </div>
      </NqTabsPanel>
      <NqTabsPanel v-if="showInvites" value="pending" class="mt-4">
        <ul v-if="pendingCount" :aria-label="t.inviteList" class="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
          <li v-for="i in props.invites" :key="i.id" class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
            <span aria-hidden="true" class="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground"><Mail class="size-4" /></span>
            <div class="flex min-w-0 flex-1 flex-col">
              <bdi dir="ltr" class="truncate text-label text-foreground">{{ i.email }}</bdi>
              <span class="text-caption text-muted-foreground">
                {{ i.invitedBy ? `${t.invitedBy(i.invitedBy)} · ` : "" }}{{ t.sent }} <NqDateTime :value="i.sentAt" relative />
              </span>
            </div>
            <NqBadge variant="neutral">{{ roleLabel.get(i.role) ?? i.role }}</NqBadge>
            <NqStatus v-if="i.expiresAt" :tone="isExpired(i) ? 'danger' : 'info'" class="text-caption">
              <template v-if="isExpired(i)">{{ t.expired }}</template>
              <template v-else>{{ t.expiresIn }} <NqDateTime :value="i.expiresAt" relative /></template>
            </NqStatus>
            <div v-if="props.canManage" class="flex items-center gap-1">
              <NqButton v-if="props.onResendInvite" size="sm" variant="secondary" :loading="busyIds.has(i.id)" @click="resend(i)"><RotateCw />{{ t.resend }}</NqButton>
              <NqButton v-if="props.onRevokeInvite" size="sm" variant="ghost" :disabled="busyIds.has(i.id)" @click="revokeInvite(i)"><X />{{ t.revoke }}</NqButton>
            </div>
          </li>
        </ul>
        <NqEmptyState v-else :icon="Mail" :title="t.noInvites" :description="t.noInvitesHint" />
      </NqTabsPanel>
    </NqTabs>

    <div v-if="props.onLeave && me" data-slot="members-leave" class="flex flex-col gap-3 rounded-card border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex min-w-0 flex-col gap-0.5">
        <span class="text-label text-foreground">{{ t.leave }}</span>
        <span class="text-body-sm text-muted-foreground">{{ canLeave(me, props.members, props.ownerRole) ? t.leaveHint : t.leaveBlocked }}</span>
      </div>
      <NqButton variant="danger" class="shrink-0" :disabled="!canLeave(me, props.members, props.ownerRole)" @click="confirm = { kind: 'leave' }"><LogOut class="rtl:-scale-x-100" />{{ t.leave }}</NqButton>
    </div>

    <NqInviteMembersDialog v-if="props.onInvite" :open="inviting" :roles="inviteRoles" :labels="props.labels" :on-submit="invite" @update:open="(o: boolean) => (inviting = o)" />

    <NqAlertDialog :open="!!confirm" @update:open="(open: boolean) => !open && !confirmBusy && closeConfirm()">
      <NqAlertDialogContent>
        <NqAlertDialogHeader>
          <NqAlertDialogTitle>{{ copy.title }}</NqAlertDialogTitle>
          <NqAlertDialogDescription>{{ copy.body }}</NqAlertDialogDescription>
        </NqAlertDialogHeader>
        <NqAlert v-if="confirmError" tone="danger" role="alert">{{ confirmError }}</NqAlert>
        <NqAlertDialogFooter>
          <NqButton variant="ghost" :disabled="confirmBusy" @click="closeConfirm">{{ t.cancel }}</NqButton>
          <NqButton :variant="copy.danger ? 'danger' : 'primary'" :loading="confirmBusy" @click="runConfirm">{{ copy.action }}</NqButton>
        </NqAlertDialogFooter>
      </NqAlertDialogContent>
    </NqAlertDialog>
  </div>
</template>
