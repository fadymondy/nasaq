import { WorkflowCanvas, type WorkflowGraph } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { demoGraph, demoRuns, demoVersions, stepCategories, stepTypes, useAr, wait } from "./_workflow-demo";

const meta = { title: "Components/Workflow/Workflow Canvas", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Demo({ empty, readOnly, history }: { empty?: boolean; readOnly?: boolean; history?: boolean }) {
  const ar = useAr();
  const [graph, setGraph] = useState<WorkflowGraph>(() => (empty ? { nodes: [], edges: [] } : demoGraph(ar)));
  return (
    <div className="h-screen min-h-[560px] p-4">
      <WorkflowCanvas
        title={ar ? "فرز تذاكر الدعم" : "Support triage"}
        value={graph}
        onChange={setGraph}
        types={stepTypes(ar)}
        categories={stepCategories(ar)}
        readOnly={readOnly}
        {...(history ? { runs: demoRuns(), versions: demoVersions(ar), currentVersion: 3, onRestoreVersion: async () => wait(500) } : {})}
        onSave={async () => wait(600)}
        onRun={async () => wait(900)}
      />
    </div>
  );
}

/** A branching support workflow: edit, connect, add steps, validate, save and run. */
export const Default: Story = { render: () => <Demo /> };
/** With executions to replay on the canvas and saved versions to preview and restore. */
export const WithHistory: Story = { render: () => <Demo history /> };
/** Nothing yet: the empty state offers the first step. */
export const Empty: Story = { render: () => <Demo empty /> };
/** Read only: pan and inspect, no edits. */
export const ReadOnly: Story = { render: () => <Demo readOnly history /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo history /> };
