<script setup lang="ts">
import { Pencil, Plus } from "lucide-vue-next";
import { computed, onBeforeUnmount, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency, useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { formatNumber } from "../numeric";
import { NqPlanCard, NqPlanGrid } from "../plan-card";
import { NqPrice } from "../price";
import { NqEmptyState } from "../states";
import NqPlanDialog from "./NqPlanDialog.vue";
import { adminTenantsStrings, type AdminTenantsLabels } from "./strings";
import type { AdminPlan, AdminPlanInput, AdminTenantResult } from "./types";

// The plan catalogue: each plan as a card with price, limits and how many workspaces use it, and a dialog to edit or add.
const props = defineProps<{
  plans: readonly AdminPlan[];
  /** Enables the New plan button and the plan dialog. */
  onSavePlan?: (plan: AdminPlanInput) => Promise<AdminTenantResult> | AdminTenantResult;
  /** Default currency for new plans. */
  currency?: string;
  labels?: AdminTenantsLabels;
  class?: HTMLAttributes["class"];
}>();

const nq = useNasaq();
const currency = useCurrency(() => props.currency);
const t = computed(() => ({ ...adminTenantsStrings(nq.locale.value), ...props.labels }));
const n = (v: number) => formatNumber(v, nq.locale.value);
const editing = ref<AdminPlan | "new" | null>(null);
const notice = ref<{ tone: "success" | "danger"; text: string } | null>(null);
let timer: ReturnType<typeof setTimeout> | undefined;
watch(notice, (v) => {
  clearTimeout(timer);
  if (v) timer = setTimeout(() => (notice.value = null), 6000);
});
onBeforeUnmount(() => clearTimeout(timer));

const featuresOf = (plan: AdminPlan) => [
  plan.seats === null ? t.value.seatsUnlimited : t.value.seatsLimit(n(plan.seats)),
  plan.storageGb === null ? t.value.storageUnlimited : t.value.storage(n(plan.storageGb)),
  ...plan.features,
];
async function save(values: AdminPlanInput): Promise<AdminTenantResult> {
  const result = await props.onSavePlan?.(values);
  if (!(result && typeof result === "object" && result.error)) notice.value = { tone: "success", text: values.id ? t.value.planSavedOk(values.name) : t.value.planCreatedOk(values.name) };
  return result;
}
</script>

<template>
  <div data-slot="admin-plans" :class="cn('flex flex-col gap-5', props.class)">
    <div v-if="props.onSavePlan" class="flex justify-end">
      <NqButton variant="primary" @click="editing = 'new'"><Plus />{{ t.newPlanButton }}</NqButton>
    </div>
    <NqAlert v-if="notice" :tone="notice.tone" dismissible :dismiss-label="t.dismiss" @dismiss="notice = null">{{ notice.text }}</NqAlert>
    <NqEmptyState v-if="props.plans.length === 0" :title="t.plansEmpty" :description="t.plansEmptyHint" />
    <NqPlanGrid v-else class="@3xl:auto-cols-fr @3xl:grid-flow-row @3xl:grid-cols-2 @5xl:grid-cols-3">
      <NqPlanCard v-for="plan in props.plans" :key="plan.id" :highlighted="plan.featured" :name="plan.name" :description="plan.description" :price-note="t.subscribers(n(plan.subscribers ?? 0))" :features="featuresOf(plan)">
        <template v-if="!plan.visible" #badge><NqBadge variant="outline">{{ t.inactive }}</NqBadge></template>
        <template #price><NqPrice size="lg" :amount="plan.priceMonthly" :currency="plan.currency ?? currency" period="month" /></template>
        <template v-if="props.onSavePlan" #action><NqButton variant="secondary" @click="editing = plan"><Pencil />{{ t.editPlan }}</NqButton></template>
      </NqPlanCard>
    </NqPlanGrid>
    <NqPlanDialog v-if="props.onSavePlan" :plan="editing" :currency="currency" :labels="props.labels" :on-save="save" @update:open="(open: boolean) => !open && (editing = null)" />
  </div>
</template>
