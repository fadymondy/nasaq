<script setup lang="ts">
import { NqStoreCartButton, NqStoreCartPage, NqStoreMiniCart, useStoreCart, type CommerceCartLine } from "@fadymondy/nasaq/vue";

// The README Quick start: one cart controller feeds the mini-cart drawer and the cart page. Prices are minor units (cents).
const initialLines: CommerceCartLine[] = [
  { id: "tee-black-m", productId: "tee", variantId: "black-m", name: "Everyday cotton tee", variantLabel: "Black / M", unitPrice: 2900, compareAt: 3900, quantity: 2, maxQuantity: 3 },
  { id: "bottle", productId: "bottle", variantId: "bottle-1", name: "Steel water bottle", variantLabel: "750 ml", unitPrice: 2400, quantity: 1, maxQuantity: 12 },
];
const cart = useStoreCart({ initialLines, feedback: "both" });

function checkout() {
  console.log("go to checkout", cart.lines);
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <NqStoreMiniCart
      :open="cart.drawerOpen"
      :lines="cart.lines"
      currency="USD"
      :free-shipping-threshold="15000"
      :removed="cart.removed"
      :on-quantity-change="cart.setQuantity"
      :on-remove="cart.remove"
      :on-undo="cart.undo"
      :on-dismiss-removed="cart.dismissRemoved"
      :on-checkout="checkout"
      @update:open="cart.setDrawerOpen"
    >
      <template #trigger><NqStoreCartButton :count="cart.count" /></template>
    </NqStoreMiniCart>
    <NqStoreCartPage
      :lines="cart.lines"
      currency="USD"
      :message="cart.message"
      :removed="cart.removed"
      :free-shipping-threshold="15000"
      :on-quantity-change="cart.setQuantity"
      :on-remove="cart.remove"
      :on-save-for-later="cart.saveForLater"
      :on-move-to-cart="cart.moveToCart"
      :on-undo="cart.undo"
      :on-dismiss-removed="cart.dismissRemoved"
      :on-fix-stock="cart.fixStock"
      :on-checkout="checkout"
    />
  </div>
</template>
