import { AccountStatement, ChartOfAccounts, JournalEntryEditor, type JournalEntryEditorValue, TrialBalance, type AccountingEntry } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { accounts, CURRENCY, journalEntries, t, useAr, wait } from "./_v1-demo";

const meta = { title: "Components/Billing/Accounting Ledger", component: ChartOfAccounts, parameters: { layout: "padded" } } satisfies Meta<typeof ChartOfAccounts>;
export default meta;
type Story = StoryObj;

const wrap = (node: React.ReactNode) => <div className="mx-auto w-full max-w-4xl">{node}</div>;

function Chart() {
  const ar = useAr();
  const [selected, setSelected] = useState<string | null>(null);
  return wrap(<ChartOfAccounts accounts={accounts(ar)} entries={journalEntries(ar)} currency={CURRENCY} selectedId={selected} onSelectAccount={(a) => setSelected(a.id)} onAddChild={() => {}} onArchiveChange={() => {}} />);
}

function Entry({ start }: { start?: JournalEntryEditorValue }) {
  const ar = useAr();
  const [posted, setPosted] = useState<string[]>([]);
  return wrap(
    <div className="flex flex-col gap-3">
      <JournalEntryEditor
        accounts={accounts(ar)}
        currency={CURRENCY}
        number="JE-0009"
        defaultValue={start}
        onPost={async (v) => {
          await wait(500);
          setPosted((p) => [...p, `${v.memo || "-"}: ${v.lines.length}`]);
        }}
        onSaveDraft={async () => wait(300)}
      />
      {posted.length ? <p role="status" className="text-body-sm text-muted-foreground">{t(ar, "Posted", "تم الترحيل")}: {posted.join(", ")}</p> : null}
    </div>,
  );
}

const unbalanced = (ar: boolean): JournalEntryEditorValue => ({
  date: "2026-09-30",
  memo: t(ar, "Bank fees", "رسوم بنكية"),
  lines: [
    { id: "a", accountId: "5200", debit: 12550, credit: 0 },
    { id: "b", accountId: "1120", debit: 0, credit: 12000 },
  ],
});

function Trial({ entries }: { entries?: (ar: boolean) => AccountingEntry[] }) {
  const ar = useAr();
  return wrap(<TrialBalance accounts={accounts(ar)} entries={(entries ?? journalEntries)(ar)} currency={CURRENCY} asOf="2026-09-30" />);
}

function Statement() {
  const ar = useAr();
  const list = accounts(ar);
  return wrap(<AccountStatement account={list.find((a) => a.id === "1120")!} entries={journalEntries(ar)} currency={CURRENCY} />);
}

/** The account tree with rolled-up balances. Context-click a row for its actions. */
export const Default: Story = { render: () => <Chart /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Chart /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Chart /> };
/** Post stays off until debits equal credits. */
export const JournalEntry: Story = { render: () => <Entry /> };
export const JournalEntryArabic: Story = { globals: { locale: "ar" }, render: () => <Entry /> };
export const JournalEntryMobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Entry /> };
/** A 5.50 difference: use "Balance with this line" from the line menu to fix it. */
export const JournalEntryOutOfBalance: Story = { render: function Render() { const ar = useAr(); return <Entry start={unbalanced(ar)} />; } };
export const TrialBalanceStory: Story = { name: "Trial balance", render: () => <Trial /> };
export const TrialBalanceArabic: Story = { name: "Trial balance (Arabic)", globals: { locale: "ar" }, render: () => <Trial /> };
/** A posted entry that does not balance shows up here. */
export const TrialBalanceOff: Story = {
  name: "Trial balance out of balance",
  render: () => <Trial entries={(ar) => [...journalEntries(ar), { id: "bad", number: "JE-0099", date: "2026-09-29", status: "posted", lines: [{ accountId: "5200", debit: 10000, credit: 0 }, { accountId: "1120", debit: 0, credit: 9000 }] }]} />,
};
export const AccountStatementStory: Story = { name: "Account statement", render: () => <Statement /> };
export const AccountStatementArabic: Story = { name: "Account statement (Arabic)", globals: { locale: "ar" }, render: () => <Statement /> };
