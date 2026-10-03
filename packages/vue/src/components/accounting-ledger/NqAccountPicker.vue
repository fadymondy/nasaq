<script setup lang="ts">
import { computed } from "vue";
import { NqCombobox, NqComboboxContent, NqComboboxEmpty, NqComboboxInput, NqComboboxItem, NqComboboxList, comboboxFilter } from "../combobox";
import type { AccountingAccount } from "./accounting-math";
import type { AccountingLedgerStrings } from "./strings";

// The account search of one entry line (internal): code and name, matched together.
interface Props {
  accounts: readonly AccountingAccount[];
  /** The chosen account id, "" for none. */
  value: string;
  label: string;
  invalid: boolean;
  disabled: boolean;
  t: AccountingLedgerStrings;
}
const props = defineProps<Props>();
const emit = defineEmits<{ change: [id: string] }>();

type Entry = { value: string; label: string; account: AccountingAccount };
const items = computed<Entry[]>(() => props.accounts.map((a) => ({ value: a.id, label: `${a.code} ${a.name}`, account: a })));
const selected = computed(() => items.value.find((i) => i.value === props.value) ?? null);
const filter = (item: unknown, query: string) => comboboxFilter(item as Entry, query, (x) => `${x.account.code} ${x.account.name}`);
</script>

<template>
  <NqCombobox :items="items" :model-value="selected" :disabled="props.disabled" :filter="filter" @update:model-value="(e: unknown) => emit('change', (e as Entry | null)?.value ?? '')">
    <NqComboboxInput :clearable="false" :placeholder="props.t.pickAccount" :aria-label="props.label" :invalid="props.invalid" :trigger-label="props.t.pickAccount" :clear-label="props.t.pickAccount" />
    <NqComboboxContent>
      <NqComboboxEmpty>{{ props.t.noAccountMatch }}</NqComboboxEmpty>
      <NqComboboxList v-slot="{ items: list }">
        <NqComboboxItem v-for="e in (list as Entry[])" :key="e.value" :value="e">
          <span class="flex min-w-0 items-baseline gap-2">
            <bdi dir="ltr" class="text-caption tabular-nums text-muted-foreground">{{ e.account.code }}</bdi>
            <span class="truncate">{{ e.account.name }}</span>
          </span>
        </NqComboboxItem>
      </NqComboboxList>
    </NqComboboxContent>
  </NqCombobox>
</template>
