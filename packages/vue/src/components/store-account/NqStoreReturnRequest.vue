<script setup lang="ts">
import { ArrowLeft, Minus, Package, Plus } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqButton } from "../button";
import { NqCheckbox } from "../checkbox";
import { NqTextarea } from "../field";
import { NqDropzone, type FileRejection } from "../file-upload";
import { NqNum } from "../numeric";
import { NqRadioCard, NqRadioGroup } from "../radio-group";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import NqStoreMoney from "../store-orders-admin/NqStoreMoney.vue";
import { useStoreAccountStrings, type StoreAccountLabels } from "./account-strings";
import type { CommerceOrder } from "./commerce";
import NqStoreReturnPhoto from "./NqStoreReturnPhoto.vue";
import {
  RETURN_REASONS,
  deliveredAt,
  planReturn,
  reasonNeedsPhotos,
  refundMethodsFor,
  returnWindow,
  returnableLines,
  type RefundMethod,
  type ReturnIssue,
  type ReturnReason,
  type ReturnRequest,
} from "./return-math";

// The return / refund request flow: pick lines and quantities, a reason, photos when the reason needs proof, how to be
// refunded, with the return window and a live refund estimate. All checks come from `planReturn`.
export interface StoreReturnSubmission {
  orderId: string;
  lines: { lineId: string; quantity: number }[];
  reason: ReturnReason;
  note: string;
  photos: File[];
  refundMethod: RefundMethod;
  /** The estimate shown to the customer, in minor units. The store confirms the final amount. */
  refundAmount: number;
}

