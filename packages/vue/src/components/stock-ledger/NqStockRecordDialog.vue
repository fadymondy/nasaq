<script setup lang="ts">
import { ArrowLeftRight, ArrowRightFromLine, ArrowRightToLine, SlidersHorizontal } from "lucide-vue-next";
import { computed, ref, watch } from "vue";
import { NqButton } from "../button";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqInput } from "../field";
import { NqLineItemDecimalField } from "../line-item-editor";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import NqStockQty from "./NqStockQty.vue";
import { stockCanIssue, stockCellKey, stockOnHand, stockSignedQuantity, stockTransfer, type StockMovement, type StockMovementType, type StockProduct, type StockWarehouse } from "./stock-math";
import type { StockLedgerStrings } from "./strings";

// The dialog that records one movement, or two for a transfer. Stock changes only through movements.
export type StockRecordKind = StockMovementType | "transfer";
export interface StockRecordPreset {
  type: StockRecordKind;
  productId?: string;
  warehouseId?: string;
}

interface Props {
  open: boolean;
  preset: StockRecordPreset;
  products: readonly StockProduct[];
  warehouses: readonly StockWarehouse[];
  movements: readonly StockMovement[];
  t: StockLedgerStrings;
  onRecord: (movements: StockMovement[]) => void | Promise<void>;
}
const props = defineProps<Props>();
const emit = defineEmits<{ "update:open": [open: boolean] }>();

let counter = 0;
const newId = () => `mv-${Date.now().toString(36)}-${(counter++).toString(36)}`;
const today = () => new Date().toISOString().slice(0, 10);
const TYPE_ICON = { receive: ArrowRightToLine, issue: ArrowRightFromLine, adjust: SlidersHorizontal, transfer: ArrowLeftRight } as const;

const kind = ref<StockRecordKind>(props.preset.type);
const productId = ref(props.preset.productId ?? "");
const warehouseId = ref(props.preset.warehouseId ?? props.warehouses[0]?.id ?? "");
const toId = ref("");
const qty = ref<number | null>(null); // thousandths
const dir = ref<"increase" | "decrease">("increase");
const day = ref(today());
const reference = ref("");
const note = ref("");
const touched = ref(false);
const busy = ref(false);
const failed = ref(false);

watch(
  () => [props.open, props.preset] as const,
  ([open]) => {
    if (!open) return;
    kind.value = props.preset.type;
    productId.value = props.preset.productId ?? "";
    warehouseId.value = props.preset.warehouseId ?? props.warehouses[0]?.id ?? "";
    toId.value = "";
    qty.value = null;
    dir.value = "increase";
    day.value = today();
    reference.value = "";
    note.value = "";
    touched.value = false;
    failed.value = false;
  },
  { immediate: true },
);

const quantity = computed(() => (qty.value ?? 0) / 1000);
const outgoing = computed(() => kind.value === "issue" || kind.value === "transfer" || (kind.value === "adjust" && dir.value === "decrease"));
const available = computed(() => (productId.value && warehouseId.value ? (stockOnHand(props.movements).get(stockCellKey(productId.value, warehouseId.value)) ?? 0) : 0));
const product = computed(() => props.products.find((p) => p.id === productId.value));
const error = computed<string | null>(() => {
  if (!productId.value) return props.t.errProduct;
  if (!warehouseId.value || (kind.value === "transfer" && !toId.value)) return props.t.errWarehouse;
  if (kind.value === "transfer" && toId.value === warehouseId.value) return props.t.errSame;
  if (quantity.value <= 0) return props.t.errQuantity;
  if (outgoing.value && !stockCanIssue(props.movements, productId.value, warehouseId.value, quantity.value)) return props.t.errStock.replace("{n}", String(available.value));
  return null;
});

async function submit() {
  touched.value = true;
  if (error.value) return;
  const date = `${day.value}T${new Date().toTimeString().slice(0, 8)}`;
  const base = { date, productId: productId.value, reference: reference.value.trim() || undefined, note: note.value.trim() || undefined };
  const k = kind.value;
  const out: StockMovement[] =
    k === "transfer"
      ? stockTransfer({ id: newId(), ...base, fromWarehouseId: warehouseId.value, toWarehouseId: toId.value, quantity: quantity.value })
      : [{ ...base, id: newId(), warehouseId: warehouseId.value, type: k, quantity: stockSignedQuantity(k, k === "adjust" && dir.value === "decrease" ? -quantity.value : quantity.value) }];
  busy.value = true;
  failed.value = false;
  try {
    await props.onRecord(out);
    emit("update:open", false);
  } catch {
    failed.value = true;
  } finally {
    busy.value = false;
  }
}
const KINDS = ["receive", "issue", "adjust", "transfer"] as const;
const pick = (set: (v: string) => void) => (v: string | number | null) => set(v ? String(v) : "");
</script>

