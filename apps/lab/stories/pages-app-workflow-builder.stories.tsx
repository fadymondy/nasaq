/* Workflow builder: the automation canvas with runs and versions. Demo data lives in ./_workflow-demo.tsx. */
import { Badge, WorkflowCanvas, type WorkflowGraph } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { demoGraph, demoRuns, demoVersions, FlowPage, stepCategories, stepTypes, useAr, wait } from "./_workflow-demo";

const meta = { title: "Pages/App/Workflow Builder", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  const [graph, setGraph] = useState<WorkflowGraph>(() => demoGraph(ar));
  return (
    <FlowPage
      fill
      title={ar ? "سير العمل" : "Workflows"}
      description={ar ? "ابنِ الأتمتة بربط المشغّلات والإجراءات، ثم شغّلها وراجع تنفيذاتها." : "Build automations by joining triggers and actions, then run them and review executions."}
      actions={<Badge variant="success">{ar ? "نشط" : "Active"}</Badge>}
    >
      <WorkflowCanvas
        title={ar ? "فرز تذاكر الدعم" : "Support triage"}
        value={graph}
        onChange={setGraph}
        types={stepTypes(ar)}
        categories={stepCategories(ar)}
        runs={demoRuns()}
        versions={demoVersions(ar)}
        currentVersion={3}
        onSave={async () => wait(600)}
        onRun={async () => wait(900)}
        onRestoreVersion={async () => wait(500)}
      />
    </FlowPage>
  );
}

export const Default: Story = { render: () => <Page /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
