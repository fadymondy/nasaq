<script setup lang="ts">
import { ArrowLeftRight, ArrowRightFromLine, ArrowRightToLine, ListTree, PackageOpen, SlidersHorizontal } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { NqContextMenuActions, type ContextMenuAction } from "../context-menu";
import { NqLineItemActionsMenu } from "../line-item-editor";
import { NqEmptyState } from "../states";
import NqStockQty from "./NqStockQty.vue";
import { stockMatrix, type StockLevel, type StockMovement, type StockProduct, type StockWarehouse } from "./stock-math";
import { useStockLedgerStrings, type StockLedgerLabels } from "./strings";

// Products by warehouses, with a total and a low-stock flag per product. A row opens its movements, or records one, from the row menu and the context menu.
interface Props {
  products: readonly StockProduct[];
  warehouses: readonly StockWarehouse[];
  movements: readonly StockMovement[];
  /** ISO date. Movements after it are left out. */
  asOf?: string;
  selectedProductId?: string | null;
  onSelectProduct?: (product: StockProduct) => void;
  /** Adds receive, issue and adjust to each row's menu. */
  onRecordFor?: (type: "receive" | "issue" | "adjust", product: StockProduct) => void;
  labels?: StockLedgerLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { asOf: undefined, selectedProductId: undefined, onSelectProduct: undefined, onRecordFor: undefined, labels: undefined });
const { t } = useStockLedgerStrings(() => props.labels);
const matrix = computed(() => stockMatrix(props.products, props.warehouses, props.movements, { asOf: props.asOf }));

const LEVEL_VARIANT: Record<StockLevel, "success" | "warning" | "danger"> = { ok: "success", low: "warning", out: "danger" };
const TYPE_ICON = { receive: ArrowRightToLine, issue: ArrowRightFromLine, adjust: SlidersHorizontal, transfer: ArrowLeftRight } as const;
const th = "px-3 py-2 text-start text-caption font-medium text-muted-foreground";
const thNum = "px-3 py-2 text-end text-caption font-medium text-muted-foreground";
const td = "px-3 py-2.5 text-body-sm text-foreground";
const tdNum = "px-3 py-2.5 text-end text-body-sm text-foreground tabular-nums";

function actionsFor(product: StockProduct): ContextMenuAction[] {
  return [
    ...(props.onSelectProduct ? [{ id: "view", label: t.value.viewMovements, icon: ListTree, onSelect: () => props.onSelectProduct?.(product), group: "open" }] : []),
    ...(props.onRecordFor
      ? (["receive", "issue", "adjust"] as const).map((type) => ({ id: type, label: t.value[type], icon: TYPE_ICON[type], onSelect: () => props.onRecordFor?.(type, product), group: "record" }))
      : []),
  ];
}
const levelLabel = (level: StockLevel) => (level === "ok" ? t.value.inStock : level === "low" ? t.value.low : t.value.out);
</script>

<template>
  <NqEmptyState v-if="props.products.length === 0" :icon="PackageOpen" :title="t.noProducts" :description="t.noProductsText" :class="props.class" />
  <div v-else data-slot="stock-on-hand" :class="cn('relative w-full overflow-x-auto rounded-card border border-border bg-card', props.class)">
    <table class="w-full min-w-[34rem] border-collapse">
      <caption class="sr-only">{{ t.onHand }}</caption>
      <thead class="border-b border-border">
        <tr>
          <th scope="col" :class="cn(th, 'sticky start-0 z-10 bg-card')">{{ t.product }}</th>
          <th v-for="w in props.warehouses" :key="w.id" scope="col" dir="ltr" :class="thNum" :title="w.name">{{ w.code ?? w.name }}</th>
          <th scope="col" dir="ltr" :class="thNum">{{ t.total }}</th>
          <th scope="col" :class="th">{{ t.status }}</th>
          <th scope="col" class="w-10"><span class="sr-only">{{ t.rowActions }}</span></th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border">
        <NqContextMenuActions
          v-for="{ product, cells, total, level } in matrix.rows"
          :key="product.id"
          as="tr"
          :actions="actionsFor(product)"
          data-slot="stock-row"
          :data-level="level"
          :data-selected="props.selectedProductId === product.id ? '' : undefined"
          class="data-[selected]:bg-nq-hover"
        >
          <td :class="cn(td, 'sticky start-0 z-10 bg-card')">
            <div class="flex min-w-0 flex-col">
              <button v-if="props.onSelectProduct" type="button" class="truncate text-start font-medium hover:underline" @click="props.onSelectProduct(product)">{{ product.name }}</button>
              <span v-else class="truncate font-medium">{{ product.name }}</span>
              <span class="flex items-center gap-1.5 text-caption text-muted-foreground">
                <bdi dir="ltr" class="tabular-nums">{{ product.sku }}</bdi>
                <span v-if="product.unit">{{ product.unit }}</span>
              </span>
            </div>
          </td>
          <td v-for="w in props.warehouses" :key="w.id" dir="ltr" :class="cn(tdNum, (cells[w.id] ?? 0) < 0 && 'text-danger')">
            <NqStockQty :value="cells[w.id] ?? 0" blank />
          </td>
          <td dir="ltr" :class="cn(tdNum, 'font-medium')"><NqStockQty :value="total" /></td>
          <td :class="td">
            <NqBadge :variant="LEVEL_VARIANT[level]" :title="product.reorderPoint !== undefined ? `${t.reorderAt} ${product.reorderPoint}` : undefined">{{ levelLabel(level) }}</NqBadge>
          </td>
          <td class="px-1"><NqLineItemActionsMenu :actions="actionsFor(product)" :label="`${t.rowActions}, ${product.name}`" /></td>
        </NqContextMenuActions>
      </tbody>
      <tfoot class="border-t border-border bg-muted/40">
        <tr>
          <th scope="row" :class="cn(th, 'sticky start-0 z-10 bg-muted/40 font-semibold text-foreground')">{{ t.total }}</th>
          <td v-for="w in props.warehouses" :key="w.id" dir="ltr" :class="cn(tdNum, 'font-medium')"><NqStockQty :value="matrix.warehouseTotals[w.id] ?? 0" /></td>
          <td dir="ltr" :class="cn(tdNum, 'font-semibold')"><NqStockQty :value="matrix.total" /></td>
          <td colspan="2" />
        </tr>
      </tfoot>
    </table>
  </div>
</template>
