<script setup lang="ts">
import { NqMembersManager, type InviteValues, type MemberRoleOption, type PendingInvite, type TeamMember } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const roles: MemberRoleOption[] = [
  { id: "owner", label: "Owner", description: "Full control, including billing" },
  { id: "admin", label: "Admin", description: "Manage members and settings" },
  { id: "member", label: "Member", description: "Work in the workspace" },
];
const members = ref<TeamMember[]>([
  { id: "m1", name: "Sara Alharbi", email: "sara@acme.test", role: "owner", joinedAt: "2025-01-12", lastActive: "2026-09-29T08:30:00Z" },
  { id: "m2", name: "Omar Nasser", email: "omar@acme.test", role: "admin", joinedAt: "2025-05-03", lastActive: "2026-09-28T10:00:00Z" },
  { id: "m3", name: "Lina Haddad", email: "lina@acme.test", role: "member", joinedAt: "2026-03-20", lastActive: null },
]);
const invites = ref<PendingInvite[]>([{ id: "i1", email: "new@acme.test", role: "member", invitedBy: "Sara Alharbi", sentAt: "2026-09-27T09:00:00Z", expiresAt: "2026-10-04T09:00:00Z" }]);

async function onInvite(v: InviteValues) {
  invites.value = [...invites.value, ...v.emails.map((email, i) => ({ id: `i${invites.value.length + i + 1}`, email, role: v.role, invitedBy: "Sara Alharbi", sentAt: "2026-09-29T09:00:00Z", expiresAt: "2026-10-06T09:00:00Z" }))];
}
async function onChangeRole(m: TeamMember, role: string) {
  members.value = members.value.map((x) => (x.id === m.id ? { ...x, role } : x));
}
async function onRemove(m: TeamMember) {
  members.value = members.value.filter((x) => x.id !== m.id);
}
async function onRevokeInvite(i: PendingInvite) {
  invites.value = invites.value.filter((x) => x.id !== i.id);
}
const noop = async () => undefined;
</script>

<template>
  <NqMembersManager
    :members="members"
    :invites="invites"
    :roles="roles"
    current-user-id="m1"
    :on-invite="onInvite"
    :on-change-role="onChangeRole"
    :on-remove="onRemove"
    :on-resend-invite="noop"
    :on-revoke-invite="onRevokeInvite"
    :on-transfer-ownership="noop"
    :on-leave="noop"
  />
</template>
