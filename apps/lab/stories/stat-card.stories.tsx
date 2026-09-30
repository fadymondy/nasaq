import { NasaqProvider, StatCard, StatGrid, useNasaq } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CreditCard, Receipt, Users, Wallet } from "lucide-react";
import type { ReactNode } from "react";

const meta = {
  title: "Components/Data Display/Stat Card",
  component: StatCard,
  parameters: { layout: "padded" },
  args: { label: "Revenue", value: 48210, delta: 0.124, deltaLabel: "vs last month", format: { style: "currency", currency: "USD", maximumFractionDigits: 0 } },
} satisfies Meta<typeof StatCard>;
export default meta;
type Story = StoryObj<typeof meta>;

const TREND = [4, 6, 5, 9, 8, 12, 11, 15, 14, 19, 18, 22];
const FALL = [22, 20, 21, 17, 18, 14, 15, 11, 12, 9, 8, 7];

export const Playground: Story = { render: (args) => <StatCard {...args} className="max-w-xs" icon={<Wallet />} sparkline={TREND} /> };

export const Tones: Story = {
  render: () => (
    <StatGrid className="max-w-3xl">
      <StatCard label="Revenue" value={48210} format={{ style: "currency", currency: "USD", maximumFractionDigits: 0 }} delta={0.124} deltaLabel="vs last month" sparkline={TREND} />
      <StatCard label="Refund rate" value={0.032} format={{ style: "percent", minimumFractionDigits: 1 }} delta={0.08} deltaLabel="vs last month" invert sparkline={TREND} />
      <StatCard label="Cloud cost" value={9120} format={{ style: "currency", currency: "USD", maximumFractionDigits: 0 }} delta={-0.06} deltaLabel="vs last month" invert sparkline={FALL} />
      <StatCard label="Active users" value={3204} delta={-0.021} deltaLabel="vs last month" sparkline={FALL} />
      <StatCard label="Open issues" value={87} delta={0} deltaLabel="no change" />
      <StatCard label="Uptime" value="99.98%" />
    </StatGrid>
  ),
};

export const Loading: Story = {
  render: () => (
    <StatGrid className="max-w-3xl">
      <StatCard label="Revenue" value={0} loading />
      <StatCard label="Users" value={0} loading />
    </StatGrid>
  ),
};

export const English: Story = {
  render: () => (
    <StatGrid className="max-w-4xl">
      <StatCard icon={<Wallet />} label="Revenue" value={48210} format={{ style: "currency", currency: "SAR", maximumFractionDigits: 0 }} delta={0.124} deltaLabel="vs last month" sparkline={TREND} sparklineLabel="Revenue, last 12 weeks" />
      <StatCard icon={<Users />} label="New customers" value={1284} delta={0.052} deltaLabel="vs last month" sparkline={TREND} />
      <StatCard icon={<Receipt />} label="Unpaid invoices" value={23} delta={0.15} deltaLabel="vs last month" invert sparkline={TREND} />
      <StatCard icon={<CreditCard />} label="Card fees" value={1420} format={{ style: "currency", currency: "SAR", maximumFractionDigits: 0 }} delta={-0.03} deltaLabel="vs last month" invert sparkline={FALL} />
    </StatGrid>
  ),
};

function Scope({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useNasaq();
  return (
    <NasaqProvider target="scope" locale="ar" theme={resolvedTheme} className="contents">
      {children}
    </NasaqProvider>
  );
}

export const Arabic: Story = {
  render: () => (
    <Scope>
      <StatGrid className="max-w-4xl">
        <StatCard icon={<Wallet />} label="الإيرادات" value={48210} format={{ style: "currency", currency: "SAR", maximumFractionDigits: 0 }} delta={0.124} deltaLabel="مقارنة بالشهر الماضي" sparkline={TREND} sparklineLabel="الإيرادات، آخر ١٢ أسبوعا" />
        <StatCard icon={<Users />} label="عملاء جدد" value={1284} delta={0.052} deltaLabel="مقارنة بالشهر الماضي" sparkline={TREND} />
        <StatCard icon={<Receipt />} label="فواتير غير مدفوعة" value={23} delta={0.15} deltaLabel="مقارنة بالشهر الماضي" invert sparkline={TREND} />
        <StatCard icon={<CreditCard />} label="رسوم البطاقات" value={1420} format={{ style: "currency", currency: "SAR", maximumFractionDigits: 0 }} delta={-0.03} deltaLabel="مقارنة بالشهر الماضي" invert sparkline={FALL} />
        <StatCard label="جارٍ التحميل" value={0} loading />
      </StatGrid>
    </Scope>
  ),
};
