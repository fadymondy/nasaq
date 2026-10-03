<script setup lang="ts">
import { CircleX, ReceiptText } from "lucide-vue-next";
import { computed, ref, useId, watch, type HTMLAttributes } from "vue";
import { useCurrency, useNasaq } from "../../provider";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardHeader, NqCardTitle } from "../card";
import { NqCopyButton } from "../copy-button";
import { minorToMajor } from "../currency-input";
import { NqField, NqFieldDescription, NqFieldError, NqFieldLabel, NqInput } from "../field";
import { NqFileUpload, type UploadFile } from "../file-upload";
import { NqNum } from "../numeric";
import { NqQrCode } from "../qr-code";
import { NqRadioCard, NqRadioGroup } from "../radio-group";
import { NqEmptyState } from "../states";
import NqPaymentVerificationStatus from "./NqPaymentVerificationStatus.vue";
import { canSubmitReceipt, normalizeReference, paymentFee, paymentLimit, paymentTotal, referenceProblem, type PaymentFee } from "./payment-logic";
import { localPaymentsStrings, type LocalPaymentsLabels } from "./strings";
import { fmtPaymentMoney, paymentErrorMessage, type LocalPaymentInput, type LocalPaymentMethod, type LocalPaymentsResult, type LocalPaymentSubmission } from "./types";

