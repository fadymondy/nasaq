/* Run history: every execution with its steps, trace and raw data. Demo data lives in ./_automation-demo.tsx. */
import { RunHistory } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { demoRunRecords, useAr, wait } from "./_automation-demo";
import { FlowPage } from "./_workflow-demo";

const meta = { title: "Components/Workflow/Pages/Run History", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  return (
    <FlowPage title={ar ? "سجل التشغيل" : "Run history"} description={ar ? "راجع كل تشغيل: أي خطوة فشلت، وكم استغرقت، وماذا أخرجت." : "Review every run: which step failed, how long it took and what it produced."}>
      <RunHistory runs={demoRunRecords(ar)} defaultSelectedId="run_8f21a" onRetry={async () => wait(700)} onCancel={async () => wait(500)} />
    </FlowPage>
  );
}

export const Default: Story = { render: () => <Page /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
