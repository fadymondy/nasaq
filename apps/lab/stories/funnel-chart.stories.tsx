import { FunnelChart, FunnelList } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { funnelSegments, funnelSteps, funnelSummaries, useAr, wait } from "./_moharrik-demo";

const meta = { title: "Components/Analytics/Funnel Chart", component: FunnelChart, parameters: { layout: "padded" } } satisfies Meta<typeof FunnelChart>;
export default meta;
type Story = StoryObj;

function Chart({ segments = false }) {
  const ar = useAr();
  return (
    <div className="max-w-3xl">
      <FunnelChart steps={funnelSteps(ar)} segments={segments ? funnelSegments(ar) : undefined} segmentLabel={ar ? "المصدر" : "Source"} />
    </div>
  );
}

function List() {
  const ar = useAr();
  return <FunnelList funnels={funnelSummaries(ar)} onOpen={() => {}} onCreate={() => {}} onDuplicate={async () => { await wait(400); }} onDelete={async () => { await wait(400); }} />;
}

export const Default: Story = { render: () => <Chart /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Chart segments /> };
export const BySource: Story = { render: () => <Chart segments /> };
export const Loading: Story = { render: () => <FunnelChart steps={[]} loading /> };
export const SavedFunnels: Story = { render: () => <List /> };
export const SavedFunnelsArabic: Story = { globals: { locale: "ar" }, render: () => <List /> };
