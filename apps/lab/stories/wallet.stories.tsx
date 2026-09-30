import { Wallet, WalletBalance, type WalletTransaction, WalletTransactions } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useAr, wait } from "./_profile-demo";

const meta = { title: "Components/Commerce/Wallet", component: Wallet, parameters: { layout: "padded" } } satisfies Meta<typeof Wallet>;
export default meta;
type Story = StoryObj;

const at = (days: number, hour = 10) => {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return new Date(d.getTime() - days * 86_400_000);
};

const transactions = (ar: boolean): WalletTransaction[] => [
  { id: "1", type: "topup", amount: 500, status: "completed", date: at(0, 9), description: ar ? "شحن الرصيد" : "Top-up", reference: "TX-88120" },
  { id: "2", type: "payment", amount: -84.5, status: "completed", date: at(0, 8), description: ar ? "دفع فاتورة" : "Invoice payment" },
  { id: "3", type: "payout", amount: -300, status: "pending", date: at(1), description: ar ? "سحب إلى البنك" : "Withdrawal to bank" },
  { id: "4", type: "topup", amount: 250, status: "failed", date: at(4), description: ar ? "شحن الرصيد" : "Top-up" },
];

function Demo({ loading, empty, failing }: { loading?: boolean; empty?: boolean; failing?: boolean }) {
  const ar = useAr();
  return (
    <div className="mx-auto max-w-3xl">
      <Wallet
        balance={1250.5}
        pending={300}
        currency={ar ? "SAR" : "USD"}
        trend={[820, 900, 870, 1010, 980, 1120, 1250.5]}
        loading={loading}
        transactions={empty ? [] : transactions(ar)}
        sources={[{ id: "visa", label: "Visa 4242" }, { id: "mc", label: "Mastercard 4444" }]}
        destinations={[{ id: "bank", label: ar ? "مصرف الراجحي" : "Al Rajhi Bank", description: "SA03 **** 7519" }]}
        feeNote={ar ? "تُطبَّق رسوم 1.5% على البطاقات." : "A 1.5% fee applies to cards."}
        onTopUp={async () => {
          await wait(800);
          return failing ? { error: ar ? "رُفضت البطاقة." : "The card was declined." } : undefined;
        }}
        onPayout={async () => {
          await wait(800);
        }}
      />
    </div>
  );
}

export const Default: Story = { render: () => <Demo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
export const Loading: Story = { render: () => <Demo loading /> };
export const NoTransactions: Story = { render: () => <Demo empty /> };
export const TopUpFails: Story = { render: () => <Demo failing /> };

export const Parts: Story = {
  render: () => (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <WalletBalance balance={80} currency="USD" />
      <WalletTransactions transactions={transactions(false)} currency="USD" />
    </div>
  ),
};
