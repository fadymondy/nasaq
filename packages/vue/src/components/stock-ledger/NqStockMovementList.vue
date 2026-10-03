<script setup lang="ts">
import { ListTree } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { NqEmptyState } from "../states";
import NqStockQty from "./NqStockQty.vue";
import { stockStatement, type StockMovement, type StockMovementType, type StockProduct, type StockWarehouse } from "./stock-math";
import { stockDate, useStockLedgerStrings, type StockLedgerLabels } from "./strings";

// The movements of one product in time order, each with the balance it leaves.
interface Props {
  products: readonly StockProduct[];
  warehouses: readonly StockWarehouse[];
  movements: readonly StockMovement[];
  /** The product to follow. The running balance is for this product. */
  productId: string;
  /** One warehouse, or all of them when empty. */
  warehouseId?: string;
  labels?: StockLedgerLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { warehouseId: undefined, labels: undefined });
const { t, locale } = useStockLedgerStrings(() => props.labels);
const rows = computed(() => stockStatement(props.movements, { productId: props.productId, warehouseId: props.warehouseId || undefined }));
const wh = computed(() => new Map(props.warehouses.map((w) => [w.id, w])));
const product = computed(() => props.products.find((p) => p.id === props.productId));
const TYPE_VARIANT: Record<StockMovementType, "success" | "danger" | "info"> = { receive: "success", issue: "danger", adjust: "info" };
const th = "px-3 py-2 text-start text-caption font-medium text-muted-foreground";
const thNum = "px-3 py-2 text-end text-caption font-medium text-muted-foreground";
const td = "px-3 py-2.5 text-body-sm text-foreground";
const tdNum = "px-3 py-2.5 text-end text-body-sm text-foreground tabular-nums";
</script>

<template>
  <NqEmptyState v-if="rows.length === 0" :icon="ListTree" :title="t.noMovements" :description="t.noMovementsText" :class="props.class" />
  <div v-else data-slot="stock-movements" :class="cn('relative w-full overflow-x-auto rounded-card border border-border bg-card', props.class)">
    <table class="w-full min-w-[36rem] border-collapse">
      <caption class="sr-only">{{ `${t.movements}${product ? `, ${product.name}` : ""}. ${t.asOf}.` }}</caption>
      <thead class="border-b border-border">
        <tr>
          <th scope="col" :class="th">{{ t.date }}</th>
          <th scope="col" :class="th">{{ t.movement }}</th>
          <th scope="col" :class="th">{{ t.warehouse }}</th>
          <th scope="col" :class="th">{{ t.reference2 }}</th>
          <th scope="col" dir="ltr" :class="thNum">{{ t.change }}</th>
          <th scope="col" dir="ltr" :class="thNum">{{ t.balance }}</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border">
        <tr v-for="{ movement: m, change, balance } in rows" :key="m.id" data-slot="stock-movement">
          <td :class="cn(td, 'whitespace-nowrap')">{{ stockDate(locale, m.date) }}</td>
          <td :class="td">
            <NqBadge :variant="TYPE_VARIANT[m.type]">{{ t[m.type] }}</NqBadge>
            <div v-if="m.note" class="mt-0.5 text-caption text-muted-foreground">{{ m.note }}</div>
          </td>
          <td :class="td">{{ wh.get(m.warehouseId)?.name ?? m.warehouseId }}</td>
          <td :class="td"><bdi v-if="m.reference" dir="ltr" class="tabular-nums">{{ m.reference }}</bdi><span v-else aria-hidden="true" class="text-muted-foreground">–</span></td>
          <td dir="ltr" :class="cn(tdNum, change < 0 ? 'text-danger' : 'text-success')"><NqStockQty :value="change" sign /></td>
          <td dir="ltr" :class="cn(tdNum, 'font-medium', balance < 0 && 'text-danger')"><NqStockQty :value="balance" /></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
