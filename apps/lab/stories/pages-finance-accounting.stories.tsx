/* The books: chart of accounts, a journal entry, the trial balance and an account statement. */
import { AccountStatement, type AccountingEntry, ChartOfAccounts, JournalEntryEditor, journalEntryDraft, Tabs, TabsList, TabsPanel, TabsTab, TrialBalance } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { accounts, CURRENCY, journalEntries, t, useAr, V1Page, wait } from "./_v1-demo";

const meta = { title: "Pages/Finance/Accounting", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page({ tab: first = "chart" }: { tab?: string }) {
  const ar = useAr();
  const list = accounts(ar);
  const [tab, setTab] = useState(first);
  const [entries, setEntries] = useState<AccountingEntry[]>(() => journalEntries(ar));
  const [accountId, setAccountId] = useState("1120");
  const account = list.find((a) => a.id === accountId) ?? list[0]!;
  return (
    <V1Page title={t(ar, "Accounting", "المحاسبة")} description={t(ar, "September books for the café and shop.", "دفاتر سبتمبر للمقهى والمتجر.")}>
      <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
        <TabsList>
          <TabsTab value="chart">{t(ar, "Chart of accounts", "دليل الحسابات")}</TabsTab>
          <TabsTab value="entry">{t(ar, "New entry", "قيد جديد")}</TabsTab>
          <TabsTab value="trial">{t(ar, "Trial balance", "ميزان المراجعة")}</TabsTab>
          <TabsTab value="statement">{t(ar, "Statement", "كشف حساب")}</TabsTab>
        </TabsList>
        <TabsPanel value="chart" className="pt-4">
          <ChartOfAccounts
            accounts={list}
            entries={entries}
            currency={CURRENCY}
            selectedId={accountId}
            onSelectAccount={(a) => {
              setAccountId(a.id);
              setTab("statement");
            }}
            onAddChild={() => {}}
            onArchiveChange={() => {}}
          />
        </TabsPanel>
        <TabsPanel value="entry" className="pt-4">
          <JournalEntryEditor
            accounts={list}
            currency={CURRENCY}
            number={`JE-${String(entries.length + 1).padStart(4, "0")}`}
            defaultValue={journalEntryDraft("2026-09-30")}
            onPost={async (v) => {
              await wait(400);
              setEntries((all) => [...all, { id: `je-${all.length + 1}`, number: `JE-${String(all.length + 1).padStart(4, "0")}`, date: v.date, memo: v.memo, status: "posted", lines: v.lines.map(({ id: _id, ...l }) => l) }]);
              setTab("trial");
            }}
          />
        </TabsPanel>
        <TabsPanel value="trial" className="pt-4">
          <TrialBalance accounts={list} entries={entries} currency={CURRENCY} asOf="2026-09-30" onSelectAccount={(a) => { setAccountId(a.id); setTab("statement"); }} />
        </TabsPanel>
        <TabsPanel value="statement" className="pt-4">
          <AccountStatement account={account} entries={entries} currency={CURRENCY} />
        </TabsPanel>
      </Tabs>
    </V1Page>
  );
}

export const Default: Story = { render: () => <Page /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page tab="entry" /> };
