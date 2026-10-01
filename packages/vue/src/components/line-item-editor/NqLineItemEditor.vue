<script setup lang="ts">
import { ArrowDown, ArrowUp, Copy, Minus, PackagePlus, Plus, Trash2 } from "lucide-vue-next";
import { computed, getCurrentInstance, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqButton } from "../button";
import { NqContextMenuActions, type ContextMenuAction } from "../context-menu";
import { NqCurrencyInput } from "../currency-input";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqEmptyState } from "../states";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import { useLineItemEditorStrings, type LineItemEditorLabels, type LineItemEditorLine, type LineItemEditorProduct } from "./labels";
import { bpsToPercentText, computeLineItems, quantityMilli, quantityText, type LineItemTotals, type LineOrderDiscount, type LineTaxMode, type LineTaxRounding } from "./line-item-math";
import NqLineItemActionsMenu from "./NqLineItemActionsMenu.vue";
import NqLineItemDecimalField from "./NqLineItemDecimalField.vue";
import NqLineItemMoney from "./NqLineItemMoney.vue";
import NqLineItemProductPicker from "./NqLineItemProductPicker.vue";

// The lines of an invoice, quote or order: pick a product to fill its name, price and tax, or type a free line;
// quantity, unit price, discount and tax per line; and totals computed in integer minor units so the parts always
// add up. Tax can be added to prices or contained in them, and rounded per line or once per rate.
interface Props {
  /** The lines (`v-model`). */
  modelValue?: LineItemEditorLine[];
  defaultValue?: LineItemEditorLine[];
  /** Products the picker offers. Picking one fills the name, price and tax rate. */
  products?: readonly LineItemEditorProduct[];
  /** ISO 4217 code. Sets the decimals of the price fields. Default USD, or SAR in Arabic. */
  currency?: string;
  /** "exclusive": prices are before tax. "inclusive": prices already contain it. Default "exclusive". */
  taxMode?: LineTaxMode;
  /** Round tax per line, or once per rate on the whole basket. Default "line". */
  taxRounding?: LineTaxRounding;
  /** Rate for lines without their own, in basis points. Default 0. */
  defaultTaxBps?: number;
  /** The rates the tax select offers, in basis points. Default [0, 500, 1500]. */
  taxRates?: readonly number[];
  showTax?: boolean;
  showDiscount?: boolean;
  /** Let people add lines that are not a product. Default true. Off: typed text that matches nothing is dropped on blur. */
  allowFreeLines?: boolean;
  maxLines?: number;
  /** A discount on the whole basket (`v-model:order-discount`). Shown and editable when something listens to `update:orderDiscount`. */
  orderDiscount?: LineOrderDiscount | null;
  readOnly?: boolean;
  disabled?: boolean;
  labels?: LineItemEditorLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  defaultValue: undefined,
  products: () => [],
  currency: undefined,
  taxMode: "exclusive",
  taxRounding: "line",
  defaultTaxBps: 0,
  taxRates: () => [0, 500, 1500],
  showTax: true,
  showDiscount: true,
  allowFreeLines: true,
  maxLines: undefined,
  orderDiscount: null,
  labels: undefined,
});
const emit = defineEmits<{ "update:modelValue": [lines: LineItemEditorLine[]]; "update:orderDiscount": [discount: LineOrderDiscount | null] }>();
defineSlots<{ footer?(props: { totals: LineItemTotals }): unknown }>();

const currency = useCurrency(() => props.currency);
const t = useLineItemEditorStrings(() => props.labels);
const inner = ref<LineItemEditorLine[]>(props.defaultValue ?? []);
const lines = computed(() => props.modelValue ?? inner.value);
const focusId = ref<string | null>(null);
const uid = useId();
const orderOn = computed(() => getCurrentInstance()?.vnode.props?.["onUpdate:orderDiscount"] !== undefined);

function set(next: LineItemEditorLine[]) {
  inner.value = next;
  emit("update:modelValue", next);
}
const patch = (id: string, change: Partial<LineItemEditorLine>) => set(lines.value.map((l) => (l.id === id ? { ...l, ...change } : l)));

const totals = computed(() =>
  computeLineItems(
    lines.value.map((l) => ({ id: l.id, quantity: l.quantity, unitPrice: l.unitPrice, discountBps: l.discountBps, taxBps: l.taxBps })),
    { taxMode: props.taxMode, taxRounding: props.taxRounding, defaultTaxBps: props.defaultTaxBps, orderDiscount: props.orderDiscount },
  ),
);
const byId = computed(() => new Map(totals.value.lines.map((l) => [l.id, l])));
const editable = computed(() => !props.readOnly && !props.disabled);
const canAdd = computed(() => editable.value && (props.maxLines === undefined || lines.value.length < props.maxLines));

