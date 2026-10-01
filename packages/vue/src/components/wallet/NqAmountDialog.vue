<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldDescription, NqFieldError, NqFieldLabel, NqInput } from "../field";
import { formatNumber, NqNum } from "../numeric";
import { NqRadioCard, NqRadioGroup } from "../radio-group";
import { walletStrings, type WalletLabels } from "./strings";
import type { WalletAccount, WalletResult } from "./types";
import { checkAmount, parseAmount } from "./wallet-math";

// Shared by NqTopUpDialog and NqPayoutDialog: pick an account, type or tap an amount, confirm.
interface Props {
  open: boolean;
  title: string;
  description: string;
  currency: string;
  accounts: readonly WalletAccount[];
  accountLabel: string;
  presets?: readonly number[];
  min?: number;
  max?: number;
  maxLabel?: string;
  confirm: (amount: string) => string;
  /** Button text before an amount is typed. */
  idle: string;
  extra?: string;
  onSubmit: (amount: number, accountId: string) => Promise<WalletResult>;
  labels?: WalletLabels;
}
const props = defineProps<Props>();
const emit = defineEmits<{ "update:open": [open: boolean] }>();

const nq = useNasaq();
const t = computed(() => walletStrings(nq.locale.value, props.labels));
const text = ref("");
const accountId = ref(props.accounts[0]?.id ?? "");
const problem = ref<string | null>(null);
const busy = ref(false);
const money = (n: number) => formatNumber(n, nq.locale.value, { style: "currency", currency: props.currency });
const amount = computed(() => parseAmount(text.value));

watch(
  () => [props.open, props.accounts] as const,
  ([open]) => {
    if (open) return;
    text.value = "";
    problem.value = null;
    accountId.value = props.accounts[0]?.id ?? "";
  },
);

function setOpen(next: boolean) {
  if (!busy.value) emit("update:open", next);
}

async function submit() {
  if (busy.value) return;
  const found = checkAmount(amount.value, { min: props.min, max: props.max });
  if (found || amount.value === null) {
    problem.value = found === "min" ? t.value.min(money(props.min ?? 0)) : found === "max" ? t.value.max2(money(props.max ?? 0)) : t.value.invalid;
    return;
  }
  busy.value = true;
  problem.value = null;
  try {
    const result = await props.onSubmit(amount.value, accountId.value);
    if (result?.error) problem.value = result.error;
    else emit("update:open", false);
  } catch (e) {
    problem.value = e instanceof Error && e.message ? e.message : t.value.failedRequest;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <NqDialog :open="props.open" @update:open="setOpen">
    <NqDialogContent>
      <form novalidate class="grid gap-4" @submit.prevent="submit()">
        <NqDialogHeader>
          <NqDialogTitle>{{ props.title }}</NqDialogTitle>
          <NqDialogDescription>{{ props.description }}</NqDialogDescription>
        </NqDialogHeader>
        <NqField :invalid="Boolean(problem)">
          <NqFieldLabel>{{ props.accountLabel }}</NqFieldLabel>
          <NqRadioGroup v-if="props.accounts.length" v-model="accountId" :aria-label="props.accountLabel" :disabled="busy">
            <NqRadioCard v-for="a in props.accounts" :key="a.id" :value="a.id" :title="a.label" :description="a.description" />
          </NqRadioGroup>
          <NqFieldDescription v-else>{{ t.noAccounts }}</NqFieldDescription>
        </NqField>
        <NqField :invalid="Boolean(problem)">
          <NqFieldLabel>{{ `${t.amount} (${props.currency})` }}</NqFieldLabel>
          <NqInput v-model="text" ltr name="amount" inputmode="decimal" autocomplete="off" placeholder="0.00" :disabled="busy" @input="problem = null" />
          <NqFieldError v-if="problem" match>{{ problem }}</NqFieldError>
          <div v-if="props.presets?.length" role="group" :aria-label="t.quick" class="flex flex-wrap gap-2">
            <NqButton v-for="p in props.presets" :key="p" size="sm" type="button" :disabled="busy" @click="text = String(p)">
              <NqNum :value="p" :format="{ style: 'currency', currency: props.currency, maximumFractionDigits: 0 }" />
            </NqButton>
          </div>
          <NqButton v-if="props.maxLabel && props.max" size="sm" variant="link" type="button" :disabled="busy" class="self-start" @click="text = String(props.max)">
            {{ props.maxLabel }}
          </NqButton>
        </NqField>
        <p v-if="props.extra" class="text-caption text-muted-foreground">{{ props.extra }}</p>
        <slot name="extra" />
        <NqDialogFooter>
          <NqButton type="button" variant="ghost" :disabled="busy" @click="setOpen(false)">{{ t.cancel }}</NqButton>
          <NqButton type="submit" variant="primary" :loading="busy" :disabled="!props.accounts.length">
            {{ amount ? props.confirm(money(amount)) : props.idle }}
          </NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
