"use client";

import { Archive, ChevronDown, Copy, FolderPlus, ListTree, Plus, Scale, Trash2 } from "lucide-react";
import { type ComponentProps, useId, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge } from "../badge";
import { Button } from "../button";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList, comboboxFilter } from "../combobox";
import { ContextMenuActions } from "../context-menu";
import { CurrencyInput } from "../currency-input";
import { currencyDecimals, minorToMajor } from "../currency-input/currency-input-logic";
import { Input } from "../field";
import { LineItemActionsMenu, LineItemMoney } from "../line-item-editor/line-item-fields";
import { Num } from "../numeric";
import { EmptyState } from "../states";
import {
  type AccountingAccount,
  type AccountingAccountType,
  type AccountingEntry,
  type AccountingEntryLine,
  type AccountingEntryProblem,
  accountingBalances,
  accountingEntryProblems,
  accountingEntryTotals,
  accountingNormalSide,
  accountingStatement,
  accountingTree,
  accountingTrialBalance,
} from "./accounting-math";

export {
  accountingBalances,
  accountingEntryProblems,
  accountingEntryTotals,
  accountingNormalSide,
  accountingSignedBalance,
  accountingStatement,
  accountingTree,
  accountingTrialBalance,
  type AccountingAccount,
  type AccountingAccountType,
  type AccountingBalance,
  type AccountingEntry,
  type AccountingEntryLine,
  type AccountingEntryProblem,
  type AccountingEntryStatus,
  type AccountingEntryTotals,
  type AccountingSide,
  type AccountingStatementRow,
  type AccountingTrialBalance,
  type AccountingTrialRow,
} from "./accounting-math";

/* ------------------------------------------------------------------ strings */

const STRINGS = {
  en: {
    code: "Code",
    account: "Account",
    type: "Type",
    balance: "Balance",
    debit: "Debit",
    credit: "Credit",
    asset: "Asset",
    liability: "Liability",
    equity: "Equity",
    revenue: "Revenue",
    expense: "Expense",
    chart: "Chart of accounts",
    noAccounts: "No accounts yet",
    noAccountsText: "Add the first account to start the chart.",
    expand: "Expand",
    collapse: "Collapse",
    archived: "Archived",
    viewStatement: "View statement",
    addChild: "Add sub-account",
    archive: "Archive account",
    restore: "Restore account",
    rowActions: "Account actions",
    date: "Date",
    memo: "Memo",
    entry: "Journal entry",
    lines: "Lines",
    pickAccount: "Pick an account",
    noAccountMatch: "No account matches",
    linePlaceholder: "Line memo",
    line: "Line",
    addLine: "Add line",
    removeLine: "Remove line",
    duplicateLine: "Duplicate line",
    balanceLine: "Balance with this line",
    lineActions: "Line actions",
    totals: "Totals",
    difference: "Difference",
    balanced: "Balanced",
    outOfBalance: "Out of balance",
    post: "Post entry",
    saveDraft: "Save draft",
    entryNumber: "Entry number",
    problemFewLines: "An entry needs at least two lines with an amount.",
    problemNoAccount: "Every line with an amount needs an account.",
    problemBothSides: "A line is either a debit or a credit, not both.",
    problemNegative: "Amounts cannot be negative.",
    problemUnbalanced: "Debits and credits must be equal.",
    problemZero: "Enter an amount.",
    trial: "Trial balance",
    asOf: "As of",
    total: "Total",
    trialBalanced: "Debits equal credits",
    trialOff: "Debits and credits differ",
    empty: "No posted entries yet",
    emptyText: "Post a journal entry and it shows here.",
    statement: "Account statement",
    number: "Number",
    running: "Running balance",
    noMovements: "No movements on this account",
    inCurrency: "Amounts in",
  },
  ar: {
    code: "الرمز",
    account: "الحساب",
    type: "النوع",
    balance: "الرصيد",
    debit: "مدين",
    credit: "دائن",
    asset: "أصول",
    liability: "التزامات",
    equity: "حقوق ملكية",
    revenue: "إيرادات",
    expense: "مصروفات",
    chart: "دليل الحسابات",
    noAccounts: "لا توجد حسابات بعد",
    noAccountsText: "أضف أول حساب لبدء الدليل.",
    expand: "توسيع",
    collapse: "طي",
    archived: "مؤرشف",
    viewStatement: "عرض كشف الحساب",
    addChild: "إضافة حساب فرعي",
    archive: "أرشفة الحساب",
    restore: "استعادة الحساب",
    rowActions: "إجراءات الحساب",
    date: "التاريخ",
    memo: "البيان",
    entry: "قيد يومية",
    lines: "البنود",
    pickAccount: "اختر حسابًا",
    noAccountMatch: "لا يوجد حساب مطابق",
    linePlaceholder: "بيان البند",
    line: "البند",
    addLine: "إضافة بند",
    removeLine: "حذف البند",
    duplicateLine: "تكرار البند",
    balanceLine: "موازنة القيد بهذا البند",
    lineActions: "إجراءات البند",
    totals: "الإجماليات",
    difference: "الفرق",
    balanced: "متوازن",
    outOfBalance: "غير متوازن",
    post: "ترحيل القيد",
    saveDraft: "حفظ كمسودة",
    entryNumber: "رقم القيد",
    problemFewLines: "يحتاج القيد إلى بندين على الأقل بمبلغ.",
    problemNoAccount: "كل بند بمبلغ يحتاج إلى حساب.",
    problemBothSides: "البند إما مدين أو دائن، وليس كليهما.",
    problemNegative: "لا يمكن أن تكون المبالغ سالبة.",
    problemUnbalanced: "يجب أن يتساوى المدين والدائن.",
    problemZero: "أدخل مبلغًا.",
    trial: "ميزان المراجعة",
    asOf: "حتى تاريخ",
    total: "الإجمالي",
    trialBalanced: "المدين يساوي الدائن",
    trialOff: "المدين والدائن مختلفان",
    empty: "لا توجد قيود مرحّلة بعد",
    emptyText: "رحِّل قيد يومية وسيظهر هنا.",
    statement: "كشف حساب",
    number: "الرقم",
    running: "الرصيد الجاري",
    noMovements: "لا توجد حركات على هذا الحساب",
    inCurrency: "المبالغ بعملة",
  },
} as const;

