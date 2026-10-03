<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useCurrency, useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldDescription, NqFieldError, NqFieldLabel, NqInput, NqTextarea } from "../field";
import { formatNumber } from "../numeric";
import { NqRepeater } from "../repeater";
import { NqSwitch } from "../switch";
import { adminTenantsStrings, type AdminTenantsLabels } from "./strings";
import { adminTenantsAttempt, type AdminPlan, type AdminPlanInput, type AdminTenantResult } from "./types";

// Create or edit a plan: name, price, seat and storage limits, and a reorderable list of features.
const props = defineProps<{
  /** The plan being edited, `"new"` for a blank one, `null` to close. */
  plan: AdminPlan | "new" | null;
  currency?: string;
  /** Save. The id is empty for a new plan. Return `{ error }` to keep the dialog open. */
  onSave: (plan: AdminPlanInput) => Promise<AdminTenantResult> | AdminTenantResult;
  labels?: AdminTenantsLabels;
}>();
const emit = defineEmits<{ "update:open": [open: boolean] }>();

interface PlanForm {
  name: string;
  description: string;
  price: string;
  seats: string;
  storage: string;
  features: { text: string }[];
  visible: boolean;
}
const toForm = (p?: AdminPlan): PlanForm => ({
  name: p?.name ?? "",
  description: p?.description ?? "",
  price: p ? String(p.priceMonthly) : "0",
  seats: p?.seats == null ? "" : String(p.seats),
  storage: p?.storageGb == null ? "" : String(p.storageGb),
  features: (p?.features ?? []).map((text) => ({ text })),
  visible: p?.visible ?? true,
});
const wholeOrEmpty = (v: string) => v.trim() === "" || (/^\d+$/.test(v.trim()) && Number(v) > 0);

const nq = useNasaq();
const currency = useCurrency(() => props.currency);
const t = computed(() => ({ ...adminTenantsStrings(nq.locale.value), ...props.labels }));
const editing = computed(() => (props.plan && props.plan !== "new" ? props.plan : undefined));
const form = ref<PlanForm>(toForm(editing.value));
const errors = ref<Partial<Record<"name" | "price" | "seats" | "storage", string>>>({});
const formError = ref<string | null>(null);
const busy = ref(false);

watch(
  () => props.plan,
  (plan) => {
    if (plan) {
      form.value = toForm(plan === "new" ? undefined : plan);
      errors.value = {};
      formError.value = null;
    }
  },
);

async function submit() {
  const f = form.value;
  const next: typeof errors.value = {};
  if (!f.name.trim()) next.name = t.value.nameRequired;
  if (f.price.trim() === "" || Number.isNaN(Number(f.price)) || Number(f.price) < 0) next.price = t.value.priceInvalid;
  if (!wholeOrEmpty(f.seats)) next.seats = t.value.limitInvalid;
  if (!wholeOrEmpty(f.storage)) next.storage = t.value.limitInvalid;
  errors.value = next;
  formError.value = null;
  if (Object.keys(next).length) return;
  busy.value = true;
  const failure = await adminTenantsAttempt(() =>
    props.onSave({
      id: editing.value?.id,
      name: f.name.trim(),
      description: f.description.trim() || undefined,
      priceMonthly: Number(f.price),
      currency: editing.value?.currency ?? currency.value,
      seats: f.seats.trim() ? Number(f.seats) : null,
      storageGb: f.storage.trim() ? Number(f.storage) : null,
      features: f.features.map((x) => x.text.trim()).filter(Boolean),
      visible: f.visible,
      featured: editing.value?.featured,
    }),
  );
  busy.value = false;
  if (failure === null) emit("update:open", false);
  else formError.value = failure || t.value.failed;
}
const rowTitle = (row: { text: string }, i: number) => row.text || `${t.value.feature} ${formatNumber(i + 1, nq.locale.value)}`;
const newFeature = () => ({ text: "" });
</script>

<template>
  <NqDialog :open="!!props.plan" @update:open="(open: boolean) => !busy && emit('update:open', open)">
    <NqDialogContent class="max-h-[90dvh] max-w-xl overflow-y-auto">
      <form novalidate class="flex flex-col gap-5" @submit.prevent="submit">
        <NqDialogHeader>
          <NqDialogTitle>{{ editing ? t.editPlanTitle(editing.name) : t.createPlanTitle }}</NqDialogTitle>
          <NqDialogDescription>{{ t.planBody }}</NqDialogDescription>
        </NqDialogHeader>
        <div class="grid gap-4 sm:grid-cols-2">
          <NqField :invalid="!!errors.name" class="sm:col-span-2">
            <NqFieldLabel>{{ t.planName }}</NqFieldLabel>
            <NqInput v-model="form.name" />
            <NqFieldError :match="!!errors.name">{{ errors.name }}</NqFieldError>
          </NqField>
          <NqField class="sm:col-span-2">
            <NqFieldLabel>{{ t.planDescription }}</NqFieldLabel>
            <NqTextarea v-model="form.description" :rows="2" />
          </NqField>
          <NqField :invalid="!!errors.price">
            <NqFieldLabel>{{ `${t.price} (${editing?.currency ?? currency})` }}</NqFieldLabel>
            <NqInput v-model="form.price" ltr type="number" min="0" step="any" />
            <NqFieldError :match="!!errors.price">{{ errors.price }}</NqFieldError>
          </NqField>
          <NqField :invalid="!!errors.seats">
            <NqFieldLabel>{{ t.seatLimit }}</NqFieldLabel>
            <NqInput v-model="form.seats" ltr type="number" min="1" :placeholder="t.unlimited" />
            <NqFieldError :match="!!errors.seats">{{ errors.seats }}</NqFieldError>
          </NqField>
          <NqField :invalid="!!errors.storage">
            <NqFieldLabel>{{ t.storageLimit }}</NqFieldLabel>
            <NqInput v-model="form.storage" ltr type="number" min="1" :placeholder="t.unlimited" />
            <NqFieldError :match="!!errors.storage">{{ errors.storage }}</NqFieldError>
          </NqField>
          <NqField class="flex-row items-center justify-between gap-4 self-end rounded-control border border-border px-3 py-2.5">
            <div class="flex min-w-0 flex-col">
              <NqFieldLabel>{{ t.visible }}</NqFieldLabel>
              <NqFieldDescription>{{ t.visibleHint }}</NqFieldDescription>
            </div>
            <NqSwitch v-model="form.visible" :aria-label="t.visible" />
          </NqField>
          <div class="flex flex-col gap-2 sm:col-span-2">
            <span class="text-label text-foreground">{{ t.features }}</span>
            <NqRepeater v-model="form.features" :label="t.featuresList" :add-label="t.addFeature" :create-item="newFeature" :duplicable="false" :collapsible="false" :row-title="rowTitle">
              <template #default="{ item, update }">
                <NqInput :aria-label="t.feature" :model-value="item.text" @update:model-value="update({ text: String($event ?? '') })" />
              </template>
            </NqRepeater>
          </div>
        </div>
        <NqAlert v-if="formError" tone="danger" role="alert">{{ formError }}</NqAlert>
        <NqDialogFooter>
          <NqButton type="button" variant="ghost" :disabled="busy" @click="emit('update:open', false)">{{ t.cancel }}</NqButton>
          <NqButton type="submit" variant="primary" :loading="busy">{{ editing ? t.savePlan : t.createPlan }}</NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
