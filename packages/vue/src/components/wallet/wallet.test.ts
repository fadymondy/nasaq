import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NasaqProvider } from "../../provider";
import { NqWallet, NqWalletBalance, NqWalletTransactions, checkAmount, groupByDay, parseAmount } from ".";

const tx = [
  { id: "a", type: "topup", amount: 200, status: "completed", date: new Date("2024-03-05T10:30:00"), description: "Top-up" },
  { id: "b", type: "payment", amount: -40, status: "pending", date: new Date("2024-03-04T09:00:00"), description: "Order" },
] as const;

describe("wallet math", () => {
  it("parses and checks amounts", () => {
    expect(parseAmount("1,250.5")).toBe(1250.5);
    expect(checkAmount(null)).toBe("invalid");
    expect(checkAmount(50, { min: 1, max: 10 })).toBe("max");
    expect(checkAmount(5, { min: 1, max: 10 })).toBeNull();
    expect(groupByDay([...tx])).toHaveLength(2);
  });
});

describe("NqWalletBalance", () => {
  it("shows the USD balance, hides and shows it", async () => {
    const w = mount(NqWalletBalance, { props: { balance: 1250.5, onTopUp: () => {}, onPayout: () => {} } });
    expect(w.attributes("data-slot")).toBe("wallet-balance");
    expect(w.text()).toContain("$1,250.50");
    await w.find("button[aria-pressed]").trigger("click");
    expect(w.text()).not.toContain("$1,250.50");
    expect(w.text()).toContain("••••••");
  });
  it("disables Withdraw at a zero balance", () => {
    const w = mount(NqWalletBalance, { props: { balance: 0, onTopUp: () => {}, onPayout: () => {} } });
    expect(w.findAll("button").at(-1)!.attributes("disabled")).toBeDefined();
  });
});

describe("NqWalletTransactions", () => {
  it("filters in and out", async () => {
    const w = mount(NqWalletTransactions, { props: { transactions: tx } });
    expect(w.findAll("li")).toHaveLength(2);
    expect(w.find('li[data-status="pending"]').exists()).toBe(true);
    await w.findAll("button").find((b) => b.text() === "Money in")?.trigger("click");
    expect(w.findAll("li")).toHaveLength(1);
  });
  it("shows the empty state", () => {
    const w = mount(NqWalletTransactions, { props: { transactions: [] } });
    expect(w.find('[data-slot="empty-state"]').exists()).toBe(true);
  });
  it("uses SAR under an Arabic provider", () => {
    const w = mount(
      { components: { NasaqProvider, NqWalletTransactions }, props: ["t"], template: `<NasaqProvider locale="ar" target="scope"><NqWalletTransactions :transactions="t" /></NasaqProvider>` },
      { props: { t: tx } },
    );
    expect(w.text()).toMatch(/SAR|ر\.س/);
  });
});

describe("NqWallet", () => {
  it("renders the parts and hides buttons without callbacks", () => {
    const w = mount(NqWallet, { props: { balance: 10, transactions: tx } });
    expect(w.attributes("data-slot")).toBe("wallet");
    expect(w.find('[data-slot="wallet-transactions"]').exists()).toBe(true);
    expect(w.text()).not.toContain("Add funds");
  });
  it("shows the buttons when callbacks are given", () => {
    const w = mount(NqWallet, { props: { balance: 10, transactions: tx, onTopUp: vi.fn(), onPayout: vi.fn(), sources: [{ id: "v", label: "Visa" }] } });
    expect(w.text()).toContain("Add funds");
    expect(w.text()).toContain("Withdraw");
  });
});
