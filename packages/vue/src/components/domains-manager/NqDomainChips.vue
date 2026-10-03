<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqPopover, NqPopoverContent, NqPopoverTrigger } from "../popover";
import { splitOverflow } from "./format";
import { DOMAINS_STRINGS, type DomainsManagerLabels } from "./strings";
import type { DomainRecord } from "./types";

// A compact row of domain chips, each with its check state, and a "+N" chip that opens the rest. Good for table cells and cards.
const props = withDefaults(
  defineProps<{
    domains: readonly Pick<DomainRecord, "id" | "host" | "check" | "primary">[];
    /** How many chips show before the rest fold into a "+N" chip that opens the full list. Default 2. */
    max?: number;
    labels?: DomainsManagerLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { max: 2, labels: undefined },
);

const nasaq = useNasaq();
const t = computed(() => ({ ...DOMAINS_STRINGS[nasaq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
const split = computed(() => splitOverflow(props.domains, props.max));
const variant = (check: DomainRecord["check"]) => (check === "verified" ? "success" : check === "failed" ? "danger" : "warning");
</script>

<template>
  <ul data-slot="domain-chips" :aria-label="t.domainsLabel" :class="cn('flex flex-wrap items-center gap-1.5', props.class)">
    <li v-for="d in split.shown" :key="d.id" data-slot="domain-chip" :data-check="d.check">
      <NqBadge :variant="variant(d.check)" :title="t.checks[d.check]" class="h-6 gap-1.5">
        <bdi dir="ltr" class="font-mono">{{ d.host }}</bdi>
        <span class="sr-only">{{ t.checks[d.check] }}</span>
      </NqBadge>
    </li>
    <li v-if="split.hidden.length" data-slot="domain-chips-more">
      <NqPopover>
        <NqPopoverTrigger as-child>
          <NqButton type="button" variant="secondary" size="sm" :aria-label="t.moreLabel(split.hidden.length)" class="h-6 rounded-[4px] px-1.5 text-caption">
            <bdi>{{ t.more(split.hidden.length) }}</bdi>
          </NqButton>
        </NqPopoverTrigger>
        <NqPopoverContent align="start" class="w-auto min-w-52">
          <ul class="grid gap-1.5">
            <li v-for="d in split.hidden" :key="d.id" data-slot="domain-chip" :data-check="d.check">
              <NqBadge :variant="variant(d.check)" :title="t.checks[d.check]" class="h-6 gap-1.5">
                <bdi dir="ltr" class="font-mono">{{ d.host }}</bdi>
                <span class="sr-only">{{ t.checks[d.check] }}</span>
              </NqBadge>
            </li>
          </ul>
        </NqPopoverContent>
      </NqPopover>
    </li>
  </ul>
</template>
