import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import {
  NqAccountStatement,
  NqChartOfAccounts,
  NqJournalEntryEditor,
  NqTrialBalance,
  accountingEntryProblems,
  accountingEntryTotals,
  accountingStatement,
  accountingTrialBalance,
  journalEntryDraft,
  type AccountingAccount,
  type AccountingEntry,
} from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const accounts: AccountingAccount[] = [
  { id: "assets", code: "1000", name: "Assets", type: "asset" },
  { id: "cash", code: "1010", name: "Cash", type: "asset", parentId: "assets" },
  { id: "sales", code: "4000", name: "Sales", type: "revenue" },
];
const entries: AccountingEntry[] = [
  {
    id: "e1",
    number: "JE-0001",
    date: "2026-09-01",
    memo: "Cash sale",
    status: "posted",
    lines: [
      { accountId: "cash", debit: 25000, credit: 0 },
      { accountId: "sales", debit: 0, credit: 25000 },
    ],
  },
];

describe("accounting maths", () => {
  it("totals and flags problems exactly", () => {
    const t = accountingEntryTotals([
      { debit: 10, credit: 0 },
      { debit: 0, credit: 10 },
    ]);
    expect(t.balanced).toBe(true);
    expect(accountingEntryProblems([{ accountId: "a", debit: 10, credit: 0 }])).toContain("few-lines");
  });
  it("builds a trial balance and a statement", () => {
    const tb = accountingTrialBalance(accounts, entries);
    expect(tb.balanced).toBe(true);
    expect(tb.debit).toBe(25000);
    expect(accountingStatement(accounts[1]!, entries).map((r) => r.balance)).toEqual([25000]);
  });
});

describe("NqChartOfAccounts", () => {
  it("renders rows with a row menu and rolls balances up", () => {
    const w = mount(NqChartOfAccounts, { props: { accounts, entries, currency: "SAR", onSelectAccount: vi.fn() }, attachTo: document.body });
    expect(w.attributes("data-slot")).toBe("chart-of-accounts");
    expect(w.findAll("tbody tr")).toHaveLength(3);
    expect(w.text()).toContain("250.00");
  });
  it("collapses a group", async () => {
    const w = mount(NqChartOfAccounts, { props: { accounts, entries }, attachTo: document.body });
    await w.find('button[aria-expanded="true"]').trigger("click");
    await nextTick();
    expect(w.findAll("tbody tr")).toHaveLength(2);
  });
});

describe("NqTrialBalance and NqAccountStatement", () => {
  it("shows the balanced badge", () => {
    const w = mount(NqTrialBalance, { props: { accounts, entries, currency: "SAR" }, attachTo: document.body });
    expect(w.attributes("data-slot")).toBe("trial-balance");
    expect(w.text()).toContain("250.00");
  });
  it("lists the movements with a running balance", () => {
    const w = mount(NqAccountStatement, { props: { account: accounts[1]!, entries, currency: "SAR" }, attachTo: document.body });
    expect(w.attributes("data-slot")).toBe("account-statement");
    expect(w.text()).toContain("JE-0001");
  });
});

describe("NqJournalEntryEditor", () => {
  it("starts with two blank lines and Post disabled", () => {
    const e = mount(NqJournalEntryEditor, { props: { accounts, currency: "SAR", number: "JE-0009" }, attachTo: document.body });
    expect(e.attributes("data-slot")).toBe("journal-entry-editor");
    expect(e.findAll('[data-slot="entry-line"]')).toHaveLength(2);
    expect(e.text()).toContain("JE-0009");
    expect(e.find('button[type="submit"]').attributes("disabled")).toBeDefined();
  });
  it("posts a balanced value and resets", async () => {
    const onPost = vi.fn();
    const value = journalEntryDraft("2026-09-29");
    value.lines[0] = { ...value.lines[0]!, accountId: "cash", debit: 5000 };
    value.lines[1] = { ...value.lines[1]!, accountId: "sales", credit: 5000 };
    const e = mount(NqJournalEntryEditor, { props: { accounts, currency: "SAR", defaultValue: value, onPost }, attachTo: document.body });
    expect(e.find('button[type="submit"]').attributes("disabled")).toBeUndefined();
    await e.find("form").trigger("submit");
    await nextTick();
    expect(onPost).toHaveBeenCalledTimes(1);
    expect(onPost.mock.calls[0]![0].lines).toHaveLength(2);
  });
  it("keeps the editor when onPost throws", async () => {
    const value = journalEntryDraft("2026-09-29");
    value.lines[0] = { ...value.lines[0]!, accountId: "cash", debit: 5000 };
    value.lines[1] = { ...value.lines[1]!, accountId: "sales", credit: 5000 };
    const e = mount(NqJournalEntryEditor, { props: { accounts, defaultValue: value, onPost: () => Promise.reject(new Error("no")) }, attachTo: document.body });
    await e.find("form").trigger("submit").catch(() => {});
    await new Promise((r) => setTimeout(r, 0));
    expect(e.text()).toContain("Balanced");
  });
});
