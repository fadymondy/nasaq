<script setup lang="ts">
import { CircleCheck, CircleDot, CircleX, FileClock, RotateCcw, TriangleAlert } from "lucide-vue-next";
import { type HTMLAttributes } from "vue";
import { NqBadge } from "../badge";
import { useInvoiceStrings, type InvoiceLabels, type InvoiceStatus } from "./invoice";

// The status as a chip with its own icon, so it never relies on colour alone.
interface Props {
  status: InvoiceStatus;
  labels?: InvoiceLabels;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const { t } = useInvoiceStrings(() => props.labels);
const VARIANT = { draft: "neutral", open: "info", paid: "success", overdue: "danger", void: "outline", refunded: "warning" } as const;
const ICON = { draft: FileClock, open: CircleDot, paid: CircleCheck, overdue: TriangleAlert, void: CircleX, refunded: RotateCcw } as const;
</script>

<template>
  <NqBadge data-slot="invoice-status" :data-status="props.status" :variant="VARIANT[props.status]" :class="props.class">
    <component :is="ICON[props.status]" aria-hidden="true" />
    {{ props.status === "paid" ? t.paidStatus : t[props.status] }}
  </NqBadge>
</template>
