<script setup lang="ts">
import { Trash2 } from "lucide-vue-next";
import { computed, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqButton } from "../button";
import { NqField, NqFieldLabel, NqInput } from "../field";
import StoreMoney from "./StoreMoney.vue";
import { applyGiftCards, giftCardBalance, giftCardStatus, isValidGiftCardCode, maskGiftCardCode, normalizeGiftCardCode, type GiftCard, type GiftCardApplication } from "./gift-card-logic";
import type { StoreSettingsLabels } from "./strings";
import type { GiftCardLookup } from "./types";
import { useSettingsStrings } from "./use-settings";

// The gift card box at checkout: type a code, see the card's balance, and see how much of the total it covers.
// The code is checked for shape and check character before any request, so a typo never reaches the server. Several
// cards can be added; the one that expires soonest is spent first. Cards in another currency are refused.
const props = withDefaults(
  defineProps<{
    /** The cards the customer has entered so far. */
    cards: readonly GiftCard[];
    /** What is left to pay before gift cards, in minor units. */
    total: number;
    /** Defaults to USD, or SAR in Arabic. */
    currency?: string;
    /** Finds a card by its normalised code. Resolve the card, or `{ error: "not-found" }`. */
    onLookup: (code: string) => Promise<GiftCardLookup>;
    /** Called with the new list after a card is added or removed. */
    onCardsChange: (cards: GiftCard[]) => void;
    /** Called when the split changes: what each card pays, the total covered and what is left for the customer. */
    onChange?: (result: { applied: GiftCardApplication[]; covered: number; remaining: number }) => void;
    now?: Date;
    disabled?: boolean;
    labels?: StoreSettingsLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { currency: undefined, onChange: undefined, now: undefined, disabled: false, labels: undefined },
);

const currency = useCurrency(() => props.currency);
const { t } = useSettingsStrings(() => props.labels);
const id = useId();
const today = computed(() => props.now ?? new Date());
const code = ref("");
const busy = ref(false);
const problem = ref<string | null>(null);
const result = computed(() => applyGiftCards(props.cards, props.total, { now: today.value, currency: currency.value }));
const byId = computed(() => new Map(result.value.applied.map((a) => [a.cardId, a.amount])));

function commit(next: GiftCard[]) {
  props.onCardsChange(next);
  props.onChange?.(applyGiftCards(next, props.total, { now: today.value, currency: currency.value }));
}
async function add() {
  const clean = normalizeGiftCardCode(code.value);
  if (!clean) return;
  problem.value = null;
  const tt = t.value;
  if (!isValidGiftCardCode(clean)) return void (problem.value = tt.codeInvalid);
  if (props.cards.some((c) => c.code === clean)) return void (problem.value = tt.alreadyAdded);
  busy.value = true;
  try {
    const found = await props.onLookup(clean);
    if ("error" in found) return void (problem.value = tt.giftErrors[found.error]);
    if (found.currency !== currency.value) return void (problem.value = tt.giftErrors.currency);
    const st = giftCardStatus(found, today.value);
    if (st === "expired") return void (problem.value = tt.giftErrors.expired);
    if (st === "disabled") return void (problem.value = tt.giftErrors.disabled);
    if (st === "depleted") return void (problem.value = tt.giftErrors.empty);
    commit([...props.cards, found]);
    code.value = "";
  } catch {
    problem.value = tt.lookupFailed;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section data-slot="gift-card-field" :aria-label="t.giftCard" :class="cn('grid min-w-0 gap-3', props.class)">
    <form class="flex items-start gap-2" @submit.prevent="add">
      <NqField class="min-w-0 flex-1" :invalid="problem !== null">
        <NqFieldLabel :for="`${id}-code`">{{ t.giftCard }}</NqFieldLabel>
        <NqInput
          :id="`${id}-code`"
          ltr
          class="font-mono uppercase"
          :model-value="code"
          :disabled="props.disabled || busy"
          placeholder="XXXX-XXXX-XXXX-XXXX"
          autocomplete="off"
          :aria-describedby="problem ? `${id}-err` : undefined"
          @update:model-value="(v) => ((problem = null), (code = String(v ?? '')))"
        />
      </NqField>
      <NqButton type="submit" variant="secondary" class="mt-[1.625rem]" :loading="busy" :disabled="props.disabled || !code.trim()">{{ t.applyCard }}</NqButton>
    </form>
    <p :id="`${id}-err`" role="alert" :class="cn('text-body-sm text-nq-danger-text', !problem && 'sr-only')">{{ problem }}</p>
    <ul v-if="props.cards.length > 0" class="grid gap-1.5">
      <li v-for="c in props.cards" :key="c.id" class="flex min-w-0 items-center justify-between gap-2 rounded-control border border-border bg-card px-2.5 py-1.5 text-body-sm">
        <span class="flex min-w-0 flex-col">
          <bdi dir="ltr" class="truncate font-mono">{{ maskGiftCardCode(c.code) }}</bdi>
          <span class="text-caption text-muted-foreground">{{ t.balance }}: <StoreMoney :minor="giftCardBalance(c, today)" :currency="c.currency" /></span>
        </span>
        <span class="flex items-center gap-2">
          <span class="font-medium text-nq-success-text">−<StoreMoney :minor="byId.get(c.id) ?? 0" :currency="currency" /></span>
          <NqButton type="button" size="icon-sm" variant="ghost" :disabled="props.disabled" :aria-label="`${t.removeCard}: ${maskGiftCardCode(c.code)}`" @click="commit(props.cards.filter((x) => x.id !== c.id))">
            <Trash2 aria-hidden="true" />
          </NqButton>
        </span>
      </li>
    </ul>
    <p v-if="props.cards.length > 0" role="status" aria-live="polite" class="flex items-center justify-between gap-2 text-body-sm">
      <span class="text-muted-foreground">{{ t.youPay }}</span>
      <span class="font-semibold text-foreground"><StoreMoney :minor="result.remaining" :currency="currency" /></span>
    </p>
  </section>
</template>
