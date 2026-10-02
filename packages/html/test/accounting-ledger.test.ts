// The Blade accounting-ledger example (packages/php/examples/rendered/accounting-ledger.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms));

beforeAll(() => {
  Alpine.plugin(nasaq);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).Alpine = Alpine;
  Alpine.start();
});

afterEach(() => {
  for (const el of [...document.body.children]) {
    Alpine.destroyTree(el as HTMLElement);
    el.remove();
  }
});

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("accounting-ledger");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (h: HTMLElement, slot: string) => Alpine.$data(h.querySelector<HTMLElement>(`[data-slot="${slot}"]`)!) as any;

describe("accounting-ledger (Alpine)", () => {
  it("renders the chart with rolled-up balances and a row menu per account", async () => {
    const h = await mount();
    const rows = [...h.querySelectorAll<HTMLElement>('[data-slot="account-row"]')];
    expect(rows).toHaveLength(6);
    expect(rows[0]!.textContent).toContain("Assets");
    expect(rows[0]!.textContent).toContain("12,500.00");
    expect(rows[0]!.querySelector('[data-slot="line-item-actions"]')).not.toBeNull();
  });

  it("collapses a group and hides its children", async () => {
    const h = await mount();
    const d = data(h, "chart-of-accounts");
    d.toggle("assets");
    await tick();
    const rows = [...h.querySelectorAll<HTMLElement>('[data-slot="account-row"]')];
    expect(rows.filter((r) => r.style.display !== "none")).toHaveLength(4);
  });

  it("archives an account locally and lets a handler cancel", async () => {
    const h = await mount();
    const root = h.querySelector<HTMLElement>('[data-slot="chart-of-accounts"]')!;
    const d = data(h, "chart-of-accounts");
    d.toggleArchive(d.accounts[5]);
    expect(d.accounts[5].archived).toBe(true);
    root.addEventListener("nq-archive-change", (e) => e.preventDefault(), { once: true });
    d.toggleArchive(d.accounts[4]);
    expect(d.accounts[4].archived).toBeFalsy();
  });

  it("shows a balanced trial balance and the account statement", async () => {
    const h = await mount();
    const d = data(h, "trial-balance");
    expect(d.tb.balanced).toBe(true);
    expect(d.tb.debit).toBe(1250000);
    expect(h.querySelector('[data-slot="trial-balance"]')!.textContent).toContain("12,500.00");
    const s = h.querySelector('[data-slot="account-statement"]')!;
    expect(s.textContent).toContain("JE-0008");
    expect(data(h, "account-statement").rows.map((r: { balance: number }) => r.balance)).toEqual([250000]);
  });

  it("keeps Post off until the entry balances, clears the other side and posts through the claimable event", async () => {
    const h = await mount();
    const root = h.querySelector<HTMLElement>('[data-slot="journal-entry-editor"]')!;
    const d = data(h, "journal-entry-editor");
    expect(h.querySelectorAll('[data-slot="entry-line"]')).toHaveLength(2);
    expect(d.canPost).toBe(false);

    d.lines[0].accountId = "cash";
    d.lines[0].debit = 5000;
    d.lines[0].credit = 700;
    await tick();
    expect(d.lines[0].debit).toBe(5000);
    expect(d.lines[0].credit).toBeNull();

    d.lines[1].accountId = "sales";
    d.lines[1].credit = 4000;
    await tick();
    expect(d.totals.balanced).toBe(false);
    expect(d.canPost).toBe(false);
    d.balanceLine(d.lines[1].id);
    await tick();
    expect(d.lines[1].credit).toBe(5000);
    expect(d.canPost).toBe(true);

    let seen: { lines: unknown[] } | null = null;
    root.addEventListener("nq-accounting-post", (e) => {
      const detail = (e as CustomEvent).detail;
      seen = detail.value;
      detail.waitUntil(Promise.resolve());
    });
    await d.submit("post");
    expect(seen!.lines).toHaveLength(2);
    expect(d.lines.every((l: { debit: number | null }) => !l.debit)).toBe(true);
  });

  it("keeps the entry when the host rejects the post, and duplicates and removes lines", async () => {
    const h = await mount();
    const root = h.querySelector<HTMLElement>('[data-slot="journal-entry-editor"]')!;
    const d = data(h, "journal-entry-editor");
    d.lines[0].accountId = "cash";
    d.lines[0].debit = 100;
    d.lines[1].accountId = "sales";
    d.lines[1].credit = 100;
    await tick();
    root.addEventListener("nq-accounting-post", (e) => (e as CustomEvent).detail.reject("no"));
    await d.submit("post");
    expect(d.lines[0].debit).toBe(100);
    d.duplicate(0);
    expect(d.lines).toHaveLength(3);
    expect(d.canRemove()).toBe(true);
    d.remove(d.lines[2].id);
    d.remove(d.lines[1].id);
    expect(d.lines).toHaveLength(2);
  });
});
