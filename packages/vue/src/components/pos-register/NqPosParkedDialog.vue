<script setup lang="ts">
import { Clock, Trash2 } from "lucide-vue-next";
import { computed, ref } from "vue";
import { NqAlertDialog, NqAlertDialogAction, NqAlertDialogCancel, NqAlertDialogContent, NqAlertDialogDescription, NqAlertDialogFooter, NqAlertDialogHeader, NqAlertDialogTitle } from "../alert-dialog";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqLineItemMoney } from "../line-item-editor";
import { NqEmptyState } from "../states";
import type { PosRegisterStrings } from "./strings";
import type { PosParkedSale } from "./types";

// The list of sales on hold. Resume replaces the basket (asks first when it has items); Discard always asks.
const props = defineProps<{
  open: boolean;
  parked: readonly PosParkedSale[];
  basketHasItems: boolean;
  currency: string;
  time: (iso: string) => string;
  t: PosRegisterStrings;
}>();
const emit = defineEmits<{ "update:open": [open: boolean]; resume: [sale: PosParkedSale]; discard: [sale: PosParkedSale] }>();

const confirm = ref<{ kind: "resume" | "discard"; sale: PosParkedSale } | null>(null);
const confirmOpen = ref(false);
function ask(kind: "resume" | "discard", sale: PosParkedSale) {
  confirm.value = { kind, sale };
  confirmOpen.value = true;
}
const newestFirst = computed(() => [...props.parked].reverse());
const count = (sale: PosParkedSale) => sale.lines.reduce((n, l) => n + l.quantity, 0);
function onConfirm() {
  const c = confirm.value;
  if (!c) return;
  if (c.kind === "discard") emit("discard", c.sale);
  else emit("resume", c.sale);
}
</script>

<template>
  <NqDialog :open="props.open" @update:open="(o: boolean) => emit('update:open', o)">
    <NqDialogContent class="max-w-lg">
      <NqDialogHeader>
        <NqDialogTitle class="flex items-center gap-2">
          {{ props.t.parked }}
          <NqBadge v-if="props.parked.length" variant="neutral">
            <bdi>{{ props.parked.length }}</bdi>
          </NqBadge>
        </NqDialogTitle>
        <NqDialogDescription>{{ props.t.noParkedText }}</NqDialogDescription>
      </NqDialogHeader>
      <NqEmptyState v-if="newestFirst.length === 0" :icon="Clock" :title="props.t.noParked" :description="props.t.noParkedText" class="py-8" />
      <ul v-else :aria-label="props.t.parked" class="flex max-h-[50dvh] flex-col divide-y divide-border overflow-y-auto rounded-floating border border-border">
        <li v-for="sale in newestFirst" :key="sale.id" data-slot="pos-parked" class="flex flex-col gap-2 p-3">
          <div class="flex items-baseline justify-between gap-3">
            <span class="text-label text-foreground">
              <bdi>{{ props.time(sale.at) }}</bdi>
              <span v-if="sale.note" class="text-muted-foreground"> · {{ sale.note }}</span>
            </span>
            <NqLineItemMoney :minor="sale.totals.total" :currency="props.currency" class="text-label text-foreground" />
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-body-sm text-muted-foreground">
              <bdi>{{ count(sale) }}</bdi> {{ props.t.items }}{{ sale.cashier ? ` · ${sale.cashier}` : "" }}
            </span>
            <span class="ms-auto flex gap-2">
              <NqButton type="button" variant="secondary" size="sm" :aria-label="`${props.t.discard}, ${props.time(sale.at)}`" @click="ask('discard', sale)">
                <Trash2 aria-hidden="true" />
                {{ props.t.discard }}
              </NqButton>
              <NqButton type="button" variant="primary" size="sm" :aria-label="`${props.t.resume}, ${props.time(sale.at)}`" @click="props.basketHasItems ? ask('resume', sale) : emit('resume', sale)">
                {{ props.t.resume }}
              </NqButton>
            </span>
          </div>
        </li>
      </ul>
      <NqDialogFooter>
        <NqButton type="button" variant="secondary" @click="emit('update:open', false)">{{ props.t.close }}</NqButton>
      </NqDialogFooter>
      <NqAlertDialog v-model:open="confirmOpen">
        <NqAlertDialogContent>
          <NqAlertDialogHeader>
            <NqAlertDialogTitle>{{ confirm?.kind === "discard" ? props.t.discardTitle : props.t.resumeTitle }}</NqAlertDialogTitle>
            <NqAlertDialogDescription>{{ confirm?.kind === "discard" ? props.t.discardText : props.t.resumeText }}</NqAlertDialogDescription>
          </NqAlertDialogHeader>
          <NqAlertDialogFooter>
            <NqAlertDialogCancel>{{ props.t.cancel }}</NqAlertDialogCancel>
            <NqAlertDialogAction :variant="confirm?.kind === 'discard' ? 'danger' : 'primary'" @click="onConfirm">
              {{ confirm?.kind === "discard" ? props.t.discard : props.t.resume }}
            </NqAlertDialogAction>
          </NqAlertDialogFooter>
        </NqAlertDialogContent>
      </NqAlertDialog>
    </NqDialogContent>
  </NqDialog>
</template>
