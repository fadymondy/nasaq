<script setup lang="ts">
import { Bookmark, Eye, ShoppingBag, Trash2, TriangleAlert } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqButton } from "../button";
import { NqContextMenuActions, type ContextMenuAction } from "../context-menu";
import { NqNum } from "../numeric";
import { cartStockIssue } from "./cart-logic";
import type { CommerceCartLine } from "./commerce";
import NqStoreAmount from "./NqStoreAmount.vue";
import NqStoreCartMoney from "./NqStoreCartMoney.vue";
import NqStoreImage from "./NqStoreImage.vue";
import NqStoreQuantityStepper from "./NqStoreQuantityStepper.vue";
import { useStoreCartStrings, type StoreCartLabels } from "./strings";

// One product in the cart: picture (with a placeholder), name, variant, stock warning, unit and line price, the
// quantity stepper and the row actions. The same actions are on its context menu (context-click, long-press or Shift+F10).
// A callback you do not pass hides its button: `@quantity-change`, `@remove`, `@save-for-later`, `@move-to-cart`, `@open-product`.
interface Props {
  line: CommerceCartLine;
  /** Defaults to USD, or SAR in Arabic. */
  currency?: string;
  /** A saved-for-later line: no stepper, "Move to cart" instead of "Save for later". */
  saved?: boolean;
  /** The narrow layout for the mini cart: a smaller picture and an icon-only remove. */
  compact?: boolean;
  onQuantityChange?: (quantity: number) => void;
  onRemove?: () => void;
  onSaveForLater?: () => void;
  onMoveToCart?: () => void;
  onOpenProduct?: () => void;
  /** Show the variant's SKU under the name. */
  sku?: string;
  labels?: StoreCartLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  currency: undefined,
  saved: false,
  compact: false,
  onQuantityChange: undefined,
  onRemove: undefined,
  onSaveForLater: undefined,
  onMoveToCart: undefined,
  onOpenProduct: undefined,
  sku: undefined,
  labels: undefined,
});
const currency = useCurrency(() => props.currency);
const { t, n } = useStoreCartStrings(() => props.labels);
const issue = computed(() => cartStockIssue(props.line));
const shownIssue = computed(() => (props.saved ? (issue.value?.kind === "out" ? issue.value : undefined) : issue.value));
const out = computed(() => issue.value?.kind === "out");
const lineTotal = computed(() => props.line.unitPrice * props.line.quantity);
const compareTotal = computed(() => (props.line.compareAt && props.line.compareAt > props.line.unitPrice ? props.line.compareAt * props.line.quantity : undefined));

const actions = computed<ContextMenuAction[]>(() => [
  ...(props.onOpenProduct ? [{ id: "view", label: t.value.viewProduct, icon: Eye, onSelect: props.onOpenProduct, group: "open" }] : []),
  ...(props.saved
    ? props.onMoveToCart
      ? [{ id: "move", label: t.value.moveToCart, icon: ShoppingBag, onSelect: props.onMoveToCart, disabled: out.value, group: "move" }]
      : []
    : props.onSaveForLater
      ? [{ id: "save", label: t.value.saveForLater, icon: Bookmark, onSelect: props.onSaveForLater, group: "move" }]
      : []),
  ...(props.onRemove ? [{ id: "remove", label: t.value.remove, icon: Trash2, onSelect: props.onRemove, danger: true, group: "remove" }] : []),
]);
</script>

<template>
  <NqContextMenuActions as="li" :actions="actions" data-slot="store-cart-line" :data-saved="props.saved || undefined" :data-stock="issue?.kind" :class="cn('flex gap-3 py-4 sm:gap-4', props.class)">
    <NqStoreImage :src="props.line.image" :alt="props.line.name" :size="props.compact ? 64 : 88" :class="cn(out && 'opacity-60')" />
    <div class="flex min-w-0 flex-1 flex-col gap-2">
      <div class="flex items-start justify-between gap-3">
        <div class="flex min-w-0 flex-col gap-0.5">
          <p class="text-body font-medium text-foreground [overflow-wrap:anywhere]">{{ props.line.name }}</p>
          <p v-if="props.line.variantLabel" class="text-caption text-muted-foreground">{{ props.line.variantLabel }}</p>
          <p v-if="props.sku" class="text-caption text-muted-foreground">
            {{ t.sku }} <bdi dir="ltr">{{ props.sku }}</bdi>
          </p>
        </div>
        <div class="flex shrink-0 flex-col items-end gap-0.5 text-end">
          <NqStoreCartMoney :amount="lineTotal" :currency="currency" :compare-at="compareTotal" size="sm" />
          <span v-if="props.line.quantity > 1" class="text-caption text-muted-foreground">
            <NqStoreAmount :amount="props.line.unitPrice" :currency="currency" class="text-muted-foreground" /> {{ t.each }}
          </span>
        </div>
      </div>
      <p v-if="shownIssue" data-slot="store-cart-stock" role="status" :class="cn('flex items-center gap-1.5 text-caption', shownIssue.kind === 'out' ? 'text-nq-danger-text' : shownIssue.kind === 'over' ? 'text-nq-warning-text' : 'text-muted-foreground')">
        <TriangleAlert aria-hidden="true" class="size-3.5 shrink-0" />
        {{ shownIssue.kind === "out" ? t.outOfStock : shownIssue.kind === "over" ? t.overStock(n(shownIssue.available)) : t.lowStock(n(shownIssue.available)) }}
      </p>
      <div class="flex flex-wrap items-start gap-x-3 gap-y-2">
        <template v-if="!props.saved">
          <NqStoreQuantityStepper v-if="props.onQuantityChange" :value="props.line.quantity" :max="props.line.maxQuantity" :name="props.line.name" :labels="props.labels" @change="props.onQuantityChange" />
          <span v-else class="text-body-sm text-muted-foreground">{{ t.quantity }} <NqNum :value="props.line.quantity" /></span>
        </template>
        <div class="ms-auto flex flex-wrap items-center gap-1">
          <NqButton v-if="props.saved && props.onMoveToCart" variant="secondary" size="sm" :disabled="out" @click="props.onMoveToCart()">
            <ShoppingBag aria-hidden="true" />
            {{ t.moveToCart }}
          </NqButton>
          <NqButton v-if="!props.saved && !props.compact && props.onSaveForLater" variant="ghost" size="sm" @click="props.onSaveForLater()">
            <Bookmark aria-hidden="true" />
            {{ t.saveForLater }}
          </NqButton>
          <template v-if="props.onRemove">
            <NqButton v-if="props.compact" variant="ghost" size="icon-sm" :aria-label="t.removeLine(props.line.name)" @click="props.onRemove()">
              <Trash2 aria-hidden="true" />
            </NqButton>
            <NqButton v-else variant="ghost" size="sm" :aria-label="t.removeLine(props.line.name)" @click="props.onRemove()">
              <Trash2 aria-hidden="true" />
              {{ t.remove }}
            </NqButton>
          </template>
        </div>
      </div>
    </div>
  </NqContextMenuActions>
</template>
