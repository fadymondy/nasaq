import { EngineDetails } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { engineSnapshots, historyFor, NOW, recordsFor, useAr } from "./_health-demo";

const meta = { title: "Components/Wellness/Engine Details", component: EngineDetails, parameters: { layout: "padded" } } satisfies Meta<typeof EngineDetails>;
export default meta;
type Story = StoryObj;

function Demo({ engine, windowDays = 30 }: { engine: "hydration" | "caffeine" | "gerd" | "medication" | "cycle"; windowDays?: number }) {
  const ar = useAr();
  const snapshot = engineSnapshots(NOW, ar).find((s) => s.engine === engine)!;
  const judged = engine === "hydration" || engine === "caffeine" || engine === "gerd";
  return <EngineDetails snapshot={snapshot} now={NOW} history={judged ? historyFor(engine, windowDays) : undefined} windows={[7, 30, 365]} windowDays={windowDays} records={recordsFor(engine, NOW, ar)} backHref="#" />;
}

export const Default: Story = { render: () => <Demo engine="hydration" /> };
export const Year: Story = { render: () => <Demo engine="caffeine" windowDays={365} /> };
export const LedgerOnly: Story = { render: () => <Demo engine="medication" /> };
export const Loading: Story = {
  render: () => <EngineDetails snapshot={engineSnapshots(NOW, false)[0]!} now={NOW} historyLoading windows={[7, 30, 365]} />,
};
export const HistoryError: Story = {
  render: () => <EngineDetails snapshot={engineSnapshots(NOW, false)[2]!} now={NOW} historyError="The history service did not answer." onRetry={() => {}} />,
};
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo engine="hydration" /> };