let counter = 0;
const newId = () => `line-${Date.now().toString(36)}-${(counter++).toString(36)}`;
function add() {
  const line: LineItemEditorLine = { id: newId(), name: "", quantity: 1, unitPrice: 0, productId: null };
  set([...lines.value, line]);
  focusId.value = line.id;
}
function move(index: number, by: number) {
  const target = index + by;
  if (target < 0 || target >= lines.value.length) return;
  const next = [...lines.value];
  const [item] = next.splice(index, 1);
  if (item) next.splice(target, 0, item);
  set(next);
}
function duplicate(index: number) {
  const source = lines.value[index];
  if (!source) return;
  set([...lines.value.slice(0, index + 1), { ...source, id: newId() }, ...lines.value.slice(index + 1)]);
}
const rates = (current?: number) => [...new Set([...props.taxRates, ...(current !== undefined ? [current] : [])])].sort((a, b) => a - b);
const rateLabel = (r: number) => (r === 0 ? t.value.exempt : `${bpsToPercentText(r)}%`);

const GRID_BOTH = "@2xl:grid-cols-[minmax(12rem,1fr)_8.5rem_9.5rem_6.5rem_6rem_8rem_2rem]";
const grid = computed(() =>
  props.showTax && props.showDiscount
    ? GRID_BOTH
    : props.showTax
      ? "@2xl:grid-cols-[minmax(12rem,1fr)_8.5rem_9.5rem_6rem_8rem_2rem]"
      : props.showDiscount
        ? "@2xl:grid-cols-[minmax(12rem,1fr)_8.5rem_9.5rem_6.5rem_8rem_2rem]"
        : "@2xl:grid-cols-[minmax(12rem,1fr)_8.5rem_9.5rem_8rem_2rem]",
);

function actionsFor(index: number, line: LineItemEditorLine): ContextMenuAction[] {
  if (!editable.value) return [];
  return [
    { id: "duplicate", label: t.value.duplicate, icon: Copy, onSelect: () => duplicate(index), disabled: !canAdd.value },
    { id: "up", label: t.value.moveUp, icon: ArrowUp, onSelect: () => move(index, -1), disabled: index === 0, group: "order" },
    { id: "down", label: t.value.moveDown, icon: ArrowDown, onSelect: () => move(index, 1), disabled: index === lines.value.length - 1, group: "order" },
    { id: "remove", label: t.value.remove, icon: Trash2, danger: true, onSelect: () => set(lines.value.filter((l) => l.id !== line.id)), group: "danger" },
  ];
}
const nameOf = (line: LineItemEditorLine, index: number) => line.name.trim() || `${t.value.line} ${index + 1}`;
const orderType = computed(() => props.orderDiscount?.type ?? "percent");
function onOrderType(v: string[]) {
  const type = v[0];
  if (type === "percent") emit("update:orderDiscount", { type: "percent", bps: 0 });
  else if (type === "amount") emit("update:orderDiscount", { type: "amount", minor: 0 });
}
</script>

