<script setup lang="ts">
import { Banknote, CheckCircle2, CreditCard, Plus, Wallet as WalletIcon, X } from "lucide-vue-next";
import { computed, ref, watch } from "vue";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCurrencyInput } from "../currency-input";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqLineItemMoney, type LineItemTotals } from "../line-item-editor";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import NqPosRow from "./NqPosRow.vue";
import { posCanAddTender, posQuickTenders, posRoundMinor, posSettle, posTenderLimit, type PosPaymentMethod, type PosTender } from "./pos-math";
import type { PosRegisterStrings } from "./strings";
import type { PosSale } from "./types";

// Takes payment: one or several tenders (cash, card, wallet), the remaining balance and change, then the receipt.
const props = defineProps<{
  open: boolean;
  done: PosSale | null;
  currency: string;
  totals: LineItemTotals;
  t: PosRegisterStrings;
  onPay: (tenders: PosTender[]) => Promise<void>;
}>();
const emit = defineEmits<{ "update:open": [open: boolean]; new: [] }>();

let counter = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(counter++).toString(36)}`;
const METHOD_ICON = { cash: Banknote, card: CreditCard, wallet: WalletIcon } as const;
const METHODS = ["cash", "card", "wallet"] as const;

const method = ref<PosPaymentMethod>("cash");
const amount = ref<number | null>(null);
const tenders = ref<PosTender[]>([]);
const busy = ref(false);
const error = ref(false);
const due = computed(() => (props.done ? props.done.totals.total : props.totals.total));

watch(
  () => [props.open, props.done] as const,
  ([open, done]) => {
    if (open && !done) {
      tenders.value = [];
      amount.value = null;
      method.value = "cash";
      error.value = false;
    }
  },
  { immediate: true },
);

const base = computed(() => posSettle(due.value, tenders.value));
/* On a first tender, card and wallet left empty mean "the whole sale", so a single card payment is one tap. After that, and for cash, empty means nothing yet. */
const entered = computed(() => (amount.value === null ? (method.value === "cash" || tenders.value.length > 0 ? 0 : base.value.remaining) : posRoundMinor(amount.value)));
const limit = computed(() => posTenderLimit(due.value, tenders.value, method.value));
const over = computed(() => amount.value !== null && entered.value > limit.value);
const canAdd = computed(() => posCanAddTender(due.value, tenders.value, method.value, entered.value));
const all = computed<PosTender[]>(() => (canAdd.value ? [...tenders.value, { id: uid("tender"), method: method.value, amount: entered.value }] : tenders.value));
const s = computed(() => posSettle(due.value, all.value));
const complete = computed(() => base.value.remaining <= 0);
const cashOpen = computed(() => method.value === "cash" && !complete.value);
const quicks = computed(() => (method.value === "cash" ? posQuickTenders(base.value.remaining, props.currency) : [base.value.remaining]));

function addTender() {
  if (!canAdd.value) return;
  tenders.value = [...tenders.value, { id: uid("tender"), method: method.value, amount: entered.value }];
  amount.value = null;
  error.value = false;
}
async function submit() {
  if (busy.value || over.value) return;
  if (!s.value.settled) {
    addTender();
    return;
  }
  busy.value = true;
  error.value = false;
  try {
    await props.onPay(all.value);
  } catch {
    error.value = true;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <NqDialog :open="props.open" @update:open="(o: boolean) => !busy && emit('update:open', o)">
    <NqDialogContent class="max-w-md">
      <div v-if="props.done" class="flex flex-col items-center gap-4 text-center">
        <CheckCircle2 aria-hidden="true" class="size-10 text-nq-success-text" />
        <NqDialogHeader class="items-center text-center">
          <NqDialogTitle>{{ props.t.saleDone }}</NqDialogTitle>
          <NqDialogDescription>
            {{ props.t.receiptNo }} <bdi dir="ltr">{{ props.done.number }}</bdi>
          </NqDialogDescription>
        </NqDialogHeader>
        <dl class="flex w-full flex-col gap-1.5 rounded-floating border border-border bg-card p-3">
          <NqPosRow :label="props.t.total" strong><NqLineItemMoney :minor="props.done.totals.total" :currency="props.currency" /></NqPosRow>
          <NqPosRow :label="props.t.tax"><NqLineItemMoney :minor="props.done.totals.taxTotal" :currency="props.currency" /></NqPosRow>
          <NqPosRow v-for="tender in props.done.tenders" :key="tender.id" :label="props.t[tender.method]">
            <NqLineItemMoney :minor="tender.amount" :currency="props.currency" />
          </NqPosRow>
          <NqPosRow v-if="props.done.tenders.length > 1" :label="props.t.paid"><NqLineItemMoney :minor="props.done.tendered" :currency="props.currency" /></NqPosRow>
          <NqPosRow v-if="props.done.change > 0 || props.done.method === 'cash'" :label="props.t.change" strong>
            <NqLineItemMoney :minor="props.done.change" :currency="props.currency" />
          </NqPosRow>
        </dl>
        <NqButton variant="primary" size="lg" class="w-full" autofocus @click="emit('new')">{{ props.t.newSale }}</NqButton>
      </div>
      <form v-else class="flex flex-col gap-4" @submit.prevent="submit">
        <NqDialogHeader>
          <NqDialogTitle>{{ props.t.payTitle }}</NqDialogTitle>
          <NqDialogDescription>{{ props.t.payText }}</NqDialogDescription>
        </NqDialogHeader>
        <dl class="flex flex-col gap-1.5 rounded-floating bg-secondary p-3">
          <div class="flex items-baseline justify-between gap-3">
            <dt class="text-label text-muted-foreground">{{ props.t.total }}</dt>
            <dd><NqLineItemMoney :minor="due" :currency="props.currency" class="text-h2 text-foreground" /></dd>
          </div>
          <div v-if="s.paid > 0" class="flex items-baseline justify-between gap-3">
            <dt class="text-body-sm text-muted-foreground">{{ props.t.paid }}</dt>
            <dd><NqLineItemMoney :minor="s.paid" :currency="props.currency" class="text-body-sm text-foreground" /></dd>
          </div>
          <div v-if="s.paid > 0" class="flex items-baseline justify-between gap-3" aria-live="polite">
            <dt class="text-label text-muted-foreground">{{ props.t.remaining }}</dt>
            <dd>
              <NqLineItemMoney v-if="s.remaining > 0" :minor="s.remaining" :currency="props.currency" class="text-h3 text-foreground" />
              <NqBadge v-else variant="success">{{ props.t.paidInFull }}</NqBadge>
            </dd>
          </div>
        </dl>
        <ul v-if="tenders.length" :aria-label="props.t.payments" class="flex flex-col divide-y divide-border rounded-floating border border-border">
          <li v-for="tender in tenders" :key="tender.id" class="flex items-center gap-2 px-3 py-1.5">
            <component :is="METHOD_ICON[tender.method]" aria-hidden="true" class="size-4 text-muted-foreground" />
            <span class="text-label text-foreground">{{ props.t[tender.method] }}</span>
            <NqLineItemMoney :minor="tender.amount" :currency="props.currency" class="ms-auto text-label text-foreground" />
            <NqButton type="button" variant="ghost" size="icon" :disabled="busy" :aria-label="`${props.t.removePayment}, ${props.t[tender.method]}`" @click="tenders = tenders.filter((x) => x.id !== tender.id)">
              <X aria-hidden="true" />
            </NqButton>
          </li>
        </ul>
        <template v-if="!complete">
          <NqToggleGroup :aria-label="props.t.method" :model-value="[method]" class="grid w-full grid-cols-3" @update:model-value="(v: string[]) => v[0] && (method = v[0] as PosPaymentMethod)">
            <NqToggle v-for="m in METHODS" :key="m" :value="m" :aria-label="props.t[m]" class="h-12 gap-2">
              <component :is="METHOD_ICON[m]" aria-hidden="true" />
              {{ props.t[m] }}
            </NqToggle>
          </NqToggleGroup>
          <div class="flex flex-col gap-3">
            <label class="flex flex-col gap-1.5 text-label text-foreground">
              {{ method === "cash" ? props.t.tendered : props.t.amount }}
              <NqCurrencyInput
                :key="method"
                :model-value="amount"
                :currency="props.currency"
                :min="0"
                :invalid="over"
                :aria-label="method === 'cash' ? props.t.tendered : props.t.amount"
                @update:model-value="(v: number | null) => (amount = v)"
              />
            </label>
            <p v-if="over" role="alert" class="text-body-sm text-nq-danger-text">{{ props.t.overpay }}</p>
            <div class="flex flex-wrap gap-2">
              <NqButton v-for="quick in quicks" :key="quick" type="button" variant="secondary" @click="amount = quick">
                <template v-if="quick === base.remaining">{{ props.t.exactAmount }}</template>
                <NqLineItemMoney v-else :minor="quick" :currency="props.currency" />
              </NqButton>
              <NqButton type="button" variant="secondary" class="ms-auto" :disabled="!canAdd || busy" @click="addTender">
                <Plus aria-hidden="true" />
                {{ props.t.addPayment }}
              </NqButton>
            </div>
          </div>
        </template>
        <div v-if="cashOpen || s.change > 0" class="flex items-baseline justify-between gap-3" aria-live="polite">
          <span class="text-label text-muted-foreground">{{ props.t.change }}</span>
          <NqLineItemMoney :minor="s.change" :currency="props.currency" class="text-h3 text-foreground" />
        </div>
        <p v-if="error" role="alert" class="text-body-sm text-nq-danger-text">{{ props.t.failed }}</p>
        <NqDialogFooter>
          <NqButton type="button" variant="secondary" :disabled="busy" @click="emit('update:open', false)">{{ props.t.cancel }}</NqButton>
          <NqButton type="submit" variant="primary" size="lg" :disabled="!s.settled || over" :loading="busy">{{ props.t.confirm }}</NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
