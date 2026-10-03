<script setup lang="ts">
import { NqStoreCheckout, type CommerceCartLine, type CommerceShippingMethod } from "@fadymondy/nasaq/vue";

// The README Quick start: lines, shipping methods, saved addresses and a payment policy (card, cash on delivery, wallet).
// Prices are minor units (cents). onPlaceOrder resolves { orderNumber } to finish, or { error } to let the shopper retry.
const lines: CommerceCartLine[] = [
  { id: "tee-black-m", productId: "tee", variantId: "black-m", name: "Everyday cotton tee", variantLabel: "Black / M", unitPrice: 2900, compareAt: 3900, quantity: 2, maxQuantity: 3 },
  { id: "bottle", productId: "bottle", variantId: "bottle-1", name: "Steel water bottle", variantLabel: "750 ml", unitPrice: 2400, quantity: 1, maxQuantity: 12 },
];
const methods: CommerceShippingMethod[] = [
  { id: "standard", label: "Standard delivery", price: 500, freeOver: 15000, etaDays: [3, 5] },
  { id: "express", label: "Express delivery", price: 1500, etaDays: [1, 2] },
];
const addresses = [
  { id: "home", name: "Mona Adel", phone: "+20 100 123 4567", line1: "12 Nile Street", city: "Cairo", region: "", postalCode: "11728", country: "EG", isDefault: true },
];

async function place(draft: { attempt: number }) {
  await new Promise((resolve) => setTimeout(resolve, 600));
  return { orderNumber: `#${2000 + draft.attempt}` };
}
</script>

<template>
  <NqStoreCheckout
    :lines="lines"
    currency="USD"
    :shipping-methods="methods"
    :saved-addresses="addresses"
    :weekend="[5, 6]"
    :payment-policy="{ card: true, cod: { maxTotal: 500000, countries: ['EG'], fee: 250 }, wallet: { balance: 4000 } }"
    :on-place-order="place"
  />
</template>
