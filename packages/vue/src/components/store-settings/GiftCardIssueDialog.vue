<script setup lang="ts">
import { RefreshCw } from "lucide-vue-next";
import { computed, ref, useId } from "vue";
import { NqButton } from "../button";
import { NqCurrencyInput } from "../currency-input";
import { NqDatePicker } from "../date-picker";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldDescription, NqFieldLabel, NqInput } from "../field";
import { generateGiftCardCode, isValidGiftCardCode, issueGiftCard, normalizeGiftCardCode, type GiftCard } from "./gift-card-logic";
import { uid, type StoreSettingsLabels } from "./strings";
import { useSettingsStrings } from "./use-settings";

// The "issue a card" dialog. Internal to NqGiftCardsManager.
const props = defineProps<{ currency: string; now: Date; existing: readonly string[]; actor?: string; busy: boolean; error: string | null; labels?: StoreSettingsLabels }>();
const emit = defineEmits<{ cancel: []; issue: [card: GiftCard] }>();
const { t } = useSettingsStrings(() => props.labels);
const id = useId();
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 0).toISOString();

const code = ref(generateGiftCardCode());
const amount = ref<number | null>(50000);
const expires = ref<Date | null>(null);
const name = ref("");
const email = ref("");
const touched = ref(false);
const clean = computed(() => normalizeGiftCardCode(code.value));
const codeOk = computed(() => isValidGiftCardCode(clean.value));
const taken = computed(() => props.existing.some((c) => normalizeGiftCardCode(c) === clean.value));
const emailOk = computed(() => !email.value.trim() || /^\S+@\S+\.\S+$/.test(email.value.trim()));
const amountBad = computed(() => !amount.value || amount.value <= 0);
const bad = computed(() => amountBad.value || !codeOk.value || taken.value || !emailOk.value);

function submit() {
  touched.value = true;
  if (bad.value || !amount.value) return;
  const n = name.value.trim();
  const e = email.value.trim();
  const card = issueGiftCard({
    id: uid("gc"),
    code: clean.value,
    amount: amount.value,
    currency: props.currency,
    now: props.now,
    ...(expires.value ? { expiresAt: endOfDay(expires.value) } : {}),
    ...(n || e ? { recipient: { ...(n ? { name: n } : {}), ...(e ? { email: e } : {}) } } : {}),
    ...(props.actor ? { by: props.actor } : {}),
  });
  if (!("error" in card)) emit("issue", card);
}
</script>

<template>
  <NqDialog :open="true" @update:open="(o: boolean) => !o && !props.busy && emit('cancel')">
    <NqDialogContent class="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
      <form novalidate class="grid gap-4" @submit.prevent="submit">
        <NqDialogHeader>
          <NqDialogTitle>{{ t.issueCard }}</NqDialogTitle>
          <NqDialogDescription>{{ t.issueHint }}</NqDialogDescription>
        </NqDialogHeader>
        <NqField :invalid="touched && (!codeOk || taken)">
          <NqFieldLabel :for="`${id}-code`">{{ t.code }}</NqFieldLabel>
          <div class="flex gap-2">
            <NqInput :id="`${id}-code`" v-model="code" ltr class="flex-1 font-mono uppercase" />
            <NqButton type="button" variant="secondary" @click="code = generateGiftCardCode()">
              <RefreshCw aria-hidden="true" />
              {{ t.generate }}
            </NqButton>
          </div>
          <NqFieldDescription>{{ taken ? t.codeTaken : codeOk ? t.codeHint : t.codeInvalid }}</NqFieldDescription>
        </NqField>
        <div class="grid gap-4 sm:grid-cols-2">
          <NqField :invalid="touched && amountBad">
            <NqFieldLabel>{{ t.amount }}</NqFieldLabel>
            <NqCurrencyInput v-model="amount" :currency="props.currency" :aria-label="t.amount" />
          </NqField>
          <NqField>
            <NqFieldLabel>{{ t.expires }}</NqFieldLabel>
            <NqDatePicker v-model="expires" :aria-label="t.expires" />
            <NqFieldDescription>{{ t.expiresHint }}</NqFieldDescription>
          </NqField>
          <NqField>
            <NqFieldLabel :for="`${id}-name`">{{ t.recipientName }}</NqFieldLabel>
            <NqInput :id="`${id}-name`" v-model="name" />
          </NqField>
          <NqField :invalid="touched && !emailOk">
            <NqFieldLabel :for="`${id}-email`">{{ t.recipientEmail }}</NqFieldLabel>
            <NqInput :id="`${id}-email`" v-model="email" ltr type="email" />
          </NqField>
        </div>
        <p v-if="props.error" role="alert" class="text-body-sm text-nq-danger-text">{{ props.error }}</p>
        <NqDialogFooter>
          <NqButton type="button" variant="ghost" :disabled="props.busy" @click="emit('cancel')">{{ t.cancel }}</NqButton>
          <NqButton type="submit" variant="primary" :loading="props.busy">{{ t.issueCard }}</NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
