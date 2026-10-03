<script setup lang="ts">
import { Copy, Plus, Scale, Trash2 } from "lucide-vue-next";
import { computed, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqContextMenuActions, type ContextMenuAction } from "../context-menu";
import { NqCurrencyInput } from "../currency-input";
import { NqInput } from "../field";
import { NqLineItemActionsMenu, NqLineItemMoney } from "../line-item-editor";
import { accountingEntryProblems, accountingEntryTotals, type AccountingAccount, type AccountingEntryLine, type AccountingEntryProblem } from "./accounting-math";
import NqAccountingFigure from "./NqAccountingFigure.vue";
import NqAccountPicker from "./NqAccountPicker.vue";
import { useAccountingLedgerStrings, type AccountingLedgerLabels } from "./strings";

// A balanced journal entry. Debits and credits are integer minor units; the running difference is always exact, and
// Post stays off until the entry balances. Typing on one side of a line clears the other.
export interface JournalEntryEditorLine extends AccountingEntryLine {
  /** Stable key for the row. */
  id: string;
}
export interface JournalEntryEditorValue {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  memo: string;
  lines: JournalEntryEditorLine[];
}

const props = withDefaults(defineProps<{
  accounts: readonly AccountingAccount[];
  /** The entry (`v-model`). */
  modelValue?: JournalEntryEditorValue;
  defaultValue?: JournalEntryEditorValue;
  /** ISO 4217 code. Default USD, or SAR in Arabic. */
  currency?: string;
  /** Shown as the entry number, for example "JE-0009". */
  number?: string;
  /** Called when a balanced entry is posted. Throw to keep the editor as it is. */
  onPost?: (value: JournalEntryEditorValue) => void | Promise<void>;
  onSaveDraft?: (value: JournalEntryEditorValue) => void | Promise<void>;
  readOnly?: boolean;
  labels?: AccountingLedgerLabels;
  class?: HTMLAttributes["class"];
}>(), {
  modelValue: undefined,
  defaultValue: undefined,
  currency: undefined,
  number: undefined,
  onPost: undefined,
  onSaveDraft: undefined,
  readOnly: false,
  labels: undefined,
});
const emit = defineEmits<{ "update:modelValue": [value: JournalEntryEditorValue] }>();

const currency = useCurrency(() => props.currency);
const { t } = useAccountingLedgerStrings(() => props.labels);
const id = useId();

let counter = 0;
const newLineId = () => `jl-${Date.now().toString(36)}-${(counter++).toString(36)}`;
const blankLine = (): JournalEntryEditorLine => ({ id: newLineId(), accountId: "", debit: 0, credit: 0 });
const draft = (date = new Date().toISOString().slice(0, 10)): JournalEntryEditorValue => ({ date, memo: "", lines: [blankLine(), blankLine()] });

const inner = ref<JournalEntryEditorValue>(props.defaultValue ?? draft());
const entry = computed(() => props.modelValue ?? inner.value);
const busy = ref<"post" | "draft" | null>(null);
const tried = ref(false);
const postable = computed(() => props.accounts.filter((a) => !a.archived && !props.accounts.some((c) => c.parentId === a.id)));
const totals = computed(() => accountingEntryTotals(entry.value.lines));
const problems = computed(() => accountingEntryProblems(entry.value.lines));

const PROBLEM_KEY: Record<AccountingEntryProblem, "problemFewLines" | "problemNoAccount" | "problemBothSides" | "problemNegative" | "problemUnbalanced" | "problemZero"> = {
  "few-lines": "problemFewLines",
  "no-account": "problemNoAccount",
  "both-sides": "problemBothSides",
  negative: "problemNegative",
  unbalanced: "problemUnbalanced",
  zero: "problemZero",
};
const ENTRY_GRID = "@2xl:grid-cols-[minmax(13rem,1.5fr)_minmax(8rem,1fr)_9rem_9rem_2rem]";

function set(next: JournalEntryEditorValue) {
  inner.value = next;
  emit("update:modelValue", next);
}
const setLines = (lines: JournalEntryEditorLine[]) => set({ ...entry.value, lines });
const patch = (lineId: string, p: Partial<JournalEntryEditorLine>) => setLines(entry.value.lines.map((l) => (l.id === lineId ? { ...l, ...p } : l)));