type Strings = { [K in keyof (typeof STRINGS)["en"]]: string };
export type AccountingLedgerLabels = Partial<Strings>;

/** Merged strings for the active locale plus `labels`. */
export function useAccountingLedgerStrings(labels?: AccountingLedgerLabels) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const ar = locale.startsWith("ar");
  return { t: { ...STRINGS[ar ? "ar" : "en"], ...labels } as Strings, ar, locale };
}

const TYPE_VARIANT: Record<AccountingAccountType, "info" | "warning" | "neutral" | "success" | "danger"> = {
  asset: "info",
  liability: "warning",
  equity: "neutral",
  revenue: "success",
  expense: "danger",
};

const PROBLEM_KEY: Record<AccountingEntryProblem, keyof Strings> = {
  "few-lines": "problemFewLines",
  "no-account": "problemNoAccount",
  "both-sides": "problemBothSides",
  negative: "problemNegative",
  unbalanced: "problemUnbalanced",
  zero: "problemZero",
};

/** A bare figure in a ledger column: no symbol, fixed decimals, tabular digits, left to right. Zero shows as a dash when `blank`. */
function Figure({ minor, currency, blank = false, className }: { minor: number; currency: string; blank?: boolean; className?: string }) {
  if (blank && minor === 0) return <span aria-hidden className={cn("text-muted-foreground", className)}>–</span>;
  const d = currencyDecimals(currency);
  return <Num value={minorToMajor(minor, currency)} format={{ minimumFractionDigits: d, maximumFractionDigits: d }} className={className} />;
}

const th = "px-3 py-2 text-start text-caption font-medium text-muted-foreground";
const thNum = "px-3 py-2 text-end text-caption font-medium text-muted-foreground";
const td = "px-3 py-2.5 text-body-sm text-foreground";
const tdNum = "px-3 py-2.5 text-end text-body-sm text-foreground tabular-nums";

