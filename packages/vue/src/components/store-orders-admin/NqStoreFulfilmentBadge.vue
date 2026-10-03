<script setup lang="ts">
import { computed } from "vue";
import { NqBadge } from "../badge";
import { FULFILMENT_LABEL, FULFILMENT_VARIANT } from "../store-order-timeline/order-labels";
import { orderFulfilment } from "./orders-list-logic";
import type { CommerceOrder } from "./order-types";
import { useStoreAdminStrings } from "./strings";

// A chip for an order's fulfilment. Orders that will never ship read as nothing to ship.
const props = defineProps<{ order: Pick<CommerceOrder, "lines" | "status"> }>();
const { ar } = useStoreAdminStrings();
const key = computed(() => orderFulfilment(props.order));
</script>

<template>
  <NqBadge :variant="FULFILMENT_VARIANT[key]">{{ FULFILMENT_LABEL[key][ar ? "ar" : "en"] }}</NqBadge>
</template>