const props = withDefaults(
  defineProps<{
    order: CommerceOrder;
    /** ISO 4217 code. Defaults to USD, or SAR in Arabic. */
    currency?: string;
    /** Existing requests, so units already in a return are not offered again. */
    requests?: readonly ReturnRequest[];
    /** Days after delivery a return can be requested. Default 30. */
    returnDays?: number;
    now?: number | Date;
    maxPhotos?: number;
    onSubmit?: (submission: StoreReturnSubmission) => void;
    onBack?: () => void;
    labels?: StoreAccountLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { requests: () => [], returnDays: 30, now: undefined, maxPhotos: 5 },
);

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const currency = useCurrency(() => props.currency);
const { t } = useStoreAccountStrings(() => props.labels);
const clock = Date.now();
const rows = computed(() => returnableLines(props.order, props.requests));
const win = computed(() => returnWindow(deliveredAt(props.order), props.returnDays, props.now ?? clock));
const methods = computed(() => refundMethodsFor(props.order));

const qty = ref<Record<string, number>>({});
const reason = ref<ReturnReason | undefined>();
const note = ref("");
const photos = ref<File[]>([]);
const method = ref<RefundMethod | undefined>(refundMethodsFor(props.order)[0]);
const photoError = ref<string | null>(null);
const tried = ref(false);

const picks = computed(() =>
  Object.entries(qty.value)
    .filter(([, q]) => q > 0)
    .map(([lineId, quantity]) => ({ lineId, quantity })),
);
const plan = computed(() => planReturn(props.order, props.requests, { picks: picks.value, reason: reason.value, note: note.value, photos: photos.value.length, refundMethod: method.value, windowOpen: win.value.open }));
const has = (code: ReturnIssue["code"]) => plan.value.issues.some((i) => i.code === code);
const show = (code: ReturnIssue["code"]) => tried.value && has(code);
const needsPhotos = computed(() => reasonNeedsPhotos(reason.value));
const reasonItems = RETURN_REASONS;
const overOf = (lineId: string) => {
  const issue = plan.value.issues.find((i) => i.code === "line-over" && i.lineId === lineId);
  return issue && issue.code === "line-over" ? issue : undefined;
};

function set(lineId: string, value: number, max: number) {
  qty.value = { ...qty.value, [lineId]: Math.min(Math.max(value, 0), max) };
}
function onFiles(files: File[]) {
  photoError.value = null;
  photos.value = [...photos.value, ...files].slice(0, props.maxPhotos);
}
function onReject(r: FileRejection[]) {
  if (r.length) photoError.value = r.some((x) => x.code === "too-many") ? t.value.tooManyPhotos(props.maxPhotos) : t.value.photoRejected;
}
function submit() {
  tried.value = true;
  if (!plan.value.ok || !reason.value || !method.value) return;
  props.onSubmit?.({ orderId: props.order.id, lines: plan.value.picks, reason: reason.value, note: note.value.trim(), photos: photos.value, refundMethod: method.value, refundAmount: plan.value.refundAmount });
}
</script>

<template>
  <form data-slot="store-return-request" novalidate :class="cn('flex min-w-0 flex-col gap-5', props.class)" @submit.prevent="submit">
    <NqButton v-if="props.onBack" type="button" variant="ghost" size="sm" class="self-start" @click="props.onBack()">
      <ArrowLeft aria-hidden="true" class="rtl:-scale-x-100" />
      {{ t.back }}
    </NqButton>
    <header class="flex flex-col gap-1">
      <h2 class="m-0 text-h3 font-semibold">{{ t.returnTitle }} <bdi class="text-muted-foreground">{{ props.order.number }}</bdi></h2>
      <p class="m-0 text-body-sm text-muted-foreground">{{ t.returnIntro }}</p>
      <p :class="cn('m-0 text-body-sm', win.open ? 'text-muted-foreground' : 'font-medium text-foreground')" :role="win.open ? undefined : 'alert'">
        {{ win.open ? t.windowOpen(win.daysLeft) : t.windowShut }}
      </p>
    </header>

    <fieldset class="m-0 flex min-w-0 flex-col gap-2 border-0 p-0" :disabled="!win.open">
      <legend class="mb-2 text-label font-semibold">{{ t.returnPick }}</legend>
      <ul class="m-0 flex list-none flex-col gap-2 p-0">
        <li
          v-for="row in rows"
          :key="row.line.id"
          :class="cn('flex flex-wrap items-center gap-3 rounded-card border bg-card p-3', (qty[row.line.id] ?? 0) > 0 ? 'border-primary' : 'border-border', row.returnable === 0 && 'opacity-60')"
        >
          <NqCheckbox :aria-label="row.line.name" :disabled="row.returnable === 0" :model-value="(qty[row.line.id] ?? 0) > 0" @update:model-value="(c: boolean) => set(row.line.id, c ? 1 : 0, row.returnable)" />
          <span class="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-control border border-border bg-secondary">
            <img v-if="row.line.image" :src="row.line.image" alt="" class="size-full object-cover" />
            <Package v-else aria-hidden="true" class="size-5 text-muted-foreground" />
          </span>
          <div class="flex min-w-0 flex-1 basis-40 flex-col gap-0.5">
            <span class="truncate font-medium">{{ row.line.name }}</span>
            <span v-if="row.line.variantLabel" class="truncate text-body-sm text-muted-foreground">{{ row.line.variantLabel }}</span>
            <span class="text-caption text-muted-foreground">
              {{ row.returnable > 0 ? t.returnableLeft(row.returnable) : t.notReturnable }}{{ row.inRequest > 0 ? ` · ${t.inRequest(row.inRequest)}` : "" }}
            </span>
          </div>
          <div v-if="row.returnable > 0" class="flex items-center gap-1" role="group" :aria-label="`${t.quantity}: ${row.line.name}`">
            <NqButton type="button" size="icon-sm" variant="secondary" aria-label="-" :disabled="(qty[row.line.id] ?? 0) <= 0" @click="set(row.line.id, (qty[row.line.id] ?? 0) - 1, row.returnable)">
              <Minus aria-hidden="true" />
            </NqButton>
            <NqNum :value="qty[row.line.id] ?? 0" class="min-w-6 text-center" aria-live="polite" />
            <NqButton type="button" size="icon-sm" variant="secondary" aria-label="+" :disabled="(qty[row.line.id] ?? 0) >= row.returnable" @click="set(row.line.id, (qty[row.line.id] ?? 0) + 1, row.returnable)">
              <Plus aria-hidden="true" />
            </NqButton>
          </div>
          <p v-if="overOf(row.line.id)" class="m-0 basis-full text-caption text-nq-danger-text">{{ t.issueLineOver(overOf(row.line.id)!.max) }}</p>
        </li>
      </ul>
      <p v-if="show('empty')" role="alert" class="m-0 text-body-sm text-nq-danger-text">{{ t.issueEmpty }}</p>
    </fieldset>

    <div class="flex flex-col gap-2">
      <span class="text-label font-semibold">{{ t.returnReason }}</span>
      <NqSelect :model-value="reason ?? null" @update:model-value="(v: string | number | null) => (reason = v ? (String(v) as ReturnReason) : undefined)">
        <NqSelectTrigger :aria-label="t.returnReason" :invalid="show('reason')">
          <NqSelectValue :placeholder="t.reasonPlaceholder" />
        </NqSelectTrigger>
        <NqSelectContent>
          <NqSelectItem v-for="r in reasonItems" :key="r" :value="r">{{ t.reasons[r] }}</NqSelectItem>
        </NqSelectContent>
      </NqSelect>
      <p v-if="show('reason')" role="alert" class="m-0 text-body-sm text-nq-danger-text">{{ t.issueReason }}</p>
      <label class="flex flex-col gap-1.5 text-body-sm">
        <span class="font-medium">{{ t.returnNote }}</span>
        <NqTextarea v-model="note" :rows="3" :aria-invalid="show('note') || undefined" />
      </label>
      <p v-if="show('note')" role="alert" class="m-0 text-body-sm text-nq-danger-text">{{ t.returnNoteRequired }}</p>
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-label font-semibold">{{ t.photos }}</span>
      <p :class="cn('m-0 text-body-sm', show('photos') ? 'text-nq-danger-text' : 'text-muted-foreground')" :role="show('photos') ? 'alert' : undefined">
        {{ needsPhotos ? t.photosNeeded : t.photosOptional }}
      </p>
      <NqDropzone accept="image/*" :max-size="MAX_PHOTO_BYTES" :max-files="props.maxPhotos" :count="photos.length" :invalid="show('photos')" :input-props="{ 'aria-label': t.photos }" @files="onFiles" @reject="onReject">
        {{ t.photoPrompt }}
      </NqDropzone>
      <p v-if="photoError" role="alert" class="m-0 text-body-sm text-nq-danger-text">{{ photoError }}</p>
      <ul v-if="photos.length > 0" class="m-0 flex list-none flex-wrap gap-2 p-0">
        <NqStoreReturnPhoto v-for="(file, i) in photos" :key="`${file.name}-${i}`" :file="file" :label="t.removePhoto" @remove="photos = photos.filter((_, j) => j !== i)" />
      </ul>
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-label font-semibold">{{ t.refundMethod }}</span>
      <NqRadioGroup :aria-label="t.refundMethod" :model-value="method ?? ''" class="grid gap-2" @update:model-value="(v: string) => (method = v as RefundMethod)">
        <NqRadioCard v-for="m in methods" :key="m" :value="m" :title="t.methods[m]" :description="t.methodHints[m]" />
      </NqRadioGroup>
      <p v-if="show('method')" role="alert" class="m-0 text-body-sm text-nq-danger-text">{{ t.issueMethod }}</p>
    </div>

    <div class="flex flex-col gap-1 rounded-card border border-border bg-secondary p-4">
      <div class="flex items-center justify-between gap-3">
        <span class="text-label font-semibold">{{ t.refundEstimate }}</span>
        <NqStoreMoney :amount="plan.refundAmount" :currency="currency" class="text-h3 font-semibold" />
      </div>
      <p class="m-0 text-caption text-muted-foreground">{{ t.estimateNote }}</p>
    </div>

    <div class="flex flex-col gap-2">
      <p v-if="tried && !plan.ok" role="alert" class="m-0 text-body-sm text-nq-danger-text">{{ t.fixIssues }}</p>
      <NqButton type="submit" variant="primary" :disabled="!win.open" class="self-start">{{ t.submitReturn }}</NqButton>
    </div>
  </form>
</template>
