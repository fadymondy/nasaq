<script setup lang="ts">
import { computed, ref, useId } from "vue";
import { cn } from "../../lib/cn";
import { NqAlert } from "../alert";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCurrencyInput } from "../currency-input";
import { NqField, NqFieldLabel, NqInput } from "../field";
import { formatDate } from "../numeric";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqSheetBody, NqSheetDescription, NqSheetHeader, NqSheetTitle } from "../sheet";
import { NqStatus } from "../status";
import { NqSwitch } from "../switch";
import StoreMoney from "./StoreMoney.vue";
import { adjustGiftCard, giftCardBalance, giftCardStatus, initialValue, ledgerIssues, redeemGiftCard, type GiftCard, type GiftCardError, type GiftCardStatus } from "./gift-card-logic";
import type { StoreSettingsLabels } from "./strings";
import { useSettingsStrings } from "./use-settings";

// The side panel of one gift card: balance, redeem, adjust, enable and the full ledger. Internal to NqGiftCardsManager.
const props = defineProps<{ card: GiftCard; now: Date; actor?: string; busy: boolean; error: string | null; labels?: StoreSettingsLabels; update: (card: GiftCard) => Promise<boolean> }>();
const { t, locale } = useSettingsStrings(() => props.labels);
const id = useId();
const TONE = { active: "success", depleted: "neutral", expired: "warning", disabled: "danger" } as const satisfies Record<GiftCardStatus, string>;

const redeem = ref<number | null>(null);
const orderId = ref("");
const adjust = ref<number | null>(null);
const adjustDir = ref<"add" | "remove">("add");
const note = ref("");
const problem = ref<string | null>(null);
const done = ref<string | null>(null);
const status = computed(() => giftCardStatus(props.card, props.now));
const balance = computed(() => giftCardBalance(props.card, props.now));
const issues = computed(() => ledgerIssues(props.card.ledger));
const rows = computed(() => [...props.card.ledger].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)));

function fail(e: GiftCardError) {
  done.value = null;
  problem.value = t.value.giftErrors[e];
}
async function doRedeem() {
  problem.value = null;
  if (!redeem.value) return fail("invalid-amount");
  const r = redeemGiftCard(props.card, redeem.value, { now: props.now, currency: props.card.currency, exact: true, ...(orderId.value.trim() ? { orderId: orderId.value.trim() } : {}), ...(props.actor ? { by: props.actor } : {}) });
  if (!r.ok) return fail(r.error);
  if (await props.update(r.card)) {
    redeem.value = null;
    orderId.value = "";
    done.value = t.value.redeemed;
  }
}
async function doAdjust() {
  problem.value = null;
  if (!adjust.value) return fail("invalid-amount");
  const r = adjustGiftCard(props.card, adjustDir.value === "add" ? adjust.value : -adjust.value, { now: props.now, ...(note.value.trim() ? { note: note.value.trim() } : {}), ...(props.actor ? { by: props.actor } : {}) });
  if (!r.ok) return fail(r.error);
  if (await props.update(r.card)) {
    adjust.value = null;
    note.value = "";
    done.value = t.value.adjusted;
  }
}
</script>

