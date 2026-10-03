<script setup lang="ts">
import { computed, Fragment, useSlots, type HTMLAttributes, type VNode } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency, useNasaq } from "../../provider";
import { NqBadge } from "../badge";
import { useFormatNumber } from "../numeric";
import { NqPrice, type PricePeriod } from "../price";

// Several apps sold together for less. Shows the stack, what it's for, the saving and the price against the
// separate total. Stacks vertically in a narrow container and lays out in a row from 36rem.
// `items` is a slot: each child (artwork or glyph) is one item of the overlapping stack, in order.
// `title`, `description`, `includes` and `savingsLabel` are props that also exist as slots of the same name.
interface Props {
  title?: string;
  description?: string;
  /** What's inside, as a line of names. */
  includes?: string;
  /** Bundle price. */
  price: number;
  /** The same apps bought separately. The saving badge is `compareAt - price`. */
  compareAt: number;
  /** ISO 4217 code. Default USD, or SAR in Arabic. */
  currency?: string;
  period?: PricePeriod;
  /** Override the saving badge text. Default "Save $18" / "وفّر 18 US$". */
  savingsLabel?: string;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { title: undefined, description: undefined, includes: undefined, currency: undefined, period: "month", savingsLabel: undefined });
defineOptions({ inheritAttrs: false });

const slots = useSlots();
const currency = useCurrency(() => props.currency);
const nq = useNasaq();
const ar = computed(() => nq.locale.value.startsWith("ar"));
const fmt = useFormatNumber();
const saving = computed(() => props.compareAt - props.price);
const saved = computed(() => fmt(saving.value, { style: "currency", currency: currency.value, maximumFractionDigits: Number.isInteger(saving.value) ? 0 : 2 }));

function flatten(nodes: VNode[] = []): VNode[] {
  return nodes.flatMap((n) => (n.type === Fragment && Array.isArray(n.children) ? flatten(n.children as VNode[]) : typeof n.type === "symbol" ? [] : [n]));
}
const items = () => flatten(slots.items?.());
const Item = (p: { node: VNode }) => p.node;
const has = (slot: string, value?: string) => Boolean(slots[slot] || value);
</script>

<template>
  <div data-slot="bundle-card" class="@container">
    <article :class="cn('flex flex-col gap-5 rounded-card bg-nq-surface p-5 @xl:flex-row @xl:items-center @xl:p-6', props.class)" v-bind="$attrs">
      <div aria-hidden="true" class="flex shrink-0 [&>*]:size-14 [&>*+*]:-ms-3">
        <span v-for="(node, i) in items()" :key="i" class="overflow-hidden rounded-card ring-2 ring-nq-surface [&>*]:size-full">
          <Item :node="node" />
        </span>
      </div>
      <div class="flex min-w-0 flex-1 flex-col gap-1.5">
        <div class="flex flex-wrap items-center gap-2">
          <h3 class="text-h3 text-foreground"><slot name="title">{{ title }}</slot></h3>
          <NqBadge v-if="saving > 0" variant="success">
            <slot name="savingsLabel">
              <template v-if="savingsLabel">{{ savingsLabel }}</template>
              <template v-else>{{ ar ? "وفّر" : "Save" }} <bdi class="tabular-nums">{{ saved }}</bdi></template>
            </slot>
          </NqBadge>
        </div>
        <p v-if="has('description', description)" class="text-pretty text-body-sm text-muted-foreground"><slot name="description">{{ description }}</slot></p>
        <p v-if="has('includes', includes)" class="text-caption text-muted-foreground"><slot name="includes">{{ includes }}</slot></p>
      </div>
      <div class="flex shrink-0 items-center justify-between gap-4 @xl:flex-col @xl:items-end">
        <NqPrice :amount="props.price" :compare-at="props.compareAt" :currency="currency" :period="props.period" size="lg" class="@xl:justify-end" />
        <slot name="action" />
      </div>
    </article>
  </div>
</template>