async function run(kind: "post" | "draft") {
  tried.value = true;
  if (kind === "post" && problems.value.length) return;
  busy.value = kind;
  try {
    const clean = { ...entry.value, lines: entry.value.lines.filter((l) => l.accountId || l.debit || l.credit) };
    if (kind === "post") {
      await props.onPost?.(clean);
      set(draft(entry.value.date));
      tried.value = false;
    } else await props.onSaveDraft?.(clean);
  } catch {
    // The host refused: keep the entry as it is.
  } finally {
    busy.value = null;
  }
}

function actionsFor(line: JournalEntryEditorLine, index: number): ContextMenuAction[] {
  if (props.readOnly) return [];
  const lines = entry.value.lines;
  return [
    {
      id: "balance",
      label: t.value.balanceLine,
      icon: Scale,
      onSelect: () => {
        const others = accountingEntryTotals(lines.filter((l) => l.id !== line.id));
        const diff = others.debit - others.credit;
        patch(line.id, diff > 0 ? { debit: 0, credit: diff } : { debit: -diff, credit: 0 });
      },
      disabled: totals.value.difference === 0 && line.debit + line.credit > 0,
      group: "amount",
    },
    { id: "duplicate", label: t.value.duplicateLine, icon: Copy, onSelect: () => setLines([...lines.slice(0, index + 1), { ...line, id: newLineId() }, ...lines.slice(index + 1)]), group: "edit" },
    { id: "remove", label: t.value.removeLine, icon: Trash2, danger: true, disabled: lines.length <= 2, onSelect: () => setLines(lines.filter((l) => l.id !== line.id)), group: "danger" },
  ];
}
const noAccount = (line: JournalEntryEditorLine) => tried.value && !line.accountId && (line.debit !== 0 || line.credit !== 0);
const focusInput = (el: HTMLElement) => el.querySelector<HTMLElement>("input");
</script>

<script lang="ts">
let draftCounter = 0;
/** A starting value: today's date, no memo, two empty lines. */
export function journalEntryDraft(date = new Date().toISOString().slice(0, 10)): JournalEntryEditorValue {
  const line = (): JournalEntryEditorLine => ({ id: `jl-${Date.now().toString(36)}-d${(draftCounter++).toString(36)}`, accountId: "", debit: 0, credit: 0 });
  return { date, memo: "", lines: [line(), line()] };
}
</script>

