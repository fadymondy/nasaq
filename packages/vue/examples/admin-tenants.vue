<script setup lang="ts">
import { NqAdminPlans, NqAdminWorkspaces, type AdminPlan, type AdminWorkspace } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const plans = ref<AdminPlan[]>([
  { id: "free", name: "Free", description: "For trying things out", priceMonthly: 0, seats: 3, storageGb: 1, features: ["Community support"], visible: true, subscribers: 14 },
  { id: "team", name: "Team", description: "For growing teams", priceMonthly: 29, seats: 15, storageGb: 50, features: ["Priority support", "Audit log"], visible: true, subscribers: 6, featured: true },
  { id: "scale", name: "Scale", description: "No limits", priceMonthly: 99, seats: null, storageGb: null, features: ["SSO", "Dedicated manager"], visible: false, subscribers: 1 },
]);
const workspaces = ref<AdminWorkspace[]>([
  { id: "w1", name: "Acme Co", slug: "acme", owner: { name: "Sara Alharbi", email: "sara@acme.test" }, planId: "team", status: "active", seatsUsed: 12, createdAt: "2026-03-02" },
  { id: "w2", name: "Globex", slug: "globex", owner: { name: "Omar Nasser", email: "omar@globex.test" }, planId: "free", status: "trial", seatsUsed: 3, createdAt: "2026-09-20", trialEndsAt: "2026-10-04" },
  { id: "w3", name: "Initech", slug: "initech", owner: { name: "Lina Haddad", email: "lina@initech.test" }, planId: "scale", status: "suspended", seatsUsed: 40, createdAt: "2026-01-11" },
]);

async function onChangePlan(workspace: AdminWorkspace, planId: string) {
  workspaces.value = workspaces.value.map((w) => (w.id === workspace.id ? { ...w, planId } : w));
}
async function onSetSuspended(workspace: AdminWorkspace, suspended: boolean) {
  workspaces.value = workspaces.value.map((w) => (w.id === workspace.id ? { ...w, status: suspended ? "suspended" : "active" } : w));
}
async function onSavePlan(plan: Omit<AdminPlan, "id" | "subscribers"> & { id?: string }) {
  if (plan.id) plans.value = plans.value.map((p) => (p.id === plan.id ? { ...p, ...plan, id: p.id } : p));
  else plans.value = [...plans.value, { ...plan, id: `p${plans.value.length + 1}`, subscribers: 0 }];
}
</script>

<template>
  <div class="flex flex-col gap-8">
    <NqAdminWorkspaces :workspaces="workspaces" :plans="plans" :on-change-plan="onChangePlan" :on-set-suspended="onSetSuspended" :on-open="() => undefined" />
    <NqAdminPlans :plans="plans" :on-save-plan="onSavePlan" />
  </div>
</template>
