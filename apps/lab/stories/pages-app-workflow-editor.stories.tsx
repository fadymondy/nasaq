/* Workflow editor: the list view of a workflow, with parameters and a test run. Demo data lives in ./_automation-demo.tsx. */
import { Badge, StepEditor, type StepNode, type StepParam } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { automationStepTypes, demoParams, demoSteps, fakeTestRun, KNOWN_VARIABLES, NESTABLE, stepCategories, useAr } from "./_automation-demo";
import { FlowPage } from "./_workflow-demo";

const meta = { title: "Pages/App/Workflow Editor", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  const [steps, setSteps] = useState<StepNode[]>(() => demoSteps(ar));
  const [params, setParams] = useState<StepParam[]>(() => demoParams());
  return (
    <FlowPage
      title={ar ? "معالجة الطلبات" : "Order processing"}
      description={ar ? "رتّب الخطوات، اضبط معاملاتها، وجرّبها قبل النشر." : "Order the steps, set their parameters and try them before publishing."}
      actions={<Badge variant="warning">{ar ? "مسودة" : "Draft"}</Badge>}
    >
      <div className="mx-auto w-full max-w-3xl">
        <StepEditor types={automationStepTypes(ar)} categories={stepCategories(ar)} steps={steps} onStepsChange={setSteps} params={params} onParamsChange={setParams} nestableTypes={NESTABLE} knownVariables={KNOWN_VARIABLES} onTestRun={fakeTestRun} />
      </div>
    </FlowPage>
  );
}

export const Default: Story = { render: () => <Page /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
