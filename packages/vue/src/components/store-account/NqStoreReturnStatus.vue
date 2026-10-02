<script setup lang="ts">
import { Ban, Check, CircleX } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqAlertDialog, NqAlertDialogAction, NqAlertDialogCancel, NqAlertDialogContent, NqAlertDialogDescription, NqAlertDialogFooter, NqAlertDialogHeader, NqAlertDialogTitle } from "../alert-dialog";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqDateTime, NqNum } from "../numeric";
import NqStoreMoney from "../store-orders-admin/NqStoreMoney.vue";
import { useStoreAccountStrings, type StoreAccountLabels } from "./account-strings";
import type { CommerceOrder } from "./commerce";
import { rmaIsOpen, rmaSteps, type ReturnRequest, type RmaStatus } from "./return-math";

// One return request: its number, the items, the five-step RMA progress, the refund and, when it was refused, why.
const VARIANT: Record<RmaStatus, "info" | "success" | "warning" | "danger" | "neutral"> = {
  requested: "warning",
  approved: "info",
  "shipped-back": "info",
  received: "info",
  refunded: "success",
  rejected: "danger",
  cancelled: "neutral",
};

const props = defineProps<{
  request: ReturnRequest;
  /** The order the return belongs to, to name the items. */
  order: Pick<CommerceOrder, "lines" | "number">;
  /** ISO 4217 code. Defaults to USD, or SAR in Arabic. */
  currency?: string;
  /** Shows a "Cancel request" button while the request is still open and not yet sent back. */
  onCancel?: (request: ReturnRequest) => void;
  labels?: StoreAccountLabels;
  class?: HTMLAttributes["class"];
}>();

const currency = useCurrency(() => props.currency);
const { t } = useStoreAccountStrings(() => props.labels);
const confirm = ref(false);
const steps = computed(() => rmaSteps(props.request.status, props.request.stoppedAfter));
const stopped = computed(() => props.request.status === "rejected" || props.request.status === "cancelled");
const canCancel = computed(() => !!props.onCancel && (props.request.status === "requested" || props.request.status === "approved"));
const lineName = (id: string) => props.order.lines.find((l) => l.id === id)?.name ?? id;
</script>

<template>
  <article data-slot="store-return-status" :data-status="props.request.status" :class="cn('flex min-w-0 flex-col gap-3 rounded-card border border-border bg-card p-4', props.class)">
    <header class="flex flex-wrap items-start justify-between gap-2">
      <div class="flex min-w-0 flex-col gap-0.5">
        <span class="font-semibold">{{ t.rma }} <bdi>{{ props.request.number }}</bdi></span>
        <span class="text-body-sm text-muted-foreground">{{ t.requestedOn }} <NqDateTime :value="props.request.createdAt" :format="{ dateStyle: 'medium' }" /></span>
      </div>
      <NqBadge :variant="VARIANT[props.request.status]">{{ t.rmaStatus[props.request.status] }}</NqBadge>
    </header>

    <ol :aria-label="t.rma" class="m-0 grid list-none gap-2 p-0 sm:grid-cols-5">
      <li
        v-for="step in steps"
        :key="step.key"
        :data-state="step.state"
        :aria-current="step.state === 'current' ? 'step' : undefined"
        :class="
          cn(
            'flex items-center gap-1.5 border-s-4 ps-2 text-body-sm sm:flex-col sm:items-start sm:border-s-0 sm:border-t-4 sm:ps-0 sm:pt-2',
            step.state === 'done' ? 'border-primary' : step.state === 'current' ? 'border-primary/50' : step.state === 'skipped' ? 'border-dashed border-border' : 'border-border',
            step.state === 'upcoming' || step.state === 'skipped' ? 'text-muted-foreground' : 'text-foreground',
          )
        "
      >
        <Check v-if="step.state === 'done'" aria-hidden="true" class="size-4 text-primary" />
        <span>{{ t.rmaStatus[step.key] }}</span>
      </li>
    </ol>

    <p :class="cn('flex items-start gap-2 text-body-sm', stopped ? 'text-foreground' : 'text-muted-foreground')">
      <CircleX v-if="props.request.status === 'rejected'" aria-hidden="true" class="mt-0.5 size-4 shrink-0" />
      <Ban v-else-if="props.request.status === 'cancelled'" aria-hidden="true" class="mt-0.5 size-4 shrink-0" />
      <span>{{ t.rmaHint[props.request.status] }}</span>
    </p>
    <p v-if="props.request.status === 'rejected' && props.request.rejectionReason" class="rounded-control border border-border bg-secondary px-3 py-2 text-body-sm">
      <span class="font-medium">{{ t.rejectionReason }}:</span> {{ props.request.rejectionReason }}
    </p>

    <ul class="m-0 flex list-none flex-col gap-1 p-0 text-body-sm">
      <li v-for="pick in props.request.lines" :key="pick.lineId" class="flex items-center justify-between gap-3">
        <span class="min-w-0 truncate">{{ lineName(pick.lineId) }}</span>
        <span class="shrink-0 text-muted-foreground">{{ t.quantity }} <NqNum :value="pick.quantity" /></span>
      </li>
    </ul>

    <footer class="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
      <span class="text-body-sm">
        <span class="text-muted-foreground">{{ t.refundTotal }}:</span> <NqStoreMoney :amount="props.request.refundAmount" :currency="currency" class="font-semibold" />
        <span class="text-muted-foreground"> ({{ t.methods[props.request.refundMethod] }})</span>
      </span>
      <NqButton v-if="canCancel && rmaIsOpen(props.request.status)" size="sm" variant="ghost" @click="confirm = true">{{ t.cancelRequest }}</NqButton>
    </footer>

    <NqAlertDialog v-model:open="confirm">
      <NqAlertDialogContent>
        <NqAlertDialogHeader>
          <NqAlertDialogTitle>{{ t.cancelRequestTitle }}</NqAlertDialogTitle>
          <NqAlertDialogDescription>{{ t.cancelRequestText }}</NqAlertDialogDescription>
        </NqAlertDialogHeader>
        <NqAlertDialogFooter>
          <NqAlertDialogCancel>{{ t.keepRequest }}</NqAlertDialogCancel>
          <NqAlertDialogAction variant="danger" @click="props.onCancel?.(props.request)">{{ t.cancelRequest }}</NqAlertDialogAction>
        </NqAlertDialogFooter>
      </NqAlertDialogContent>
    </NqAlertDialog>
  </article>
</template>
