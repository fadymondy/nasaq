<script setup lang="ts">
import { Plus } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import NqStockMovementList from "./NqStockMovementList.vue";
import NqStockOnHand from "./NqStockOnHand.vue";
import NqStockRecordDialog, { type StockRecordPreset } from "./NqStockRecordDialog.vue";
import type { StockMovement, StockProduct, StockWarehouse } from "./stock-math";
import { useStockLedgerStrings, type StockLedgerLabels } from "./strings";

// On-hand per warehouse from receive, issue and adjust movements, a movement list with a running balance for the product you pick,
// and a dialog to record a movement.
interface Props {
  products: readonly StockProduct[];
  warehouses: readonly StockWarehouse[];
  /** Every movement. On-hand is computed from these and nothing else. */
  movements: readonly StockMovement[];
  /**
   * Called with what the dialog produced: one movement, or two for a transfer (an issue and a receive sharing a
   * reference). Add them to your data. Throw to keep the dialog open with an error. Omit it for a read-only ledger.
   */
  onRecord?: (movements: StockMovement[]) => void | Promise<void>;
  /** ISO date. On-hand ignores later movements. */
  asOf?: string;
  labels?: StockLedgerLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { onRecord: undefined, asOf: undefined, labels: undefined });
const { t } = useStockLedgerStrings(() => props.labels);

const ALL = "__all__";
const productId = ref(props.products[0]?.id ?? "");
const warehouseId = ref(ALL);
const dialog = ref<{ open: boolean; preset: StockRecordPreset }>({ open: false, preset: { type: "receive" } });
const current = computed(() => (props.products.some((p) => p.id === productId.value) ? productId.value : (props.products[0]?.id ?? "")));
const openRecord = (preset: StockRecordPreset) => (dialog.value = { open: true, preset });
</script>

<template>
  <section data-slot="stock-ledger" :class="cn('flex w-full min-w-0 flex-col gap-6', props.class)">
    <div class="flex min-w-0 flex-col gap-3">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-title-sm text-foreground">{{ t.onHand }}</h2>
        <NqButton v-if="props.onRecord" @click="openRecord({ type: 'receive', productId: current })">
          <Plus aria-hidden="true" />
          {{ t.record }}
        </NqButton>
      </div>
      <NqStockOnHand
        :products="props.products"
        :warehouses="props.warehouses"
        :movements="props.movements"
        :as-of="props.asOf"
        :selected-product-id="current"
        :labels="props.labels"
        :on-select-product="(p: StockProduct) => (productId = p.id)"
        :on-record-for="props.onRecord ? (type, p) => openRecord({ type, productId: p.id }) : undefined"
      />
      <p class="text-caption text-muted-foreground">{{ t.reorderNote }}</p>
    </div>
    <div v-if="props.products.length > 0" class="flex min-w-0 flex-col gap-3">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-title-sm text-foreground">{{ t.movements }}</h2>
        <div class="flex flex-wrap gap-2">
          <NqSelect :model-value="current" @update:model-value="(v: string | number | null) => v && (productId = String(v))">
            <NqSelectTrigger :aria-label="t.filterProduct" class="min-w-44"><NqSelectValue /></NqSelectTrigger>
            <NqSelectContent>
              <NqSelectItem v-for="p in props.products" :key="p.id" :value="p.id">{{ p.name }}</NqSelectItem>
            </NqSelectContent>
          </NqSelect>
          <NqSelect :model-value="warehouseId" @update:model-value="(v: string | number | null) => (warehouseId = v ? String(v) : ALL)">
            <NqSelectTrigger :aria-label="t.filterWarehouse" class="min-w-44"><NqSelectValue /></NqSelectTrigger>
            <NqSelectContent>
              <NqSelectItem :value="ALL">{{ t.allWarehouses }}</NqSelectItem>
              <NqSelectItem v-for="w in props.warehouses" :key="w.id" :value="w.id">{{ w.name }}</NqSelectItem>
            </NqSelectContent>
          </NqSelect>
        </div>
      </div>
      <NqStockMovementList
        :products="props.products"
        :warehouses="props.warehouses"
        :movements="props.movements"
        :product-id="current"
        :warehouse-id="warehouseId === ALL ? '' : warehouseId"
        :labels="props.labels"
      />
    </div>
    <NqStockRecordDialog
      v-if="props.onRecord"
      v-model:open="dialog.open"
      :preset="dialog.preset"
      :products="props.products"
      :warehouses="props.warehouses"
      :movements="props.movements"
      :t="t"
      :on-record="props.onRecord"
    />
  </section>
</template>
