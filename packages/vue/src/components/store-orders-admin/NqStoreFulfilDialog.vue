<script setup lang="ts">
import { PackageCheck } from "lucide-vue-next";
import { computed, ref, watch } from "vue";
import { NqButton } from "../button";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqInput } from "../field";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import NqStoreQtyField from "./NqStoreQtyField.vue";
import { lineOutstanding, planFulfilment, type FulfilmentPlan, type LinePick } from "./order-math";
import type { CommerceOrder } from "./order-types";
import type { StoreAdminStrings } from "./strings";

// Ships some or all of an order: units per line, a carrier and an optional tracking number.
const props = defineProps<{
  open: boolean;
  order: CommerceOrder;
  carriers: readonly string[];
  t: StoreAdminStrings;
}>();
const emit = defineEmits<{ "update:open": [open: boolean]; confirm: [plan: FulfilmentPlan, tracking?: { carrier: string; number: string }] }>();

const start = () => Object.fromEntries(props.order.lines.map((l) => [l.id, lineOutstanding(l)])) as Record<string, number>;
const qty = ref<Record<string, number>>(start());
const carrier = ref<string>(props.carriers[0] ?? "");
const number = ref("");
watch(
  () => props.open,
  (o) => {
    if (!o) return;
    qty.value = start();
    number.value = "";
  },
);

const picks = computed<LinePick[]>(() => props.order.lines.map((l) => ({ lineId: l.id, quantity: qty.value[l.id] ?? 0 })));
const plan = computed(() => planFulfilment(props.order, { picks: picks.value, carrier: number.value.trim() || carrier.value ? carrier.value : undefined, trackingNumber: number.value }));
// A tracking number is optional, but a carrier without a number is not a shipment we can track.
const trackingIssue = computed(() => !!carrier.value && !number.value.trim() && plan.value.issues.some((i) => i.code === "tracking-number"));
const blocking = computed(() => plan.value.issues.filter((i) => i.code !== "tracking-number"));
const ok = computed(() => blocking.value.length === 0 && picks.value.some((p) => p.quantity > 0));
const shipment = computed(() => (number.value.trim() ? { carrier: carrier.value, number: number.value.trim() } : undefined));
const effective = computed(() => (ok.value ? planFulfilment(props.order, { picks: picks.value, ...(shipment.value ? { carrier: shipment.value.carrier, trackingNumber: shipment.value.number } : {}) }) : plan.value));

const setQty = (id: string, max: number, n: number) => (qty.value = { ...qty.value, [id]: Math.min(n, max) });
const submit = () => ok.value && emit("confirm", effective.value, shipment.value);
</script>

<template>
  <NqDialog :open="props.open" @update:open="(o: boolean) => emit('update:open', o)">
    <NqDialogContent class="max-w-lg">
      <form class="flex flex-col gap-4" @submit.prevent="submit">
        <NqDialogHeader>
          <NqDialogTitle>{{ props.t.fulfilTitle }}</NqDialogTitle>
          <NqDialogDescription>{{ props.t.fulfilText }}</NqDialogDescription>
        </NqDialogHeader>
        <ul class="m-0 flex list-none flex-col gap-2 p-0">
          <li v-for="line in props.order.lines" :key="line.id" class="flex flex-wrap items-center justify-between gap-2">
            <span class="min-w-0 flex-1 basis-40 truncate text-body-sm text-foreground">{{ line.name }}</span>
            <NqStoreQtyField
              :label="`${props.t.quantity}: ${line.name}`"
              :value="qty[line.id] ?? 0"
              :max="lineOutstanding(line)"
              :invalid="plan.issues.some((i) => i.code === 'line-over' && i.lineId === line.id)"
              @change="(n: number) => setQty(line.id, lineOutstanding(line), n)"
            />
          </li>
        </ul>
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="flex flex-col gap-1.5 text-label text-foreground">
            {{ props.t.carrier }}
            <NqSelect :model-value="carrier || null" @update:model-value="(v: string | number | null) => (carrier = v ? String(v) : '')">
              <NqSelectTrigger :aria-label="props.t.carrier"><NqSelectValue :placeholder="props.t.carrier" /></NqSelectTrigger>
              <NqSelectContent>
                <NqSelectItem v-for="c in props.carriers" :key="c" :value="c">{{ c }}</NqSelectItem>
              </NqSelectContent>
            </NqSelect>
          </label>
          <label class="flex flex-col gap-1.5 text-label text-foreground">
            {{ props.t.trackingNumber }}
            <NqInput v-model="number" placeholder="BST880124" ltr />
          </label>
        </div>
        <p v-if="trackingIssue" class="text-caption text-muted-foreground">{{ props.t.trackingOptional }}</p>
        <p aria-live="polite" class="text-body-sm text-muted-foreground">
          {{ ok ? (effective.completes ? props.t.willCompleteOrder : props.t.willPartlyShip) : props.t.pickUnits }}
        </p>
        <NqDialogFooter>
          <NqButton type="button" variant="secondary" @click="emit('update:open', false)">{{ props.t.cancel }}</NqButton>
          <NqButton type="submit" variant="primary" :disabled="!ok">
            <PackageCheck aria-hidden="true" />
            {{ props.t.markShipped }}
          </NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
