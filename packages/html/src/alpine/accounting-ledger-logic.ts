/* Double-entry maths. Every amount is an integer in minor units, so nothing drifts and a balanced entry is exactly equal. */

export type AccountingAccountType = "asset" | "liability" | "equity" | "revenue" | "expense";
export type AccountingSide = "debit" | "credit";

export interface AccountingAccount {
  id: string;
  code: string;
  name: string;
  type: AccountingAccountType;
  /** The parent account. Accounts with children are groups: post to the leaves. */
  parentId?: string | null;
  /** Archived accounts stay in reports but leave the picker. */
  archived?: boolean;
}

export interface AccountingEntryLine {
  accountId: string;
  /** Minor units, zero or more. */
  debit: number;
  /** Minor units, zero or more. */
  credit: number;
  memo?: string;
}

export type AccountingEntryStatus = "draft" | "posted" | "void";

export interface AccountingEntry {
  id: string;
  number: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  memo?: string;
  status: AccountingEntryStatus;
  lines: AccountingEntryLine[];
}

/** The side an account normally grows on: assets and expenses on the debit side, the rest on the credit side. */
export function accountingNormalSide(type: AccountingAccountType): AccountingSide {
  return type === "asset" || type === "expense" ? "debit" : "credit";
}

/** A balance on the account's normal side. Positive means it sits where it normally does. */
export function accountingSignedBalance(type: AccountingAccountType, debit: number, credit: number): number {
  return accountingNormalSide(type) === "debit" ? debit - credit : credit - debit;
}

export interface AccountingEntryTotals {
  debit: number;
  credit: number;
  /** Debit minus credit. Zero when balanced. */
  difference: number;
  balanced: boolean;
}

export function accountingEntryTotals(lines: readonly Pick<AccountingEntryLine, "debit" | "credit">[]): AccountingEntryTotals {
  let debit = 0;
  let credit = 0;
  for (const l of lines) {
    debit += l.debit || 0;
    credit += l.credit || 0;
  }
  return { debit, credit, difference: debit - credit, balanced: debit === credit && debit > 0 };
}

export type AccountingEntryProblem = "few-lines" | "no-account" | "both-sides" | "negative" | "unbalanced" | "zero";

/** Why an entry cannot be posted. An empty list means it can. Lines with no amount at all are ignored. */
export function accountingEntryProblems(lines: readonly AccountingEntryLine[]): AccountingEntryProblem[] {
  const withAmount = lines.filter((l) => (l.debit || 0) !== 0 || (l.credit || 0) !== 0);
  const out: AccountingEntryProblem[] = [];
  if (withAmount.length < 2) out.push("few-lines");
  if (withAmount.some((l) => !l.accountId)) out.push("no-account");
  if (withAmount.some((l) => l.debit > 0 && l.credit > 0)) out.push("both-sides");
  if (withAmount.some((l) => l.debit < 0 || l.credit < 0)) out.push("negative");
  const totals = accountingEntryTotals(withAmount);
  if (totals.debit === 0 && totals.credit === 0) out.push("zero");
  else if (totals.difference !== 0) out.push("unbalanced");
  return out;
}

export interface AccountingBalance {
  accountId: string;
  debit: number;
  credit: number;
  /** On the account's normal side. */
  balance: number;
}

const postedLines = (entries: readonly AccountingEntry[], asOf?: string) =>
  entries.filter((e) => e.status === "posted" && (!asOf || e.date <= asOf)).flatMap((e) => e.lines);

/**
 * Balances per account from posted entries only. With `rollup` a group holds the sum of its children too, so a parent
 * row of the chart shows the whole branch.
 */
export function accountingBalances(
  accounts: readonly AccountingAccount[],
  entries: readonly AccountingEntry[],
  { asOf, rollup = false }: { asOf?: string; rollup?: boolean } = {},
): Map<string, AccountingBalance> {
  const map = new Map<string, AccountingBalance>(accounts.map((a) => [a.id, { accountId: a.id, debit: 0, credit: 0, balance: 0 }]));
  const byId = new Map(accounts.map((a) => [a.id, a]));
  for (const line of postedLines(entries, asOf)) {
    let id: string | null | undefined = line.accountId;
    const seen = new Set<string>();
    while (id && map.has(id) && !seen.has(id)) {
      seen.add(id);
      const b = map.get(id)!;
      b.debit += line.debit || 0;
      b.credit += line.credit || 0;
      if (!rollup) break;
      id = byId.get(id)?.parentId;
    }
  }
  for (const a of accounts) {
    const b = map.get(a.id)!;
    b.balance = accountingSignedBalance(a.type, b.debit, b.credit);
  }
  return map;
}

