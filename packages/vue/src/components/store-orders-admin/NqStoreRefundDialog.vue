<script setup lang="ts">
import { Undo2 } from "lucide-vue-next";
import { computed, ref, watch } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqInput, NqTextarea } from "../field";
import { NqSwitch } from "../switch";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import NqStoreMoney from "./NqStoreMoney.vue";
import NqStoreQtyField from "./NqStoreQtyField.vue";
import { lineRefundable, planRefund, refundRemaining, shippingRefunded, type LinePick, type RefundPlan, type RefundRecord } from "./order-math";
import { commerceMinorFactor, type CommerceOrder } from "./order-types";
import type { StoreAdminStrings } from "./strings";

// Refunds an order by line or by amount, with shipping and restock switches and a reason.
const props = defineProps<{
  open: boolean;
  order: CommerceOrder;
  refunds: readonly RefundRecord[];
  currency: string;
  t: StoreAdminStrings;
}>();
const emit = defineEmits<{ "update:open": [open: boolean]; confirm: [plan: RefundPlan] }>();

const mode = ref<"lines" | "amount">("lines");
const qty = ref<Record<string, number>>({});
const includeShipping = ref(false);
const amountText = ref("");
const restock = ref(true);
const note = ref("");
watch(
  () => props.open,
  (o) => {
    if (!o) return;
    qty.value = {};
    includeShipping.value = false;
    amountText.value = "";
    note.value = "";
    mode.value = "lines";
  },
);

const factor = computed(() => commerceMinorFactor(props.currency));
const remaining = computed(() => refundRemaining(props.order, props.refunds));
const shippingAvailable = computed(() => props.order.totals.shipping > 0 && !shippingRefunded(props.refunds));
const amountMinor = computed(() => Math.round(Number(amountText.value) * factor.value));
const picks = computed<LinePick[]>(() => props.order.lines.map((l) => ({ lineId: l.id, quantity: qty.value[l.id] ?? 0 })));
const plan = computed(() =>
  mode.value === "lines"
    ? planRefund(props.order, props.refunds, { mode: "lines", picks: picks.value, includeShipping: includeShipping.value, restock: restock.value, note: note.value })
    : planRefund(props.order, props.refunds, { mode: "amount", amount: Number.isFinite(amountMinor.value) ? amountMinor.value : 0, note: note.value }),
);
const touched = computed(() => (mode.value === "lines" ? picks.value.some((p) => p.quantity > 0) || includeShipping.value : amountText.value !== ""));
const problem = computed(() => plan.value.issues.find((i) => i.code !== "empty"));
const message = computed<string | null>(() => {
  const p = problem.value;
  if (!touched.value || !p) return null;
  switch (p.code) {
    case "amount-over":
      return props.t.refundOver(p.max / factor.value);
    case "amount-invalid":
      return props.t.refundInvalid;
    case "line-over":
      return props.t.refundLineOver(p.max);
    case "shipping-done":
      return props.t.shippingDone;
    case "unpaid":
      return props.t.refundUnpaid;
    default:
      return null;
  }
});
const lineValue = (id: string) => plan.value.perLine.find((p) => p.lineId === id)?.amount;

const setQty = (id: string, max: number, n: number) => (qty.value = { ...qty.value, [id]: Math.min(n, max) });
const submit = () => plan.value.ok && emit("confirm", plan.value);
</script>

<template>
  <NqDialog :open="props.open" @update:open="(o: boolean) => emit('update:open', o)">
    <NqDialogContent class="max-w-lg">
      <form class="flex flex-col gap-4" @submit.prevent="submit">
        <NqDialogHeader>
          <NqDialogTitle>{{ props.t.refundTitle }}</NqDialogTitle>
          <NqDialogDescription>
            {{ props.t.refundLeft }} <NqStoreMoney :amount="remaining" :currency="props.currency" />
          </NqDialogDescription>
        </NqDialogHeader>
        <NqToggleGroup :aria-label="props.t.refundBy" :model-value="[mode]" class="grid w-full grid-cols-2" @update:model-value="(v: string[]) => v[0] && (mode = v[0] as 'lines' | 'amount')">
          <NqToggle value="lines">{{ props.t.byLines }}</NqToggle>
          <NqToggle value="amount">{{ props.t.byAmount }}</NqToggle>
        </NqToggleGroup>

        <template v-if="mode === 'lines'">
          <ul class="m-0 flex list-none flex-col gap-2 p-0">
            <li v-for="line in props.order.lines" :key="line.id" class="flex flex-wrap items-center justify-between gap-2">
              <span class="flex min-w-0 flex-1 basis-40 flex-col">
                <span class="truncate text-body-sm text-foreground">{{ line.name }}</span>
                <NqStoreMoney v-if="lineValue(line.id)" :amount="lineValue(line.id)!" :currency="props.currency" class="text-caption text-muted-foreground" />
              </span>
              <NqStoreQtyField
                :label="`${props.t.quantity}: ${line.name}`"
                :value="qty[line.id] ?? 0"
                :max="lineRefundable(line)"
                :invalid="plan.issues.some((i) => i.code === 'line-over' && i.lineId === line.id)"
                @change="(n: number) => setQty(line.id, lineRefundable(line), n)"
              />
            </li>
          </ul>
          <label :class="cn('flex items-center justify-between gap-3 text-body-sm', !shippingAvailable && 'opacity-60')">
            <span class="text-foreground">
              {{ props.t.refundShipping }} <NqStoreMoney v-if="props.order.totals.shipping > 0" :amount="props.order.totals.shipping" :currency="props.currency" class="text-muted-foreground" />
            </span>
            <NqSwitch v-model="includeShipping" :disabled="!shippingAvailable" :aria-label="props.t.refundShipping" />
          </label>
          <label class="flex items-center justify-between gap-3 text-body-sm">
            <span class="flex flex-col">
              <span class="text-foreground">{{ props.t.restock }}</span>
              <span class="text-caption text-muted-foreground">{{ props.t.restockText }}</span>
            </span>
            <NqSwitch v-model="restock" :aria-label="props.t.restock" />
          </label>
        </template>
        <label v-else class="flex flex-col gap-1.5 text-label text-foreground">
          {{ props.t.refundAmount }}
          <NqInput v-model="amountText" type="number" inputmode="decimal" min="0" :step="1 / factor" :aria-invalid="!!message || undefined" ltr placeholder="0.00" />
          <span class="text-caption text-muted-foreground">{{ props.t.byAmountText }}</span>
        </label>

        <label class="flex flex-col gap-1.5 text-label text-foreground">
          {{ props.t.reason }}
          <NqTextarea v-model="note" :rows="2" :placeholder="props.t.reasonPlaceholder" />
        </label>
        <p v-if="message" role="alert" class="text-body-sm text-nq-danger-text">{{ message }}</p>
        <p aria-live="polite" class="flex items-baseline justify-between gap-2 border-t border-border pt-3 text-body-sm">
          <span class="text-muted-foreground">{{ props.t.refundTotal }}</span>
          <NqStoreMoney :amount="plan.ok || !message ? plan.amount : 0" :currency="props.currency" class="text-h3 font-semibold text-foreground" />
        </p>
        <NqDialogFooter>
          <NqButton type="button" variant="secondary" @click="emit('update:open', false)">{{ props.t.cancel }}</NqButton>
          <NqButton type="submit" variant="primary" :disabled="!plan.ok">
            <Undo2 aria-hidden="true" />
            {{ props.t.issueRefund }}
          </NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
