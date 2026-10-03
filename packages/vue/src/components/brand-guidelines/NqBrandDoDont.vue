<script setup lang="ts">
import { Check, X } from "lucide-vue-next";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import type { BrandGuidelinesLabels, BrandRule } from "./strings";
import { useBrandStrings } from "./use-strings";

/** Two columns of rules, each with a check or a cross and a word, so meaning never rests on colour. The `example` slot draws a rule's example. */
interface Props {
  dos: readonly BrandRule[];
  donts: readonly BrandRule[];
  labels?: BrandGuidelinesLabels;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const t = useBrandStrings(() => props.labels);
const slots = defineSlots<{ example?: (p: { rule: BrandRule; kind: "do" | "dont" }) => unknown }>();
</script>

<template>
  <div data-slot="brand-do-dont" :class="cn('grid gap-6 sm:grid-cols-2', props.class)">
    <section v-for="col in ([{ kind: 'do', rules: props.dos }, { kind: 'dont', rules: props.donts }] as const)" :key="col.kind" :aria-label="col.kind === 'do' ? t.do : t.dont" class="flex min-w-0 flex-col gap-3">
      <h4 :class="cn('flex items-center gap-2 text-label', col.kind === 'do' ? 'text-nq-success-text' : 'text-nq-danger-text')">
        <Check v-if="col.kind === 'do'" aria-hidden="true" class="size-4" />
        <X v-else aria-hidden="true" class="size-4" />
        {{ col.kind === "do" ? t.do : t.dont }}
      </h4>
      <ul class="flex flex-col gap-3">
        <li v-for="rule in col.rules" :key="rule.id" :class="cn('flex flex-col gap-1 rounded-card border bg-card p-3', col.kind === 'do' ? 'border-nq-success/40' : 'border-nq-danger/40')">
          <div v-if="slots.example" class="mb-1 flex items-center justify-center rounded-control bg-secondary p-4"><slot name="example" :rule="rule" :kind="col.kind" /></div>
          <span class="text-label text-foreground">{{ rule.title }}</span>
          <span v-if="rule.description" class="text-body-sm text-muted-foreground">{{ rule.description }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>
