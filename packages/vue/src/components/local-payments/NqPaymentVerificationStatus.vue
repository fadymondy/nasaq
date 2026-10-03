<script setup lang="ts">
import { Check, CircleX, Clock, ShieldCheck, X } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { NqDateTime } from "../numeric";
import { NqStatus } from "../status";
import { verificationStep, type PaymentVerification } from "./payment-logic";
import { localPaymentsStrings, type LocalPaymentsLabels } from "./strings";
import { PAYMENT_STATUS_TONE } from "./tones";

// Where a manual payment stands: receipt sent, under review, verified. A rejection shows the reason and a way to send a new receipt.
const props = defineProps<{
  status: PaymentVerification;
  methodName?: string;
  reference?: string;
  submittedAt?: Date | number | string;
  rejectionReason?: string;
  /** Shows "Send a new receipt" on a rejected payment. */
  onResubmit?: () => void;
  labels?: LocalPaymentsLabels;
  class?: HTMLAttributes["class"];
}>();

const STAGES = ["submitted", "verifying", "verified"] as const;
const nq = useNasaq();
const t = computed(() => localPaymentsStrings(nq.locale.value, props.labels));
const step = computed(() => verificationStep(props.status));
const rejected = computed(() => props.status === "rejected");

const stages = computed(() =>
  STAGES.map((stage, i) => {
    const done = step.value > i || (props.status === "verified" && i === 2);
    const current = step.value === i && !done;
    const bad = rejected.value && i === 1;
    return { stage, i, done, current, bad, state: bad ? "rejected" : done ? "done" : current ? "current" : "todo" };
  }),
);
</script>

<template>
  <div data-slot="payment-verification-status" :data-status="props.status" :class="cn('flex flex-col gap-4', props.class)">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h3 class="flex items-center gap-2 text-label text-foreground">
        <ShieldCheck aria-hidden="true" class="size-4 text-muted-foreground" />
        {{ t.verification }}
      </h3>
      <NqStatus :tone="PAYMENT_STATUS_TONE[props.status]">{{ t.statuses[props.status] }}</NqStatus>
    </div>
    <ol class="flex flex-col gap-3" :aria-label="t.verification">
      <li v-for="s in stages" :key="s.stage" :data-state="s.state" :aria-current="s.current ? 'step' : undefined" class="flex items-start gap-3">
        <span
          aria-hidden="true"
          :class="
            cn(
              'mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full border text-caption [&_svg]:size-3.5',
              s.bad ? 'border-nq-danger/40 bg-nq-danger-soft text-nq-danger-text' : s.done ? 'border-nq-success/40 bg-nq-success-soft text-nq-success-text' : s.current ? 'border-primary text-foreground' : 'border-border text-muted-foreground',
            )
          "
        >
          <X v-if="s.bad" />
          <Check v-else-if="s.done" />
          <Clock v-else-if="s.current" />
          <template v-else>{{ s.i + 1 }}</template>
        </span>
        <span class="flex min-w-0 flex-col">
          <span :class="cn('text-body-sm', s.done || s.current || s.bad ? 'text-foreground' : 'text-muted-foreground')">{{ t.stages[s.stage] }}</span>
          <span v-if="(s.done || s.current) && !s.bad" class="text-caption text-muted-foreground">{{ t.stageHelp[s.stage] }}</span>
        </span>
      </li>
    </ol>
    <p class="flex flex-wrap gap-x-3 gap-y-1 text-caption text-muted-foreground">
      <span v-if="props.methodName">{{ t.viaMethod(props.methodName) }}</span>
      <bdi v-if="props.reference" dir="ltr" class="font-mono">{{ props.reference }}</bdi>
      <span v-if="props.submittedAt">
        {{ t.submittedAt }} <NqDateTime :value="props.submittedAt" :format="{ dateStyle: 'medium', timeStyle: 'short' }" />
      </span>
    </p>
    <div v-if="rejected" role="alert" class="flex flex-col gap-2 rounded-card border border-nq-danger/40 bg-nq-danger-soft p-3 text-body-sm">
      <p class="flex items-center gap-2 font-medium text-nq-danger-text">
        <CircleX aria-hidden="true" class="size-4" />
        {{ t.rejectedTitle }}
      </p>
      <p v-if="props.rejectionReason" class="text-foreground">{{ props.rejectionReason }}</p>
      <p class="text-muted-foreground">{{ t.rejectedHelp }}</p>
      <NqButton v-if="props.onResubmit" size="sm" class="self-start" @click="props.onResubmit()">{{ t.resubmit }}</NqButton>
    </div>
  </div>
</template>
