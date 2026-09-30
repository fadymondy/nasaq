import { RunDetail, RunHistory } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { demoRunRecords, useAr, wait } from "./_automation-demo";

const meta = { title: "Components/Workflow/Run History", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Demo({ selected, loading }: { selected?: string; loading?: boolean }) {
  const ar = useAr();
  return <RunHistory runs={demoRunRecords(ar)} defaultSelectedId={selected ?? null} loading={loading} onRetry={async () => wait(700)} onCancel={async () => wait(500)} />;
}

function Single() {
  const ar = useAr();
  const run = demoRunRecords(ar)[0];
  return run ? <RunDetail run={run} defaultTab="trace" onRetry={async () => wait(500)} /> : null;
}

/** Pick a run: the failing step is called out and opened. */
export const Default: Story = { render: () => <Demo selected="run_8f21a" /> };
/** Nothing chosen yet. */
export const NoSelection: Story = { render: () => <Demo /> };
export const Loading: Story = { render: () => <Demo loading /> };
/** One run on its own, opened on the span trace. */
export const TraceOnly: Story = { render: () => <Single /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo selected="run_8f21a" /> };