export interface AccountingTrialRow {
  account: AccountingAccount;
  /** Net debit balance, zero when the account nets to a credit. */
  debit: number;
  /** Net credit balance. */
  credit: number;
}

export interface AccountingTrialBalance {
  rows: AccountingTrialRow[];
  debit: number;
  credit: number;
  balanced: boolean;
}

const byCode = (a: { code: string }, b: { code: string }) => a.code.localeCompare(b.code, "en", { numeric: true });

/** One row per account that has activity, its net placed on the debit or the credit column, and the two totals. */
export function accountingTrialBalance(
  accounts: readonly AccountingAccount[],
  entries: readonly AccountingEntry[],
  { asOf, includeZero = false }: { asOf?: string; includeZero?: boolean } = {},
): AccountingTrialBalance {
  const raw = accountingBalances(accounts, entries, { asOf });
  const rows: AccountingTrialRow[] = [];
  let debit = 0;
  let credit = 0;
  for (const account of [...accounts].sort(byCode)) {
    const b = raw.get(account.id)!;
    if (!includeZero && b.debit === 0 && b.credit === 0) continue;
    const net = b.debit - b.credit;
    const row = { account, debit: net > 0 ? net : 0, credit: net < 0 ? -net : 0 };
    debit += row.debit;
    credit += row.credit;
    rows.push(row);
  }
  return { rows, debit, credit, balanced: debit === credit };
}

export interface AccountingStatementRow {
  entryId: string;
  number: string;
  date: string;
  memo?: string;
  debit: number;
  credit: number;
  /** Running balance on the account's normal side, after this line. */
  balance: number;
}

/** The lines of one account in date order (then number), with a running balance carried from `opening`. */
export function accountingStatement(
  account: Pick<AccountingAccount, "id" | "type">,
  entries: readonly AccountingEntry[],
  { opening = 0 }: { opening?: number } = {},
): AccountingStatementRow[] {
  const rows: AccountingStatementRow[] = [];
  const posted = entries
    .filter((e) => e.status === "posted")
    .sort((a, b) => a.date.localeCompare(b.date) || a.number.localeCompare(b.number, "en", { numeric: true }));
  let balance = opening;
  for (const e of posted) {
    for (const l of e.lines) {
      if (l.accountId !== account.id) continue;
      balance += accountingSignedBalance(account.type, l.debit || 0, l.credit || 0);
      rows.push({ entryId: e.id, number: e.number, date: e.date, memo: l.memo || e.memo, debit: l.debit || 0, credit: l.credit || 0, balance });
    }
  }
  return rows;
}

/** The accounts in tree order (parents first, siblings by code) with their depth. Orphans become roots. */
export function accountingTree(accounts: readonly AccountingAccount[]): { account: AccountingAccount; depth: number; hasChildren: boolean }[] {
  const ids = new Set(accounts.map((a) => a.id));
  const kids = new Map<string | null, AccountingAccount[]>();
  for (const a of accounts) {
    const key = a.parentId && ids.has(a.parentId) ? a.parentId : null;
    kids.set(key, [...(kids.get(key) ?? []), a]);
  }
  const out: { account: AccountingAccount; depth: number; hasChildren: boolean }[] = [];
  const visit = (parent: string | null, depth: number, path: ReadonlySet<string>) => {
    for (const a of [...(kids.get(parent) ?? [])].sort(byCode)) {
      if (path.has(a.id)) continue;
      out.push({ account: a, depth, hasChildren: (kids.get(a.id) ?? []).length > 0 });
      visit(a.id, depth + 1, new Set([...path, a.id]));
    }
  };
  visit(null, 0, new Set());
  return out;
}
