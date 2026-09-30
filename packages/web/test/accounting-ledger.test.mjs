import assert from "node:assert/strict";
import { test } from "node:test";
import {
  accountingBalances,
  accountingEntryProblems,
  accountingEntryTotals,
  accountingNormalSide,
  accountingSignedBalance,
  accountingStatement,
  accountingTree,
  accountingTrialBalance,
} from "../src/components/accounting-ledger/accounting-math.ts";

const accounts = [
  { id: "1000", code: "1000", name: "Assets", type: "asset" },
  { id: "1100", code: "1100", name: "Cash", type: "asset", parentId: "1000" },
  { id: "2100", code: "2100", name: "Payables", type: "liability" },
  { id: "4100", code: "4100", name: "Sales", type: "revenue" },
  { id: "5200", code: "5200", name: "Rent", type: "expense" },
];
const L = (accountId, debit, credit) => ({ accountId, debit, credit });
const entries = [
  { id: "1", number: "JE-1", date: "2026-09-01", status: "posted", lines: [L("1100", 10000, 0), L("4100", 0, 10000)] },
  { id: "2", number: "JE-2", date: "2026-09-05", status: "posted", lines: [L("5200", 3000, 0), L("1100", 0, 3000)] },
  { id: "3", number: "JE-3", date: "2026-09-06", status: "draft", lines: [L("5200", 999, 0), L("2100", 0, 999)] },
  { id: "4", number: "JE-4", date: "2026-09-07", status: "void", lines: [L("5200", 5, 0), L("2100", 0, 5)] },
];

test("normal side and signed balance", () => {
  assert.equal(accountingNormalSide("asset"), "debit");
  assert.equal(accountingNormalSide("expense"), "debit");
  assert.equal(accountingNormalSide("liability"), "credit");
  assert.equal(accountingNormalSide("revenue"), "credit");
  assert.equal(accountingSignedBalance("asset", 100, 30), 70);
  assert.equal(accountingSignedBalance("revenue", 30, 100), 70);
  assert.equal(accountingSignedBalance("liability", 100, 30), -70);
});

test("entry totals: balanced only when equal and non-zero", () => {
  assert.deepEqual(accountingEntryTotals([L("a", 100, 0), L("b", 0, 100)]), { debit: 100, credit: 100, difference: 0, balanced: true });
  assert.equal(accountingEntryTotals([L("a", 100, 0), L("b", 0, 99)]).difference, 1);
  assert.equal(accountingEntryTotals([L("a", 0, 0)]).balanced, false);
  // Ten lines of 10 minor units against 100 are exact: no float drift.
  assert.equal(accountingEntryTotals([...Array.from({ length: 10 }, () => L("a", 10, 0)), L("b", 0, 100)]).balanced, true);
});

test("entry problems name what blocks posting", () => {
  assert.deepEqual(accountingEntryProblems([L("a", 100, 0), L("b", 0, 100)]), []);
  assert.deepEqual(accountingEntryProblems([L("a", 100, 0), L("b", 0, 90)]), ["unbalanced"]);
  assert.ok(accountingEntryProblems([L("a", 100, 0)]).includes("few-lines"));
  assert.ok(accountingEntryProblems([L("a", 100, 100), L("b", 0, 0)]).includes("both-sides"));
  assert.ok(accountingEntryProblems([L("", 100, 0), L("b", 0, 100)]).includes("no-account"));
  assert.ok(accountingEntryProblems([]).includes("zero"));
  assert.ok(accountingEntryProblems([L("a", -5, 0), L("b", 0, -5)]).includes("negative"));
  // Empty spare lines are ignored.
  assert.deepEqual(accountingEntryProblems([L("a", 100, 0), L("b", 0, 100), L("", 0, 0)]), []);
});

test("balances count posted entries only; rollup adds children to parents", () => {
  const flat = accountingBalances(accounts, entries);
  assert.equal(flat.get("1100").balance, 7000);
  assert.equal(flat.get("5200").balance, 3000); // draft and void left out
  assert.equal(flat.get("1000").balance, 0);
  assert.equal(accountingBalances(accounts, entries, { rollup: true }).get("1000").balance, 7000);
  assert.equal(accountingBalances(accounts, entries, { asOf: "2026-09-03" }).get("1100").balance, 10000);
});

test("trial balance balances and skips idle accounts", () => {
  const tb = accountingTrialBalance(accounts, entries);
  assert.equal(tb.balanced, true);
  assert.equal(tb.debit, 10000);
  assert.equal(tb.credit, 10000);
  assert.deepEqual(tb.rows.map((r) => r.account.code), ["1100", "4100", "5200"]);
  assert.equal(tb.rows.find((r) => r.account.code === "1100").debit, 7000);
  assert.equal(tb.rows.find((r) => r.account.code === "4100").credit, 10000);
  assert.equal(accountingTrialBalance(accounts, entries, { includeZero: true }).rows.length, 5);
});

test("a wrongly posted entry shows up as an out-of-balance trial balance", () => {
  const bad = [...entries, { id: "9", number: "JE-9", date: "2026-09-09", status: "posted", lines: [L("5200", 100, 0), L("1100", 0, 90)] }];
  const tb = accountingTrialBalance(accounts, bad);
  assert.equal(tb.balanced, false);
  assert.equal(tb.debit - tb.credit, 10);
});

test("statement carries a running balance in date order", () => {
  const rows = accountingStatement(accounts[1], entries);
  assert.deepEqual(rows.map((r) => r.balance), [10000, 7000]);
  assert.deepEqual(rows.map((r) => r.number), ["JE-1", "JE-2"]);
  assert.equal(accountingStatement(accounts[3], entries)[0].balance, 10000);
  assert.equal(accountingStatement(accounts[1], entries, { opening: 500 })[1].balance, 7500);
});

test("tree: parents first, depth, siblings by code", () => {
  const t = accountingTree([...accounts].reverse());
  assert.deepEqual(t.map((r) => [r.account.code, r.depth]), [["1000", 0], ["1100", 1], ["2100", 0], ["4100", 0], ["5200", 0]]);
  assert.equal(t[0].hasChildren, true);
  assert.equal(t[1].hasChildren, false);
  assert.equal(accountingTree([{ id: "a", code: "1", name: "a", type: "asset", parentId: "zz" }]).length, 1);
});
