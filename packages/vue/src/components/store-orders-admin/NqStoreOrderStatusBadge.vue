<script setup lang="ts">
import { computed } from "vue";
import { NqBadge } from "../badge";
import { ORDER_STATUS_LABEL, ORDER_STATUS_VARIANT } from "../store-order-timeline/order-labels";
import type { CommerceOrderStatus } from "./order-types";
import { useStoreAdminStrings } from "./strings";

// A chip for an order's status, in the words of the customer's account.
const props = defineProps<{ status: CommerceOrderStatus }>();
const { ar } = useStoreAdminStrings();
const key = computed(() => props.status);
</script>

<template>
  <NqBadge :variant="ORDER_STATUS_VARIANT[key]">{{ ORDER_STATUS_LABEL[key][ar ? "ar" : "en"] }}</NqBadge>
</template>