// Manual payment methods: pick one (InstaPay, a mobile wallet, a bank), see where to send the money with copy buttons
// and a QR, add the transfer reference and the receipt, and follow verification. Amounts are minor units and each
// method's fee and limits are applied. Names are text unless you fill the `mark` slot with an official logo.
const props = withDefaults(
  defineProps<{
    /** What is owed, in minor units. */
    amount: number;
    /** ISO 4217 code. Defaults to USD, or SAR in Arabic. */
    currency?: string;
    methods: readonly LocalPaymentMethod[];
    /** The customer's submission, when there is one. Its status decides what the card shows. */
    submission?: LocalPaymentSubmission;
    defaultMethodId?: string;
    /** Sends the receipt for verification. Resolve `{ error }` or reject to show the message. */
    onSubmit: (input: LocalPaymentInput) => Promise<LocalPaymentsResult>;
    onCancel?: () => void;
    /** Ask for a receipt file. Default true. */
    receiptRequired?: boolean;
    /** Largest receipt, in bytes. Default 5 MB. */
    maxReceiptSize?: number;
    labels?: LocalPaymentsLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { currency: undefined, submission: undefined, defaultMethodId: undefined, onCancel: undefined, receiptRequired: true, maxReceiptSize: 5 * 1024 * 1024, labels: undefined },
);
defineSlots<{
  /** An official provider mark for a method (licensed). Without it the name is shown as text. */
  mark?: (props: { method: LocalPaymentMethod }) => unknown;
}>();

const nq = useNasaq();
const currency = useCurrency(() => props.currency);
const t = computed(() => localPaymentsStrings(nq.locale.value, props.labels));
const titleId = `nq-local-payments-${useId()}`;

const methodId = ref(props.defaultMethodId ?? props.submission?.methodId ?? props.methods[0]?.id ?? "");
const reference = ref(props.submission?.reference ?? "");
const files = ref<UploadFile[]>([]);
const busy = ref(false);
const error = ref<string | null>(null);
const touched = ref(false);

const fmt = (minor: number) => fmtPaymentMoney(minor, currency.value);
function fmtFee(fee: PaymentFee) {
  const parts: string[] = [];
  if (fee.percentBps) parts.push(`${fee.percentBps / 100}%`);
  if (fee.fixed) parts.push(fmt(fee.fixed));
  return parts.join(" + ") || fmt(paymentFee(props.amount, fee));
}

const method = computed(() => props.methods.find((m) => m.id === methodId.value));
const fee = computed(() => paymentFee(props.amount, method.value?.fee));
const total = computed(() => paymentTotal(props.amount, method.value?.fee));
const limit = computed(() => (method.value ? paymentLimit(total.value, method.value) : null));
const status = computed(() => props.submission?.status ?? "unpaid");
const form = computed(() => canSubmitReceipt(status.value));
const receipt = computed(() => files.value[0]?.file ?? null);
const refProblem = computed(() => referenceProblem(reference.value));
const problem = computed(() => {
  const m = method.value;
  if (!m) return t.value.problems.method;
  if (limit.value === "min") return t.value.problems.min(fmt(m.min ?? 0));
  if (limit.value === "max") return t.value.problems.max(fmt(m.max ?? 0));
  if (refProblem.value) return t.value.problems[refProblem.value];
  if (props.receiptRequired && !receipt.value) return t.value.problems.receipt;
  return null;
});
const submittedMethod = computed(() => props.methods.find((m) => m.id === props.submission?.methodId));

async function submit() {
  if (busy.value) return;
  touched.value = true;
  const m = method.value;
  if (problem.value || !m) return;
  busy.value = true;
  error.value = null;
  try {
    const result = await props.onSubmit({ methodId: m.id, reference: normalizeReference(reference.value), receipt: receipt.value, amount: props.amount, fee: fee.value, total: total.value });
    if (result?.error) error.value = result.error;
  } catch (e) {
    error.value = paymentErrorMessage(e, t.value.failed);
  } finally {
    busy.value = false;
  }
}

// The file stays on the device until you press submit, so it is "done" as soon as it is picked.
function markDone(added: UploadFile[], controls: { update: (id: string, patch: Partial<UploadFile>) => void }) {
  added.forEach((f) => controls.update(f.id, { status: "done", progress: 100 }));
}
watch(reference, () => (error.value = null));
</script>

<template>
  <NqEmptyState v-if="props.methods.length === 0" :icon="ReceiptText" :title="t.empty" :description="t.emptyDescription" />
  <NqCard v-else data-slot="local-payments" :data-status="status" :aria-labelledby="titleId" :class="['gap-4 px-0', props.class]">
    <NqCardHeader>
      <NqCardTitle as="h2" :id="titleId">{{ t.title }}</NqCardTitle>
      <p class="col-span-full text-body-sm text-muted-foreground">{{ t.description(fmt(total)) }}</p>
    </NqCardHeader>

    <NqCardContent v-if="props.submission && !form">
      <NqPaymentVerificationStatus
        :status="status"
        :method-name="submittedMethod?.name"
        :reference="props.submission.reference"
        :submitted-at="props.submission.submittedAt"
        :rejection-reason="props.submission.rejectionReason"
        :labels="props.labels"
      />
    </NqCardContent>

    <form v-if="form" novalidate class="flex flex-col gap-4" @submit.prevent="submit">
      <NqCardContent v-if="props.submission?.status === 'rejected'">
        <NqPaymentVerificationStatus
          status="rejected"
          :method-name="submittedMethod?.name"
          :reference="props.submission.reference"
          :submitted-at="props.submission.submittedAt"
          :rejection-reason="props.submission.rejectionReason"
          :labels="props.labels"
        />
      </NqCardContent>
      <NqCardContent class="flex flex-col gap-2">
        <h3 :id="`${titleId}-method`" class="text-label text-foreground">{{ t.method }}</h3>
        <NqRadioGroup v-model="methodId" :aria-labelledby="`${titleId}-method`" :disabled="busy" class="grid gap-2 sm:grid-cols-2">
          <NqRadioCard v-for="m in props.methods" :key="m.id" :value="m.id" :description="m.description ?? t.kinds[m.kind]">
            <span class="flex flex-wrap items-center gap-x-2">
              <slot v-if="$slots.mark" name="mark" :method="m" />
              <span v-else>{{ m.name }}</span>
              <span v-if="$slots.mark" class="sr-only">{{ m.name }}</span>
            </span>
            <template #meta>
              <span class="text-caption text-muted-foreground">{{ m.fee ? t.fee(fmtFee(m.fee)) : t.noFee }}</span>
            </template>
          </NqRadioCard>
        </NqRadioGroup>
      </NqCardContent>

      <NqCardContent v-if="method" data-slot="local-payments-instructions" class="grid gap-4 sm:grid-cols-[1fr_auto]">
        <div class="flex min-w-0 flex-col gap-3">
          <NqBadge variant="outline" class="self-start">{{ t.kinds[method.kind] }}</NqBadge>
          <div v-if="method.steps?.length" class="flex flex-col gap-1.5">
            <h4 class="text-caption font-medium text-muted-foreground">{{ t.steps }}</h4>
            <ol class="flex list-decimal flex-col gap-1 ps-5 text-body-sm text-foreground marker:text-muted-foreground">
              <li v-for="s in method.steps" :key="s">{{ s }}</li>
            </ol>
          </div>
          <div class="flex flex-col gap-1.5">
            <h4 class="text-caption font-medium text-muted-foreground">{{ t.details }}</h4>
            <dl class="flex flex-col divide-y divide-border rounded-card bg-nq-surface">
              <div v-for="d in method.details" :key="d.label" class="flex items-center justify-between gap-3 px-3 py-2">
                <dt class="text-caption text-muted-foreground">{{ d.label }}</dt>
                <dd class="flex min-w-0 items-center gap-1 text-body-sm text-foreground">
                  <bdi dir="ltr" class="truncate font-mono">{{ d.value }}</bdi>
                  <NqCopyButton v-if="d.copyable !== false" :value="d.value" size="icon-sm" variant="ghost" :label="`${t.copy}: ${d.label}`" />
                </dd>
              </div>
            </dl>
          </div>
          <dl class="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-body-sm">
            <dt class="text-muted-foreground">{{ t.amount }}</dt>
            <dd class="text-end"><NqNum :value="minorToMajor(props.amount, currency)" :format="{ style: 'currency', currency }" /></dd>
            <template v-if="fee">
              <dt class="text-muted-foreground">{{ t.feeRow }}</dt>
              <dd class="text-end"><NqNum :value="minorToMajor(fee, currency)" :format="{ style: 'currency', currency }" /></dd>
            </template>
            <dt class="font-medium text-foreground">{{ t.total }}</dt>
            <dd class="text-end text-label font-semibold text-foreground"><NqNum :value="minorToMajor(total, currency)" :format="{ style: 'currency', currency }" /></dd>
          </dl>
        </div>
        <div v-if="method.qr" class="flex flex-col items-center gap-1.5">
          <NqQrCode :value="method.qr" :size="132" :label="`${t.scan}: ${method.name}`" />
          <span class="text-caption text-muted-foreground">{{ t.scan }}</span>
        </div>
      </NqCardContent>

      <NqCardContent class="grid gap-4">
        <NqField :invalid="touched && Boolean(refProblem)">
          <NqFieldLabel>{{ t.reference }}</NqFieldLabel>
          <NqInput v-model="reference" ltr name="reference" autocomplete="off" :disabled="busy" />
          <NqFieldError v-if="touched && refProblem" match>{{ t.problems[refProblem] }}</NqFieldError>
          <NqFieldDescription v-else>{{ t.referenceHint }}</NqFieldDescription>
        </NqField>
        <NqField v-if="props.receiptRequired" :invalid="touched && !receipt">
          <NqFieldLabel>{{ t.receipt }}</NqFieldLabel>
          <NqFileUpload v-model="files" accept="image/*,application/pdf" :max-size="props.maxReceiptSize" :max-files="1" :multiple="false" :disabled="busy" @files="markDone">
            {{ t.receiptDrop }}
          </NqFileUpload>
          <NqFieldError v-if="touched && !receipt" match>{{ t.problems.receipt }}</NqFieldError>
          <NqFieldDescription v-else>{{ t.receiptHint }}</NqFieldDescription>
        </NqField>
        <p v-if="touched && (limit || !method) && problem" role="alert" class="flex items-center gap-2 text-body-sm text-nq-danger-text">
          <CircleX aria-hidden="true" class="size-4" />
          {{ problem }}
        </p>
        <p v-if="error" role="alert" class="flex items-center gap-2 text-body-sm text-nq-danger-text">
          <CircleX aria-hidden="true" class="size-4" />
          {{ error }}
        </p>
      </NqCardContent>
      <NqCardContent class="flex flex-wrap justify-end gap-2">
        <NqButton v-if="props.onCancel" type="button" variant="ghost" :disabled="busy" @click="props.onCancel()">{{ t.cancel }}</NqButton>
        <NqButton type="submit" variant="primary" :loading="busy">{{ t.submit }}</NqButton>
      </NqCardContent>
    </form>
  </NqCard>
</template>
