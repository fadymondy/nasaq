<script setup lang="ts">
import { NqAdminUsers, type ManagedRole, type ManagedUser, type NewUserValues } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const roles: ManagedRole[] = [
  { id: "admin", label: "Admin", description: "Full access" },
  { id: "editor", label: "Editor", description: "Can edit content" },
  { id: "viewer", label: "Viewer", description: "Read only" },
];
const users = ref<ManagedUser[]>([
  { id: "u1", name: "Sara Alharbi", email: "sara@acme.test", roles: ["admin"], status: "active", verified: true, lastActive: "2026-09-28T10:00:00Z", createdAt: "2026-01-12" },
  { id: "u2", name: "Omar Nasser", email: "omar@acme.test", roles: ["editor", "viewer"], status: "active", verified: false, lastActive: null, createdAt: "2026-05-03" },
  { id: "u3", name: "Lina Haddad", email: "lina@acme.test", roles: ["viewer"], status: "disabled", verified: true, lastActive: "2026-08-01T09:00:00Z", createdAt: "2026-03-20" },
]);

const patch = (id: string, change: Partial<ManagedUser>) => (users.value = users.value.map((u) => (u.id === id ? { ...u, ...change } : u)));
async function onAddUser(v: NewUserValues) {
  users.value = [...users.value, { id: `u${users.value.length + 1}`, name: v.name, email: v.email, roles: v.roles, status: v.sendInvite ? "invited" : "active", verified: v.verified, createdAt: new Date().toISOString() }];
}
async function onVerify(u: ManagedUser) {
  patch(u.id, { verified: true });
}
async function onSetDisabled(u: ManagedUser, disabled: boolean) {
  patch(u.id, { status: disabled ? "disabled" : "active" });
}
async function onUpdateRoles(u: ManagedUser, next: string[]) {
  patch(u.id, { roles: next });
}
const noop = async () => undefined;
</script>

<template>
  <NqAdminUsers
    :users="users"
    :roles="roles"
    current-user-id="u1"
    :on-add-user="onAddUser"
    :on-verify="onVerify"
    :on-set-disabled="onSetDisabled"
    :on-reset-password="noop"
    :on-impersonate="noop"
    :on-update-roles="onUpdateRoles"
  />
</template>