<template>
  <NqSheetHeader>
    <NqSheetTitle><bdi dir="ltr" class="font-mono">{{ props.card.code }}</bdi></NqSheetTitle>
    <NqSheetDescription>{{ props.card.recipient?.name ? `${props.card.recipient.name}${props.card.recipient.email ? ` · ${props.card.recipient.email}` : ""}` : t.noRecipient }}</NqSheetDescription>
  </NqSheetHeader>
  <NqSheetBody class="grid content-start gap-5">
    <div class="grid grid-cols-2 gap-3 rounded-card border border-border bg-nq-surface-soft p-3">
      <div>
        <p class="text-caption text-muted-foreground">{{ t.balance }}</p>
        <p class="text-h3 text-foreground"><StoreMoney :minor="balance" :currency="props.card.currency" /></p>
      </div>
      <div class="grid content-start gap-1">
        <NqStatus :tone="TONE[status]">{{ t.giftStatuses[status] }}</NqStatus>
        <p class="text-caption text-muted-foreground">{{ t.issuedValue }}: <StoreMoney :minor="initialValue(props.card)" :currency="props.card.currency" /></p>
        <p class="text-caption text-muted-foreground">{{ t.expires }}: {{ props.card.expiresAt ? formatDate(props.card.expiresAt, locale, { dateStyle: "medium" }) : t.never }}</p>
      </div>
    </div>

    <NqAlert v-if="issues.length > 0" tone="danger" :title="t.ledgerProblem">{{ issues.map((i) => t.ledgerIssues[i]).join(" ") }}</NqAlert>

    <form class="grid gap-3" @submit.prevent="doRedeem">
      <h3 class="text-h4 text-foreground">{{ t.redeem }}</h3>
      <div class="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <NqField>
          <NqFieldLabel>{{ t.amount }}</NqFieldLabel>
          <NqCurrencyInput v-model="redeem" :currency="props.card.currency" :aria-label="`${t.redeem}: ${t.amount}`" />
        </NqField>
        <NqField>
          <NqFieldLabel :for="`${id}-order`">{{ t.orderRef }}</NqFieldLabel>
          <NqInput :id="`${id}-order`" v-model="orderId" ltr />
        </NqField>
        <NqButton type="submit" variant="primary" :loading="props.busy" :disabled="status !== 'active'">{{ t.redeem }}</NqButton>
      </div>
    </form>

    <form class="grid gap-3" @submit.prevent="doAdjust">
      <h3 class="text-h4 text-foreground">{{ t.adjust }}</h3>
      <div class="grid gap-3 sm:grid-cols-[9rem_1fr] sm:items-end">
        <NqField>
          <NqFieldLabel>{{ t.direction }}</NqFieldLabel>
          <NqSelect :model-value="adjustDir" @update:model-value="(v) => v && (adjustDir = v as 'add' | 'remove')">
            <NqSelectTrigger :aria-label="t.direction"><NqSelectValue /></NqSelectTrigger>
            <NqSelectContent>
              <NqSelectItem value="add">{{ t.addBalance }}</NqSelectItem>
              <NqSelectItem value="remove">{{ t.removeBalance }}</NqSelectItem>
            </NqSelectContent>
          </NqSelect>
        </NqField>
        <NqField>
          <NqFieldLabel>{{ t.amount }}</NqFieldLabel>
          <NqCurrencyInput v-model="adjust" :currency="props.card.currency" :aria-label="`${t.adjust}: ${t.amount}`" />
        </NqField>
      </div>
      <div class="flex items-end gap-3">
        <NqField class="flex-1">
          <NqFieldLabel :for="`${id}-note`">{{ t.note }}</NqFieldLabel>
          <NqInput :id="`${id}-note`" v-model="note" />
        </NqField>
        <NqButton type="submit" variant="secondary" :loading="props.busy">{{ t.adjust }}</NqButton>
      </div>
    </form>

    <label class="flex items-center gap-2 text-body-sm">
      <NqSwitch :model-value="!props.card.disabled" :disabled="props.busy" @update:model-value="(on: boolean) => void props.update({ ...props.card, disabled: !on })" />
      {{ t.cardEnabled }}
    </label>

    <div role="status" aria-live="polite" class="min-h-5 text-body-sm">
      <span v-if="problem || props.error" class="text-nq-danger-text">{{ problem ?? props.error }}</span>
      <span v-else-if="done" class="text-nq-success-text">{{ done }}</span>
    </div>

    <section class="grid gap-2" :aria-label="t.history">
      <h3 class="text-h4 text-foreground">{{ t.history }}</h3>
      <ol class="grid gap-1.5">
        <li v-for="e in rows" :key="e.id" class="flex min-w-0 items-start justify-between gap-3 rounded-control border border-border px-2.5 py-1.5 text-body-sm">
          <div class="min-w-0">
            <p class="flex items-center gap-2">
              <NqBadge :variant="e.amount >= 0 ? 'success' : 'neutral'">{{ t.entryKinds[e.kind] }}</NqBadge>
              <span class="text-caption text-muted-foreground">{{ formatDate(e.at, locale, { dateStyle: "medium", timeStyle: "short" }) }}</span>
            </p>
            <p v-if="e.orderId || e.note" class="truncate text-caption text-muted-foreground">
              <bdi v-if="e.orderId" dir="ltr">{{ e.orderId }}</bdi>{{ e.orderId && e.note ? " · " : "" }}{{ e.note }}
            </p>
          </div>
          <span :class="cn('shrink-0 font-medium tabular-nums', e.amount < 0 ? 'text-foreground' : 'text-nq-success-text')" dir="ltr">
            {{ e.amount > 0 ? "+" : e.amount < 0 ? "−" : "" }}<StoreMoney :minor="Math.abs(e.amount)" :currency="props.card.currency" />
          </span>
        </li>
      </ol>
    </section>
  </NqSheetBody>
</template>