<template>
  <NqDialog :open="props.open" @update:open="(o: boolean) => !busy && emit('update:open', o)">
    <NqDialogContent data-slot="stock-record" class="max-w-lg">
      <form class="flex flex-col gap-4" novalidate @submit.prevent="submit">
        <NqDialogHeader>
          <NqDialogTitle>{{ props.t.record }}</NqDialogTitle>
          <NqDialogDescription>{{ props.t.recordText }}</NqDialogDescription>
        </NqDialogHeader>
        <NqToggleGroup :aria-label="props.t.movementType" :model-value="[kind]" class="grid w-full grid-cols-4" @update:model-value="(v: string[]) => v[0] && (kind = v[0] as StockRecordKind)">
          <NqToggle v-for="k in KINDS" :key="k" :value="k" class="flex-col gap-1 py-2 @container">
            <component :is="TYPE_ICON[k]" aria-hidden="true" />
            <span class="text-caption">{{ props.t[k] }}</span>
          </NqToggle>
        </NqToggleGroup>
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="flex flex-col gap-1.5 text-label text-foreground sm:col-span-2">
            {{ props.t.product }}
            <NqSelect :model-value="productId || null" @update:model-value="pick((v) => (productId = v))">
              <NqSelectTrigger :aria-label="props.t.product" :aria-invalid="(touched && !productId) || undefined"><NqSelectValue :placeholder="props.t.product" /></NqSelectTrigger>
              <NqSelectContent>
                <NqSelectItem v-for="p in props.products" :key="p.id" :value="p.id">{{ p.name }}</NqSelectItem>
              </NqSelectContent>
            </NqSelect>
          </label>
          <label class="flex flex-col gap-1.5 text-label text-foreground">
            {{ kind === "transfer" ? props.t.from : props.t.warehouse }}
            <NqSelect :model-value="warehouseId || null" @update:model-value="pick((v) => (warehouseId = v))">
              <NqSelectTrigger :aria-label="kind === 'transfer' ? props.t.from : props.t.warehouse"><NqSelectValue :placeholder="props.t.warehouse" /></NqSelectTrigger>
              <NqSelectContent>
                <NqSelectItem v-for="w in props.warehouses" :key="w.id" :value="w.id">{{ w.name }}</NqSelectItem>
              </NqSelectContent>
            </NqSelect>
          </label>
          <label v-if="kind === 'transfer'" class="flex flex-col gap-1.5 text-label text-foreground">
            {{ props.t.to }}
            <NqSelect :model-value="toId || null" @update:model-value="pick((v) => (toId = v))">
              <NqSelectTrigger :aria-label="props.t.to" :aria-invalid="(touched && (!toId || toId === warehouseId)) || undefined"><NqSelectValue :placeholder="props.t.warehouse" /></NqSelectTrigger>
              <NqSelectContent>
                <NqSelectItem v-for="w in props.warehouses.filter((x) => x.id !== warehouseId)" :key="w.id" :value="w.id">{{ w.name }}</NqSelectItem>
              </NqSelectContent>
            </NqSelect>
          </label>
          <div v-if="kind === 'adjust'" class="flex flex-col gap-1.5 text-label text-foreground">
            <span id="stock-dir">{{ props.t.direction }}</span>
            <NqToggleGroup aria-labelledby="stock-dir" :model-value="[dir]" class="grid w-full grid-cols-2" @update:model-value="(v: string[]) => v[0] && (dir = v[0] as 'increase' | 'decrease')">
              <NqToggle value="increase">{{ props.t.increase }}</NqToggle>
              <NqToggle value="decrease">{{ props.t.decrease }}</NqToggle>
            </NqToggleGroup>
          </div>
          <label class="flex flex-col gap-1.5 text-label text-foreground">
            {{ props.t.quantity }}
            <NqLineItemDecimalField
              :ariaLabel="props.t.quantity"
              :value="qty"
              :scale="3"
              :min="0"
              :format="(v: number) => String(v / 1000)"
              :suffix="product?.unit"
              :invalid="touched && quantity <= 0"
              @change="(v: number | null) => (qty = v)"
            />
          </label>
          <label class="flex flex-col gap-1.5 text-label text-foreground">
            {{ props.t.date }}
            <NqInput v-model="day" type="date" ltr />
          </label>
          <label class="flex flex-col gap-1.5 text-label text-foreground">
            {{ props.t.reference }}
            <NqInput v-model="reference" ltr :placeholder="props.t.referencePlaceholder" />
          </label>
          <label class="flex flex-col gap-1.5 text-label text-foreground sm:col-span-2">
            {{ props.t.note }}
            <NqInput v-model="note" />
          </label>
        </div>
        <p v-if="productId && warehouseId" class="flex items-center justify-between gap-3 text-caption text-muted-foreground">
          <span>{{ props.t.available }}</span>
          <NqStockQty :value="available" class="text-body-sm font-medium text-foreground" />
        </p>
        <div aria-live="polite" class="min-h-5">
          <p v-if="touched && error" role="alert" class="text-caption text-danger">{{ error }}</p>
          <p v-else-if="failed" role="alert" class="text-caption text-danger">{{ props.t.errSave }}</p>
        </div>
        <NqDialogFooter>
          <NqButton type="button" variant="secondary" :disabled="busy" @click="emit('update:open', false)">{{ props.t.cancel }}</NqButton>
          <NqButton type="submit" :loading="busy">{{ props.t.save }}</NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