function useDate(locale: string) {
  return (iso: string) => new Intl.DateTimeFormat(new Intl.Locale(locale, { numberingSystem: "latn" }).toString(), { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
}

/* ------------------------------------------------------------------ chart of accounts */

export interface ChartOfAccountsProps extends Omit<ComponentProps<"div">, "children"> {
  accounts: readonly AccountingAccount[];
  /** Posted entries give each row its balance, and a group the sum of its branch. */
  entries?: readonly AccountingEntry[];
  currency?: string;
  selectedId?: string | null;
  /** Open the statement of this account. */
  onSelectAccount?: (account: AccountingAccount) => void;
  onAddChild?: (parent: AccountingAccount) => void;
  onArchiveChange?: (account: AccountingAccount, archived: boolean) => void;
  labels?: AccountingLedgerLabels;
}

/** The account tree: code, name, type and balance per row, groups that collapse, and a row menu that mirrors the context menu. */
export function ChartOfAccounts({ accounts, entries = [], currency = "USD", selectedId, onSelectAccount, onAddChild, onArchiveChange, labels, className, ...props }: ChartOfAccountsProps) {
  const { t } = useAccountingLedgerStrings(labels);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const tree = useMemo(() => accountingTree(accounts), [accounts]);
  const balances = useMemo(() => accountingBalances(accounts, entries, { rollup: true }), [accounts, entries]);
  const byId = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  const hidden = (a: AccountingAccount) => {
    let p = a.parentId ? byId.get(a.parentId) : undefined;
    const seen = new Set<string>();
    while (p && !seen.has(p.id)) {
      if (collapsed.has(p.id)) return true;
      seen.add(p.id);
      p = p.parentId ? byId.get(p.parentId) : undefined;
    }
    return false;
  };
  const toggle = (id: string) =>
    setCollapsed((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  if (accounts.length === 0) return <EmptyState icon={ListTree} title={t.noAccounts} description={t.noAccountsText} className={className} />;

  return (
    <div data-slot="chart-of-accounts" className={cn("relative w-full overflow-x-auto rounded-card border border-border bg-card", className)} {...props}>
      <table className="w-full min-w-[32rem] border-collapse">
        <caption className="sr-only">{t.chart}</caption>
        <thead className="border-b border-border">
          <tr>
            <th scope="col" className={th}>{t.account}</th>
            <th scope="col" className={cn(th, "w-28")}>{t.type}</th>
            <th scope="col" dir="ltr" className={cn(thNum, "w-36")}>{t.balance}</th>
            <th scope="col" className="w-10"><span className="sr-only">{t.rowActions}</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {tree.map(({ account: a, depth, hasChildren }) => {
            if (hidden(a)) return null;
            const b = balances.get(a.id);
            const isCollapsed = collapsed.has(a.id);
            const actions = [
              ...(onSelectAccount ? [{ id: "statement", label: t.viewStatement, icon: ListTree, onSelect: () => onSelectAccount(a), group: "open" }] : []),
              ...(onAddChild ? [{ id: "child", label: t.addChild, icon: FolderPlus, onSelect: () => onAddChild(a), group: "open" }] : []),
              ...(onArchiveChange ? [{ id: "archive", label: a.archived ? t.restore : t.archive, icon: Archive, danger: !a.archived, onSelect: () => onArchiveChange(a, !a.archived), group: "danger" }] : []),
            ];
            return (
              <ContextMenuActions
                key={a.id}
                actions={actions}
                render={<tr data-slot="account-row" data-selected={selectedId === a.id ? "" : undefined} className={cn("data-[selected]:bg-nq-hover", a.archived && "opacity-60")} />}
              >
                <td className={td}>
                  <div className="flex items-center gap-2" style={{ paddingInlineStart: `${depth * 1.25}rem` }}>
                    {hasChildren ? (
                      <Button variant="ghost" size="icon-sm" aria-expanded={!isCollapsed} aria-label={`${isCollapsed ? t.expand : t.collapse}, ${a.name}`} onClick={() => toggle(a.id)}>
                        <ChevronDown aria-hidden className={cn("transition-transform", isCollapsed && "-rotate-90 rtl:rotate-90")} />
                      </Button>
                    ) : (
                      <span aria-hidden className="size-control-sm shrink-0" />
                    )}
                    <bdi dir="ltr" className="text-caption tabular-nums text-muted-foreground">{a.code}</bdi>
                    {onSelectAccount ? (
                      <button type="button" className={cn("min-w-0 truncate text-start hover:underline", hasChildren && "font-medium")} onClick={() => onSelectAccount(a)}>
                        {a.name}
                      </button>
                    ) : (
                      <span className={cn("min-w-0 truncate", hasChildren && "font-medium")}>{a.name}</span>
                    )}
                    {a.archived ? <Badge variant="outline">{t.archived}</Badge> : null}
                  </div>
                </td>
                <td className={td}><Badge variant={TYPE_VARIANT[a.type]}>{t[a.type]}</Badge></td>
                <td dir="ltr" className={tdNum}><Figure minor={b?.balance ?? 0} currency={currency} /></td>
                <td className="px-1"><LineItemActionsMenu actions={actions} label={`${t.rowActions}, ${a.name}`} /></td>
              </ContextMenuActions>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ journal entry editor */

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

export interface JournalEntryEditorProps extends Omit<ComponentProps<"form">, "defaultValue" | "onChange" | "onSubmit" | "children"> {
  accounts: readonly AccountingAccount[];
  value?: JournalEntryEditorValue;
  defaultValue?: JournalEntryEditorValue;
  onValueChange?: (value: JournalEntryEditorValue) => void;
  currency?: string;
  /** Shown as the entry number, for example "JE-0009". */
  number?: string;
  /** Called when a balanced entry is posted. Throw to keep the editor as it is. */
  onPost?: (value: JournalEntryEditorValue) => void | Promise<void>;
  onSaveDraft?: (value: JournalEntryEditorValue) => void | Promise<void>;
  readOnly?: boolean;
  labels?: AccountingLedgerLabels;
}

let counter = 0;
const newLineId = () => `jl-${Date.now().toString(36)}-${(counter++).toString(36)}`;
const blankLine = (): JournalEntryEditorLine => ({ id: newLineId(), accountId: "", debit: 0, credit: 0 });

/** A starting value: today's date, no memo, two empty lines. */
export function journalEntryDraft(date = new Date().toISOString().slice(0, 10)): JournalEntryEditorValue {
  return { date, memo: "", lines: [blankLine(), blankLine()] };
}

function AccountPicker({ accounts, value, label, invalid, disabled, onChange, t }: { accounts: readonly AccountingAccount[]; value: string; label: string; invalid: boolean; disabled: boolean; onChange: (id: string) => void; t: Strings }) {
  const selected = accounts.find((a) => a.id === value) ?? null;
  const [text, setText] = useState(selected ? `${selected.code} ${selected.name}` : "");
  return (
    <Combobox
      items={accounts as AccountingAccount[]}
      value={selected}
      inputValue={text}
      disabled={disabled}
      itemToStringLabel={(a: AccountingAccount) => `${a.code} ${a.name}`}
      isItemEqualToValue={(a: AccountingAccount, b: AccountingAccount) => a.id === b.id}
      filter={(a: AccountingAccount, q: string) => comboboxFilter(a, q, (x) => `${x.code} ${x.name}`)}
      onInputValueChange={(v: string) => setText(v)}
      onValueChange={(a: AccountingAccount | null) => {
        onChange(a?.id ?? "");
        setText(a ? `${a.code} ${a.name}` : "");
      }}
    >
      <ComboboxInput clearable={false} placeholder={t.pickAccount} aria-label={label} aria-invalid={invalid || undefined} triggerLabel={t.pickAccount} clearLabel={t.pickAccount} onBlur={() => setText(selected ? `${selected.code} ${selected.name}` : "")} />
      <ComboboxContent>
        <ComboboxEmpty>{t.noAccountMatch}</ComboboxEmpty>
        <ComboboxList>
          {(a: AccountingAccount) => (
            <ComboboxItem key={a.id} value={a}>
              <span className="flex min-w-0 items-baseline gap-2">
                <bdi dir="ltr" className="text-caption tabular-nums text-muted-foreground">{a.code}</bdi>
                <span className="truncate">{a.name}</span>
              </span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

const ENTRY_GRID = "@2xl:grid-cols-[minmax(13rem,1.5fr)_minmax(8rem,1fr)_9rem_9rem_2rem]";

/**
 * A balanced journal entry. Debits and credits are integer minor units; the running difference is always exact, and
 * Post stays off until the entry balances. Typing on one side of a line clears the other.
 */
export function JournalEntryEditor({ accounts, value, defaultValue, onValueChange, currency = "USD", number, onPost, onSaveDraft, readOnly = false, labels, className, ...props }: JournalEntryEditorProps) {
  const { t } = useAccountingLedgerStrings(labels);
  const id = useId();
  const [inner, setInner] = useState<JournalEntryEditorValue>(() => defaultValue ?? journalEntryDraft());
  const entry = value ?? inner;
  const [busy, setBusy] = useState<"post" | "draft" | null>(null);
  const [tried, setTried] = useState(false);
  const postable = useMemo(() => accounts.filter((a) => !a.archived && !accounts.some((c) => c.parentId === a.id)), [accounts]);
  const totals = accountingEntryTotals(entry.lines);
  const problems = accountingEntryProblems(entry.lines);

  const set = (next: JournalEntryEditorValue) => {
    setInner(next);
    onValueChange?.(next);
  };
  const setLines = (lines: JournalEntryEditorLine[]) => set({ ...entry, lines });
  const patch = (lineId: string, p: Partial<JournalEntryEditorLine>) => setLines(entry.lines.map((l) => (l.id === lineId ? { ...l, ...p } : l)));

  const run = async (kind: "post" | "draft") => {
    setTried(true);
    if (kind === "post" && problems.length) return;
    setBusy(kind);
    try {
      const clean = { ...entry, lines: entry.lines.filter((l) => l.accountId || l.debit || l.credit) };
      if (kind === "post") {
        await onPost?.(clean);
        set(journalEntryDraft(entry.date));
        setTried(false);
      } else await onSaveDraft?.(clean);
    } finally {
      setBusy(null);
    }
  };

  return (
    <form
      data-slot="journal-entry-editor"
      noValidate
      className={cn("@container flex w-full flex-col gap-4", className)}
      onSubmit={(e) => {
        e.preventDefault();
        void run("post");
      }}
      {...props}
    >
      <div className="grid gap-3 @lg:grid-cols-[10rem_minmax(0,1fr)_auto]">
        <label className="flex flex-col gap-1.5 text-label text-foreground">
          {t.date}
          <Input type="date" ltr value={entry.date} disabled={readOnly} onChange={(e) => set({ ...entry, date: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1.5 text-label text-foreground">
          {t.memo}
          <Input value={entry.memo} disabled={readOnly} onChange={(e) => set({ ...entry, memo: e.target.value })} />
        </label>
        {number ? (
          <div className="flex flex-col gap-1.5 text-label text-foreground">
            {t.entryNumber}
            <span className="flex h-control items-center"><bdi dir="ltr" className="text-body-sm tabular-nums text-muted-foreground">{number}</bdi></span>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2" role="group" aria-label={t.lines}>
        <div aria-hidden className={cn("hidden gap-3 px-3 text-caption text-muted-foreground @2xl:grid", ENTRY_GRID)}>
          <span>{t.account}</span>
          <span>{t.memo}</span>
          <span className="text-end">{t.debit}</span>
          <span className="text-end">{t.credit}</span>
          <span />
        </div>
        <ul className="flex flex-col gap-2">
          {entry.lines.map((line, index) => {
            const n = index + 1;
            const noAccount = tried && !line.accountId && (line.debit !== 0 || line.credit !== 0);
            const balanceHere = () => {
              const others = accountingEntryTotals(entry.lines.filter((l) => l.id !== line.id));
              const diff = others.debit - others.credit;
              patch(line.id, diff > 0 ? { debit: 0, credit: diff } : { debit: -diff, credit: 0 });
            };
            const actions = readOnly
              ? []
              : [
                  { id: "balance", label: t.balanceLine, icon: Scale, onSelect: balanceHere, disabled: totals.difference === 0 && line.debit + line.credit > 0, group: "amount" },
                  { id: "duplicate", label: t.duplicateLine, icon: Copy, onSelect: () => setLines([...entry.lines.slice(0, index + 1), { ...line, id: newLineId() }, ...entry.lines.slice(index + 1)]), group: "edit" },
                  { id: "remove", label: t.removeLine, icon: Trash2, danger: true, disabled: entry.lines.length <= 2, onSelect: () => setLines(entry.lines.filter((l) => l.id !== line.id)), group: "danger" },
                ];
            return (
              <ContextMenuActions
                key={line.id}
                actions={actions}
                focusTarget={(el) => el.querySelector<HTMLElement>("input")}
                render={<li data-slot="entry-line" aria-label={`${t.line} ${n}`} className={cn("grid grid-cols-2 items-start gap-x-3 gap-y-3 rounded-floating border border-border bg-card p-3 @2xl:gap-y-0 @2xl:rounded-control", ENTRY_GRID)} />}
              >
                <div className="col-span-2 @2xl:col-span-1">
                  <AccountPicker accounts={postable} value={line.accountId} label={`${t.account}, ${t.line} ${n}`} invalid={noAccount} disabled={readOnly} onChange={(accountId) => patch(line.id, { accountId })} t={t} />
                </div>
                <div className="col-span-2 @2xl:col-span-1">
                  <Input value={line.memo ?? ""} disabled={readOnly} placeholder={t.linePlaceholder} aria-label={`${t.memo}, ${t.line} ${n}`} onChange={(e) => patch(line.id, { memo: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1">
                  <span aria-hidden className="text-caption text-muted-foreground @2xl:hidden">{t.debit}</span>
                  <CurrencyInput value={line.debit || null} currency={currency} symbol="none" min={0} disabled={readOnly} aria-label={`${t.debit}, ${t.line} ${n}`} onValueChange={(v) => patch(line.id, { debit: v ?? 0, ...(v ? { credit: 0 } : {}) })} />
                </div>
                <div className="flex flex-col gap-1">
                  <span aria-hidden className="text-caption text-muted-foreground @2xl:hidden">{t.credit}</span>
                  <CurrencyInput value={line.credit || null} currency={currency} symbol="none" min={0} disabled={readOnly} aria-label={`${t.credit}, ${t.line} ${n}`} onValueChange={(v) => patch(line.id, { credit: v ?? 0, ...(v ? { debit: 0 } : {}) })} />
                </div>
                <div className="col-span-2 flex justify-end @2xl:col-span-1">
                  <LineItemActionsMenu actions={actions} label={`${t.lineActions}, ${t.line} ${n}`} />
                </div>
              </ContextMenuActions>
            );
          })}
        </ul>
        {readOnly ? null : (
          <div>
            <Button type="button" variant="secondary" size="sm" onClick={() => setLines([...entry.lines, blankLine()])}>
              <Plus aria-hidden />
              {t.addLine}
            </Button>
          </div>
        )}
      </div>

      <div role="region" aria-label={t.totals} className="flex flex-col gap-2 rounded-card border border-border bg-card p-3">
        <div className={cn("grid grid-cols-2 items-baseline gap-3 @2xl:gap-3", ENTRY_GRID)}>
          <span className="col-span-2 text-label text-foreground @2xl:col-span-2">{t.totals}</span>
          <span className="text-end text-label tabular-nums"><Figure minor={totals.debit} currency={currency} /></span>
          <span className="text-end text-label tabular-nums"><Figure minor={totals.credit} currency={currency} /></span>
          <span className="hidden @2xl:block" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2" aria-live="polite">
          <span className="text-body-sm text-muted-foreground">{t.difference}</span>
          <span className="flex items-center gap-2">
            <Badge variant={totals.balanced ? "success" : totals.debit + totals.credit === 0 ? "neutral" : "danger"}>{totals.balanced ? t.balanced : t.outOfBalance}</Badge>
            {totals.difference !== 0 ? <LineItemMoney minor={Math.abs(totals.difference)} currency={currency} className="text-label" /> : null}
          </span>
        </div>
        {tried && problems.length ? (
          <ul role="alert" className="flex flex-col gap-0.5 text-caption text-nq-danger-text">
            {problems.map((p) => (
              <li key={p}>{t[PROBLEM_KEY[p]]}</li>
            ))}
          </ul>
        ) : null}
      </div>

      {readOnly ? null : (
        <div className="flex flex-wrap justify-end gap-2">
          {onSaveDraft ? (
            <Button type="button" variant="secondary" loading={busy === "draft"} disabled={busy === "post"} onClick={() => void run("draft")}>
              {t.saveDraft}
            </Button>
          ) : null}
          <Button id={`${id}-post`} type="submit" variant="primary" loading={busy === "post"} disabled={!totals.balanced || problems.length > 0 || busy === "draft"}>
            {t.post}
          </Button>
        </div>
      )}
    </form>
  );
}

/* ------------------------------------------------------------------ trial balance */

export interface TrialBalanceProps extends Omit<ComponentProps<"div">, "children"> {
  accounts: readonly AccountingAccount[];
  entries: readonly AccountingEntry[];
  currency?: string;
  /** ISO date. Entries after it are left out. */
  asOf?: string;
  includeZero?: boolean;
  onSelectAccount?: (account: AccountingAccount) => void;
  labels?: AccountingLedgerLabels;
}

/** Net debit and credit per account with the two totals, and a plain statement of whether they agree. */
export function TrialBalance({ accounts, entries, currency = "USD", asOf, includeZero, onSelectAccount, labels, className, ...props }: TrialBalanceProps) {
  const { t, locale } = useAccountingLedgerStrings(labels);
  const date = useDate(locale);
  const tb = useMemo(() => accountingTrialBalance(accounts, entries, { asOf, includeZero }), [accounts, entries, asOf, includeZero]);
  if (tb.rows.length === 0) return <EmptyState icon={Scale} title={t.empty} description={t.emptyText} className={className} />;
  return (
    <div data-slot="trial-balance" className={cn("flex w-full flex-col gap-2", className)} {...props}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-caption text-muted-foreground">
        <span>
          {t.inCurrency} <bdi dir="ltr">{currency}</bdi>
        </span>
        {asOf ? (
          <span>
            {t.asOf} <bdi>{date(asOf)}</bdi>
          </span>
        ) : null}
      </div>
      <div className="w-full overflow-x-auto rounded-card border border-border bg-card">
        <table className="w-full min-w-[30rem] border-collapse">
          <caption className="sr-only">{t.trial}</caption>
          <thead className="border-b border-border">
            <tr>
              <th scope="col" className={th}>{t.account}</th>
              <th scope="col" dir="ltr" className={cn(thNum, "w-36")}>{t.debit}</th>
              <th scope="col" dir="ltr" className={cn(thNum, "w-36")}>{t.credit}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tb.rows.map(({ account: a, debit, credit }) => (
              <tr key={a.id}>
                <td className={td}>
                  <div className="flex items-center gap-2">
                    <bdi dir="ltr" className="text-caption tabular-nums text-muted-foreground">{a.code}</bdi>
                    {onSelectAccount ? (
                      <button type="button" className="min-w-0 truncate text-start hover:underline" onClick={() => onSelectAccount(a)}>{a.name}</button>
                    ) : (
                      <span className="min-w-0 truncate">{a.name}</span>
                    )}
                  </div>
                </td>
                <td dir="ltr" className={tdNum}><Figure minor={debit} currency={currency} blank /></td>
                <td dir="ltr" className={tdNum}><Figure minor={credit} currency={currency} blank /></td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-border">
            <tr>
              <th scope="row" className={cn(td, "text-start font-medium")}>{t.total}</th>
              <td dir="ltr" className={cn(tdNum, "font-medium")}><Figure minor={tb.debit} currency={currency} /></td>
              <td dir="ltr" className={cn(tdNum, "font-medium")}><Figure minor={tb.credit} currency={currency} /></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex items-center justify-end gap-2" aria-live="polite">
        <Badge variant={tb.balanced ? "success" : "danger"}>{tb.balanced ? t.trialBalanced : t.trialOff}</Badge>
        {tb.balanced ? null : <LineItemMoney minor={Math.abs(tb.debit - tb.credit)} currency={currency} className="text-label" />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ account statement */

export interface AccountStatementProps extends Omit<ComponentProps<"div">, "children"> {
  account: AccountingAccount;
  entries: readonly AccountingEntry[];
  currency?: string;
  /** Balance before the first row, on the account's normal side. */
  opening?: number;
  labels?: AccountingLedgerLabels;
}

/** The movements of one account with a running balance on its normal side. */
export function AccountStatement({ account, entries, currency = "USD", opening = 0, labels, className, ...props }: AccountStatementProps) {
  const { t, locale } = useAccountingLedgerStrings(labels);
  const date = useDate(locale);
  const rows = useMemo(() => accountingStatement(account, entries, { opening }), [account, entries, opening]);
  const side = accountingNormalSide(account.type);
  return (
    <div data-slot="account-statement" className={cn("flex w-full flex-col gap-2", className)} {...props}>
      <div className="flex flex-wrap items-center gap-2">
        <bdi dir="ltr" className="text-caption tabular-nums text-muted-foreground">{account.code}</bdi>
        <h3 className="text-h3 text-foreground">{account.name}</h3>
        <Badge variant={TYPE_VARIANT[account.type]}>{t[account.type]}</Badge>
        <span className="ms-auto text-caption text-muted-foreground">
          {t.inCurrency} <bdi dir="ltr">{currency}</bdi>
        </span>
      </div>
      {rows.length === 0 ? (
        <EmptyState title={t.noMovements} />
      ) : (
        <div className="w-full overflow-x-auto rounded-card border border-border bg-card">
          <table className="w-full min-w-[36rem] border-collapse">
            <caption className="sr-only">{`${t.statement}: ${account.name}`}</caption>
            <thead className="border-b border-border">
              <tr>
                <th scope="col" className={cn(th, "w-32")}>{t.date}</th>
                <th scope="col" className={cn(th, "w-28")}>{t.number}</th>
                <th scope="col" className={th}>{t.memo}</th>
                <th scope="col" dir="ltr" className={cn(thNum, "w-32")}>{t.debit}</th>
                <th scope="col" dir="ltr" className={cn(thNum, "w-32")}>{t.credit}</th>
                <th scope="col" dir="ltr" className={cn(thNum, "w-36")}>{t.running}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {opening !== 0 ? (
                <tr className="text-muted-foreground">
                  <td className={td} colSpan={5}>{t.balance}</td>
                  <td dir="ltr" className={tdNum}><Figure minor={opening} currency={currency} /></td>
                </tr>
              ) : null}
              {rows.map((r, i) => (
                <tr key={`${r.entryId}-${i}`}>
                  <td className={td}><bdi>{date(r.date)}</bdi></td>
                  <td className={td}><bdi dir="ltr" className="tabular-nums">{r.number}</bdi></td>
                  <td className={cn(td, "max-w-64 truncate")}>{r.memo}</td>
                  <td dir="ltr" className={tdNum}><Figure minor={r.debit} currency={currency} blank /></td>
                  <td dir="ltr" className={tdNum}><Figure minor={r.credit} currency={currency} blank /></td>
                  <td dir="ltr" className={cn(tdNum, "font-medium")}>
                    <Figure minor={r.balance} currency={currency} />
                    <span className="sr-only"> {t[side]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