<template>
  <div data-slot="line-item-editor" :data-tax-mode="props.taxMode" :class="cn('@container flex min-w-0 flex-col gap-4', props.class)">
    <NqEmptyState v-if="lines.length === 0" :title="t.empty" :description="t.emptyText" />
    <div v-else class="flex flex-col gap-2">
      <div aria-hidden="true" :class="cn('hidden gap-3 px-3 text-caption text-muted-foreground @2xl:grid', grid)">
        <span>{{ t.item }}</span>
        <span class="text-center">{{ t.quantity }}</span>
        <span class="text-end">{{ t.unitPrice }}</span>
        <span v-if="props.showDiscount" class="text-end">{{ t.discount }}</span>
        <span v-if="props.showTax" class="text-end">{{ t.tax }}</span>
        <span class="text-end">{{ t.total }}</span>
        <span />
      </div>
      <ul :aria-label="t.lines" class="flex flex-col gap-2">
        <li
          v-for="(line, index) in lines"
          :key="line.id"
          data-slot="line-item"
          :data-free="line.productId ? undefined : ''"
          :aria-label="`${t.line} ${index + 1}: ${nameOf(line, index)}`"
          :class="cn('grid grid-cols-2 items-start gap-x-3 gap-y-3 rounded-floating border border-border bg-card p-3 @2xl:items-start @2xl:gap-y-0 @2xl:rounded-control', grid)"
        >
        <NqContextMenuActions :actions="actionsFor(index, line)" class="contents">
          <div class="col-span-2 @2xl:col-span-1">
            <NqLineItemProductPicker
              :line="line"
              :products="props.products"
              :allow-free="props.allowFreeLines"
              :disabled="props.disabled"
              :read-only="props.readOnly"
              :auto-focus="focusId === line.id"
              :label="`${t.item}, ${t.line} ${index + 1}`"
              :t="t"
              @name="(next) => patch(line.id, { name: next })"
              @pick="(p) => patch(line.id, { productId: p.id, name: p.name, unitPrice: p.price, taxBps: p.taxBps ?? line.taxBps })"
            />
          </div>

          <div class="flex min-w-0 flex-col gap-1">
            <span aria-hidden="true" class="text-caption text-muted-foreground @2xl:hidden">{{ t.quantity }}</span>
            <span v-if="props.readOnly" class="py-1.5 text-center tabular-nums"><bdi>{{ quantityText(line.quantity) }}</bdi></span>
            <div v-else class="flex items-center gap-1">
              <NqButton
                variant="ghost"
                size="icon-sm"
                :aria-label="`${t.decrease}, ${nameOf(line, index)}`"
                :disabled="!editable || quantityMilli(line.quantity) <= 1000"
                class="shrink-0 pointer-coarse:size-control"
                @click="patch(line.id, { quantity: Math.max(1, Math.floor(line.quantity - 1)) })"
              >
                <Minus aria-hidden="true" />
              </NqButton>
              <NqLineItemDecimalField
                :value="quantityMilli(line.quantity)"
                :scale="3"
                :format="(v) => quantityText(v / 1000)"
                :min="1"
                :invalid="line.quantity <= 0"
                :disabled="props.disabled"
                :ariaLabel="`${t.quantity}, ${nameOf(line, index)}`"
                @change="(v) => patch(line.id, { quantity: (v ?? 0) / 1000 })"
              />
              <NqButton
                variant="ghost"
                size="icon-sm"
                :aria-label="`${t.increase}, ${nameOf(line, index)}`"
                :disabled="!editable"
                class="shrink-0 pointer-coarse:size-control"
                @click="patch(line.id, { quantity: Math.floor(line.quantity) + 1 })"
              >
                <Plus aria-hidden="true" />
              </NqButton>
            </div>
          </div>

          <div class="flex min-w-0 flex-col gap-1">
            <span aria-hidden="true" class="text-caption text-muted-foreground @2xl:hidden">{{ t.unitPrice }}</span>
            <span v-if="props.readOnly" class="py-1.5 text-end"><NqLineItemMoney :minor="line.unitPrice" :currency="currency" /></span>
            <NqCurrencyInput
              v-else
              :model-value="line.unitPrice"
              :currency="currency"
              symbol="none"
              :min="0"
              :disabled="props.disabled"
              :aria-label="`${t.unitPrice}, ${nameOf(line, index)}`"
              @update:model-value="(v) => patch(line.id, { unitPrice: v ?? 0 })"
            />
          </div>

          <div v-if="props.showDiscount" class="flex min-w-0 flex-col gap-1">
            <span aria-hidden="true" class="text-caption text-muted-foreground @2xl:hidden">{{ t.discount }}</span>
            <span v-if="props.readOnly" class="py-1.5 text-end tabular-nums"><bdi>{{ bpsToPercentText(line.discountBps ?? 0) }}%</bdi></span>
            <NqLineItemDecimalField
              v-else
              :value="line.discountBps ?? 0"
              :scale="2"
              :format="bpsToPercentText"
              :max="10000"
              suffix="%"
              :disabled="props.disabled"
              :ariaLabel="`${t.discount} %, ${nameOf(line, index)}`"
              @change="(v) => patch(line.id, { discountBps: v ?? 0 })"
            />
          </div>

          <div v-if="props.showTax" class="flex min-w-0 flex-col gap-1">
            <span aria-hidden="true" class="text-caption text-muted-foreground @2xl:hidden">{{ t.tax }}</span>
            <span v-if="props.readOnly" class="py-1.5 text-end tabular-nums"><bdi>{{ bpsToPercentText(byId.get(line.id)?.taxBps ?? 0) }}%</bdi></span>
            <NqSelect
              v-else
              :model-value="String(byId.get(line.id)?.taxBps ?? props.defaultTaxBps)"
              :disabled="props.disabled"
              @update:model-value="(v) => v !== null && patch(line.id, { taxBps: Number(v) })"
            >
              <NqSelectTrigger :aria-label="`${t.taxRate}, ${nameOf(line, index)}`"><NqSelectValue /></NqSelectTrigger>
              <NqSelectContent>
                <NqSelectItem v-for="r in rates(byId.get(line.id)?.taxBps)" :key="r" :value="String(r)"><bdi>{{ rateLabel(r) }}</bdi></NqSelectItem>
              </NqSelectContent>
            </NqSelect>
          </div>

          <div class="flex min-w-0 flex-col gap-1 @2xl:items-end @2xl:pt-2">
            <span aria-hidden="true" class="text-caption text-muted-foreground @2xl:hidden">{{ t.total }}</span>
            <span class="text-end font-medium text-foreground @2xl:w-full" data-slot="line-item-total">
              <NqLineItemMoney :minor="byId.get(line.id)?.total ?? 0" :currency="currency" />
            </span>
          </div>

          <div class="col-span-2 flex justify-end @2xl:col-span-1 @2xl:justify-center">
            <NqLineItemActionsMenu v-if="editable" :actions="actionsFor(index, line)" :label="`${t.lineActions}, ${nameOf(line, index)}`" />
          </div>
        </NqContextMenuActions>
        </li>
      </ul>
    </div>

    <div v-if="editable" class="flex flex-wrap gap-2">
      <NqButton variant="secondary" size="sm" :disabled="!canAdd" @click="add"><PackagePlus aria-hidden="true" />{{ t.addProduct }}</NqButton>
      <NqButton v-if="props.allowFreeLines" variant="ghost" size="sm" :disabled="!canAdd" @click="add"><Plus aria-hidden="true" />{{ t.addFree }}</NqButton>
    </div>

    <section :aria-label="t.totals" class="flex flex-col gap-3 self-end @2xl:w-80">
      <dl class="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 text-body-sm">
        <dt class="text-muted-foreground">{{ t.subtotal }}</dt>
        <dd class="text-end"><NqLineItemMoney :minor="totals.subtotal" :currency="currency" /></dd>
        <template v-if="totals.discountTotal > 0">
          <dt class="text-muted-foreground">{{ t.discountRow }}</dt>
          <dd class="text-end text-nq-success-text"><NqLineItemMoney :minor="-totals.discountTotal" :currency="currency" /></dd>
        </template>
        <template v-if="orderOn">
          <dt :id="`${uid}-od`" class="flex items-center text-muted-foreground">{{ t.orderDiscount }}</dt>
          <dd class="flex items-center justify-end gap-2">
            <NqToggleGroup :aria-label="t.orderDiscount" :model-value="[orderType]" @update:model-value="onOrderType">
              <NqToggle value="percent" :aria-label="t.percent" :disabled="!editable">%</NqToggle>
              <NqToggle value="amount" :aria-label="t.amount" :disabled="!editable">{{ currency }}</NqToggle>
            </NqToggleGroup>
            <div class="w-28">
              <NqCurrencyInput
                v-if="props.orderDiscount?.type === 'amount'"
                :model-value="props.orderDiscount.minor"
                :currency="currency"
                symbol="none"
                :min="0"
                :disabled="!editable"
                :aria-label="t.orderDiscount"
                @update:model-value="(v) => emit('update:orderDiscount', { type: 'amount', minor: v ?? 0 })"
              />
              <NqLineItemDecimalField
                v-else
                :value="props.orderDiscount?.type === 'percent' ? props.orderDiscount.bps : 0"
                :scale="2"
                :format="bpsToPercentText"
                :max="10000"
                suffix="%"
                :disabled="!editable"
                :ariaLabel="t.orderDiscount"
                @change="(v) => emit('update:orderDiscount', { type: 'percent', bps: v ?? 0 })"
              />
            </div>
          </dd>
        </template>
        <template v-if="props.showTax">
          <div v-for="g in totals.taxGroups" :key="g.bps" class="contents">
            <dt class="text-muted-foreground">{{ props.taxMode === "inclusive" ? t.taxIncluded : t.taxRow }} <bdi class="tabular-nums">{{ bpsToPercentText(g.bps) }}%</bdi></dt>
            <dd class="text-end"><NqLineItemMoney :minor="g.tax" :currency="currency" /></dd>
          </div>
        </template>
      </dl>
      <div class="flex items-baseline justify-between gap-6 border-t border-border pt-3" aria-live="polite">
        <span class="text-body font-medium text-foreground">{{ t.totalDue }}</span>
        <span class="text-h3 font-semibold text-foreground" data-slot="line-item-grand-total"><NqLineItemMoney :minor="totals.total" :currency="currency" /></span>
      </div>
      <slot name="footer" :totals="totals" />
    </section>
  </div>
</template>
