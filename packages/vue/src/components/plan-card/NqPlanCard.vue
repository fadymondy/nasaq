<script setup lang="ts">
import { Check, Minus } from "lucide-vue-next";
import { computed, useId, useSlots, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useT } from "../../provider";
import { NqTooltip } from "../tooltip";
import type { PlanFeature } from "./types";


interface Props {
  /** Plan name: "Team". */
  name?: string;
  /** Who it's for, one line. */
  description?: string;
  /** A line under the price: "Billed yearly", "Up to 3 people". */
  priceNote?: string;
  /** What the plan includes. Start with "Everything in Solo, plus" when it builds on a smaller plan. */
  features?: (string | PlanFeature)[];
  /** A small heading over the features: "Includes", "Everything in Team, plus". */
  featuresTitle?: string;
  /** Fine print under the button: "No card required", "Cancel anytime". */
  footnote?: string;
  /** The recommended plan: brand-tinted surface and ring. Use on at most one plan. */
  highlighted?: boolean;
  /** The plan the account is on now: a neutral ring and a "Current plan" pill (unless `badge` is set). */
  current?: boolean;
  /** "Most popular", "Save 20%". Shown as a pill on the card's top edge. */
  badge?: string;
  class?: HTMLAttributes["class"];
}

// Text props can also be slots of the same name. `price` (usually a price element) and `action` (the plan's
// button; only the highlighted plan's should be primary) are slots only.
const props = defineProps<Props>();
const slots = useSlots();
const id = useId();
const t = useT();
const pill = computed(() => props.badge ?? (props.current ? t("Current plan", "خطتك الحالية") : null));
const has = (slot: string, value?: string) => Boolean(slots[slot] || value);
const items = computed(() =>
  (props.features ?? []).map((item) => {
    const feature: PlanFeature = typeof item === "object" && item !== null ? item : { label: item };
    return { ...feature, included: feature.included !== false };
  }),
);
</script>

<template>
  <article
    data-slot="plan-card"
    :data-highlighted="highlighted ? '' : undefined"
    :data-current="current ? '' : undefined"
    :aria-labelledby="id"
    :class="
      cn(
        'relative flex min-w-0 flex-col gap-5 rounded-card p-6',
        highlighted
          ? 'bg-[color-mix(in_oklab,var(--nq-brand)_9%,var(--nq-surface))] shadow-lg ring-2 ring-nq-brand/50'
          : current
            ? 'bg-nq-surface ring-1 ring-nq-line-strong'
            : 'bg-nq-surface',
        props.class,
      )
    "
  >
    <span
      v-if="pill || $slots.badge"
      data-slot="plan-card-badge"
      :class="
        cn(
          'absolute -top-3 start-6 inline-flex h-6 items-center rounded-full border px-2.5 text-caption font-medium whitespace-nowrap',
          highlighted ? 'border-transparent bg-primary text-primary-foreground' : 'border-border bg-card text-foreground',
        )
      "
    >
      <slot name="badge">{{ pill }}</slot>
    </span>
    <div class="flex flex-col gap-1">
      <h3 :id="id" class="text-h3 text-foreground"><slot name="name">{{ name }}</slot></h3>
      <p v-if="has('description', description)" class="text-body-sm text-muted-foreground"><slot name="description">{{ description }}</slot></p>
    </div>
    <div class="flex flex-col gap-1">
      <slot name="price" />
      <p v-if="has('priceNote', priceNote)" class="text-caption text-muted-foreground"><slot name="priceNote">{{ priceNote }}</slot></p>
    </div>
    <div v-if="$slots.action || has('footnote', footnote)" class="flex flex-col gap-2">
      <slot name="action" />
      <p v-if="has('footnote', footnote)" class="text-center text-caption text-muted-foreground"><slot name="footnote">{{ footnote }}</slot></p>
    </div>
    <div v-if="items.length > 0" class="flex flex-col gap-3 border-t border-border pt-5">
      <p v-if="has('featuresTitle', featuresTitle)" class="text-label text-foreground"><slot name="featuresTitle">{{ featuresTitle }}</slot></p>
      <ul class="flex flex-col gap-2.5">
        <li
          v-for="(feature, i) in items"
          :key="i"
          :data-included="feature.included ? '' : undefined"
          :class="cn('flex items-start gap-2 text-body-sm', feature.included ? 'text-foreground' : 'text-muted-foreground')"
        >
          <Check v-if="feature.included" aria-hidden="true" class="mt-0.5 size-4 shrink-0 text-nq-brand" />
          <Minus v-else aria-hidden="true" class="mt-0.5 size-4 shrink-0 text-muted-foreground/70" />
          <span>
            <NqTooltip v-if="feature.hint" :content="feature.hint">
              <span tabindex="0" class="cursor-help underline decoration-nq-line decoration-dotted underline-offset-4">{{ feature.label }}</span>
            </NqTooltip>
            <template v-else>{{ feature.label }}</template>
            <span v-if="!feature.included" class="sr-only"> ({{ t("Not included", "غير مشمول") }})</span>
          </span>
        </li>
      </ul>
    </div>
  </article>
</template>
