<script setup lang="ts">
import { computed } from "vue";
import { NqBadge } from "../badge";
import { PAYMENT_LABEL, PAYMENT_VARIANT } from "../store-order-timeline/order-labels";
import type { CommercePaymentStatus } from "./order-types";
import { useStoreAdminStrings } from "./strings";

// A chip for an order's payment status.
const props = defineProps<{ payment: CommercePaymentStatus }>();
const { ar } = useStoreAdminStrings();
const key = computed(() => props.payment);
</script>

<template>
  <NqBadge :variant="PAYMENT_VARIANT[key]">{{ PAYMENT_LABEL[key][ar ? "ar" : "en"] }}</NqBadge>
</template>
