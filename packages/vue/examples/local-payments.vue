<script setup lang="ts">
import { NqLocalPayments, type LocalPaymentMethod } from "@fadymondy/nasaq/vue";

const methods: LocalPaymentMethod[] = [
  {
    id: "instapay",
    name: "InstaPay",
    kind: "instant-transfer",
    details: [{ label: "Payment address", value: "shop@instapay" }],
    steps: ["Open your banking app", "Send the total to the address below", "Add the reference and a screenshot"],
  },
];
async function submit() {
  await new Promise((r) => setTimeout(r, 400));
}
</script>

<template>
  <NqLocalPayments :amount="1250000" currency="USD" :methods="methods" :on-submit="submit" />
</template>
