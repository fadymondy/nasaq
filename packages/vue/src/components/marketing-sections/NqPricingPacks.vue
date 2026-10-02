<script setup lang="ts">
import { computed, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { defaultCurrency } from "../../lib/money";
import { useNasaq } from "../../provider";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqPrice } from "../price";
import SectionIntro from "./SectionIntro.vue";
import type { PricingPack, PricingPacksLabels } from "./types";

const PACK_STRINGS = {
  en: { buy: "Buy", bonus: "bonus", unit: "credits", perUnit: "per credit" },
  ar: { buy: "شراء", bonus: "إضافي", unit: "رصيد", perUnit: "للرصيد" },
} as const;

// One-off bundles of credits, tokens or seats. Not a subscription: there is no period, so no plan comparison. Use
// NqPlanGrid and NqPlanCard for recurring plans. Amounts use Latin digits and the pack's currency.
// Slots: `eyebrow`, `title`, `description`. Pass `onPurchase` (or `@purchase`) to react: it may be async, and the button shows loading until it settles.
const props = withDefaults(
  defineProps<{
    eyebrow?: string;
    title?: string;
    description?: string;
    packs: readonly PricingPack[];
    /** Called when someone picks a pack. It may be async; the button shows loading until it settles. */
    onPurchase?: (pack: PricingPack) => void | Promise<void>;
    /** Show what each unit costs. Default true. */
    showUnitPrice?: boolean;
    labels?: PricingPacksLabels;
    titleAs?: "h2" | "h3";
    class?: HTMLAttributes["class"];
  }>(),
  { showUnitPrice: true, titleAs: "h2", eyebrow: undefined, title: undefined, description: undefined, onPurchase: undefined, labels: undefined },
);
const nq = useNasaq();
const ar = computed(() => nq.locale.value.startsWith("ar"));
const t = computed(() => ({ ...PACK_STRINGS[ar.value ? "ar" : "en"], ...props.labels }));
const headingId = useId();
const busy = ref<string | null>(null);
const nf = computed(() => new Intl.NumberFormat(ar.value ? "ar-u-nu-latn" : "en"));
const total = (pack: PricingPack) => pack.credits + (pack.bonus ?? 0);
const unitPrice = (pack: PricingPack) => {
  const all = total(pack);
  return all > 0 ? pack.price / all : 0;
};
const unitText = (pack: PricingPack) => new Intl.NumberFormat(ar.value ? "ar-u-nu-latn" : "en", { style: "currency", currency: pack.currency ?? defaultCurrency(ar.value ? "ar" : "en"), maximumFractionDigits: 3 }).format(unitPrice(pack));
async function purchase(pack: PricingPack) {
  busy.value = pack.id;
  try {
    await props.onPurchase?.(pack);
  } finally {
    busy.value = null;
  }
}
</script>

<template>
  <section data-slot="pricing-packs" :aria-labelledby="title || $slots.title ? headingId : undefined" :class="cn('@container flex min-w-0 flex-col gap-8', props.class)">
    <SectionIntro
      v-if="title || eyebrow || description || $slots.title || $slots.eyebrow || $slots.description"
      :eyebrow="eyebrow"
      :title="title"
      :description="description"
      :heading-id="headingId"
      :as="titleAs"
      :has-eyebrow="!!$slots.eyebrow"
      :has-title="!!$slots.title"
      :has-description="!!$slots.description"
    >
      <template v-if="$slots.eyebrow" #eyebrow><slot name="eyebrow" /></template>
      <template v-if="$slots.title" #title><slot name="title" /></template>
      <template v-if="$slots.description" #description><slot name="description" /></template>
    </SectionIntro>
    <ul class="grid grid-cols-1 gap-4 @2xl:grid-cols-[repeat(var(--packs),minmax(0,1fr))]" :style="{ '--packs': Math.min(packs.length, 4) }">
      <li v-for="pack in packs" :key="pack.id" class="min-w-0">
        <article :class="cn('flex h-full min-w-0 flex-col gap-4 rounded-card p-5', pack.highlighted ? 'border border-nq-brand/40 bg-nq-selected' : 'border border-border bg-card')">
          <div class="flex items-center justify-between gap-2">
            <h3 class="font-semibold text-foreground text-h3">{{ pack.name }}</h3>
            <NqBadge v-if="pack.badge" variant="brand">{{ pack.badge }}</NqBadge>
          </div>
          <div class="flex flex-col gap-1">
            <div class="flex items-baseline gap-1.5">
              <bdi class="font-semibold text-display text-foreground tabular-nums">{{ nf.format(pack.credits) }}</bdi>
              <span class="text-body-sm text-muted-foreground">{{ t.unit }}</span>
            </div>
            <div v-if="pack.bonus" class="text-caption text-nq-success-text">
              <bdi>+{{ nf.format(pack.bonus) }}</bdi> {{ t.bonus }}
            </div>
            <p v-if="pack.description" class="text-body-sm text-nq-fg-body">{{ pack.description }}</p>
          </div>
          <div class="mt-auto flex flex-col gap-3">
            <div class="flex flex-col gap-0.5">
              <NqPrice :amount="pack.price" :currency="pack.currency ?? defaultCurrency(ar ? 'ar' : 'en')" size="lg" />
              <span v-if="showUnitPrice && unitPrice(pack) > 0" class="text-caption text-muted-foreground">
                <bdi dir="ltr">{{ unitText(pack) }}</bdi> {{ t.perUnit }}
              </span>
            </div>
            <NqButton :variant="pack.highlighted ? 'primary' : 'secondary'" class="w-full" :loading="busy === pack.id" :disabled="busy !== null && busy !== pack.id" @click="purchase(pack)">{{ t.buy }}</NqButton>
          </div>
        </article>
      </li>
    </ul>
  </section>
</template>