<template>
  <form data-slot="journal-entry-editor" novalidate :class="cn('@container flex w-full flex-col gap-4', props.class)" @submit.prevent="run('post')">
    <div class="grid gap-3 @lg:grid-cols-[10rem_minmax(0,1fr)_auto]">
      <label class="flex flex-col gap-1.5 text-label text-foreground">
        {{ t.date }}
        <NqInput type="date" ltr :model-value="entry.date" :disabled="props.readOnly" @update:model-value="(v) => set({ ...entry, date: String(v ?? '') })" />
      </label>
      <label class="flex flex-col gap-1.5 text-label text-foreground">
        {{ t.memo }}
        <NqInput :model-value="entry.memo" :disabled="props.readOnly" @update:model-value="(v) => set({ ...entry, memo: String(v ?? '') })" />
      </label>
      <div v-if="props.number" class="flex flex-col gap-1.5 text-label text-foreground">
        {{ t.entryNumber }}
        <span class="flex h-control items-center"><bdi dir="ltr" class="text-body-sm tabular-nums text-muted-foreground">{{ props.number }}</bdi></span>
      </div>
    </div>

    <div class="flex flex-col gap-2" role="group" :aria-label="t.lines">
      <div aria-hidden="true" :class="cn('hidden gap-3 px-3 text-caption text-muted-foreground @2xl:grid', ENTRY_GRID)">
        <span>{{ t.account }}</span>
        <span>{{ t.memo }}</span>
        <span class="text-end">{{ t.debit }}</span>
        <span class="text-end">{{ t.credit }}</span>
        <span />
      </div>
      <ul class="flex flex-col gap-2">
        <NqContextMenuActions
          v-for="(line, index) in entry.lines"
          :key="line.id"
          as="li"
          :actions="actionsFor(line, index)"
        >
          <div data-slot="entry-line" role="group" :aria-label="`${t.line} ${index + 1}`" :class="cn('grid grid-cols-2 items-start gap-x-3 gap-y-3 rounded-floating border border-border bg-card p-3 @2xl:gap-y-0 @2xl:rounded-control', ENTRY_GRID)">
          <div class="col-span-2 @2xl:col-span-1">
            <NqAccountPicker :accounts="postable" :value="line.accountId" :label="`${t.account}, ${t.line} ${index + 1}`" :invalid="noAccount(line)" :disabled="props.readOnly" :t="t" @change="(accountId) => patch(line.id, { accountId })" />
          </div>
          <div class="col-span-2 @2xl:col-span-1">
            <NqInput :model-value="line.memo ?? ''" :disabled="props.readOnly" :placeholder="t.linePlaceholder" :aria-label="`${t.memo}, ${t.line} ${index + 1}`" @update:model-value="(v) => patch(line.id, { memo: String(v ?? '') })" />
          </div>
          <div class="flex flex-col gap-1">
            <span aria-hidden="true" class="text-caption text-muted-foreground @2xl:hidden">{{ t.debit }}</span>
            <NqCurrencyInput
              :model-value="line.debit || null"
              :currency="currency"
              symbol="none"
              :min="0"
              :disabled="props.readOnly"
              :aria-label="`${t.debit}, ${t.line} ${index + 1}`"
              @update:model-value="(v) => patch(line.id, { debit: v ?? 0, ...(v ? { credit: 0 } : {}) })"
            />
          </div>
          <div class="flex flex-col gap-1">
            <span aria-hidden="true" class="text-caption text-muted-foreground @2xl:hidden">{{ t.credit }}</span>
            <NqCurrencyInput
              :model-value="line.credit || null"
              :currency="currency"
              symbol="none"
              :min="0"
              :disabled="props.readOnly"
              :aria-label="`${t.credit}, ${t.line} ${index + 1}`"
              @update:model-value="(v) => patch(line.id, { credit: v ?? 0, ...(v ? { debit: 0 } : {}) })"
            />
          </div>
          <div class="col-span-2 flex justify-end @2xl:col-span-1">
            <NqLineItemActionsMenu :actions="actionsFor(line, index)" :label="`${t.lineActions}, ${t.line} ${index + 1}`" />
          </div>
          </div>
        </NqContextMenuActions>
      </ul>
      <div v-if="!props.readOnly">
        <NqButton type="button" variant="secondary" size="sm" @click="setLines([...entry.lines, blankLine()])">
          <Plus aria-hidden="true" />
          {{ t.addLine }}
        </NqButton>
      </div>
    </div>

    <div role="region" :aria-label="t.totals" class="flex flex-col gap-2 rounded-card border border-border bg-card p-3">
      <div :class="cn('grid grid-cols-2 items-baseline gap-3 @2xl:gap-3', ENTRY_GRID)">
        <span class="col-span-2 text-label text-foreground @2xl:col-span-2">{{ t.totals }}</span>
        <span class="text-end text-label tabular-nums"><NqAccountingFigure :minor="totals.debit" :currency="currency" /></span>
        <span class="text-end text-label tabular-nums"><NqAccountingFigure :minor="totals.credit" :currency="currency" /></span>
        <span class="hidden @2xl:block" />
      </div>
      <div class="flex flex-wrap items-center justify-between gap-2" aria-live="polite">
        <span class="text-body-sm text-muted-foreground">{{ t.difference }}</span>
        <span class="flex items-center gap-2">
          <NqBadge :variant="totals.balanced ? 'success' : totals.debit + totals.credit === 0 ? 'neutral' : 'danger'">{{ totals.balanced ? t.balanced : t.outOfBalance }}</NqBadge>
          <NqLineItemMoney v-if="totals.difference !== 0" :minor="Math.abs(totals.difference)" :currency="currency" class="text-label" />
        </span>
      </div>
      <ul v-if="tried && problems.length" role="alert" class="flex flex-col gap-0.5 text-caption text-nq-danger-text">
        <li v-for="p in problems" :key="p">{{ t[PROBLEM_KEY[p]] }}</li>
      </ul>
    </div>

    <div v-if="!props.readOnly" class="flex flex-wrap justify-end gap-2">
      <NqButton v-if="props.onSaveDraft" type="button" variant="secondary" :loading="busy === 'draft'" :disabled="busy === 'post'" @click="run('draft')">{{ t.saveDraft }}</NqButton>
      <NqButton :id="`${id}-post`" type="submit" variant="primary" :loading="busy === 'post'" :disabled="!totals.balanced || problems.length > 0 || busy === 'draft'">{{ t.post }}</NqButton>
    </div>
  </form>
</template>
