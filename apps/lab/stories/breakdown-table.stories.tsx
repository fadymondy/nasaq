import { BreakdownTable } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { gaReport, useAr } from "./_analytics-demo";

const meta = { title: "Components/Analytics/Breakdown Table", component: BreakdownTable, parameters: { layout: "padded" } } satisfies Meta<typeof BreakdownTable>;
export default meta;
type Story = StoryObj;

function Channels({ loading }: { loading?: boolean }) {
  const ar = useAr();
  const d = gaReport(28, ar);
  return <BreakdownTable className="max-w-2xl" title={ar ? "قنوات الزيارات" : "Channels"} dimensionLabel={ar ? "القناة" : "Channel"} valueLabel={ar ? "الجلسات" : "Sessions"} rows={d.channels} loading={loading} />;
}

export const Default: Story = { render: () => <Channels /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Channels /> };
export const Loading: Story = { render: () => <Channels loading /> };
export const PagesWithShowAll: Story = {
  render: () => {
    const d = gaReport(28, false);
    return <BreakdownTable className="max-w-2xl" title="Top pages" dimensionLabel="Page" valueLabel="Sessions" rows={d.pages} limit={5} ltrLabels />;
  },
};
export const Empty: Story = { render: () => <BreakdownTable className="max-w-md" title="Referrers" dimensionLabel="Site" valueLabel="Sessions" rows={[]} /> };
