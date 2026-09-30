import { StepEditor, type StepNode, type StepParam } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { automationStepTypes, demoParams, demoSteps, fakeTestRun, KNOWN_VARIABLES, NESTABLE, stepCategories, useAr } from "./_automation-demo";

const meta = { title: "Components/Workflow/Step Editor", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Demo({ empty }: { empty?: boolean }) {
  const ar = useAr();
  const [steps, setSteps] = useState<StepNode[]>(() => (empty ? [] : demoSteps(ar)));
  const [params, setParams] = useState<StepParam[]>(() => demoParams());
  return (
    <div className="mx-auto max-w-3xl">
      <StepEditor types={automationStepTypes(ar)} categories={stepCategories(ar)} steps={steps} onStepsChange={setSteps} params={params} onParamsChange={setParams} nestableTypes={NESTABLE} knownVariables={KNOWN_VARIABLES} onTestRun={fakeTestRun} />
    </div>
  );
}

/** A webhook, a loop holding two steps (one continues on failure), parameters with a secret, and a test run. */
export const Default: Story = { render: () => <Demo /> };
/** Nothing yet: "Add step" opens the picker inline. */
export const Empty: Story = { render: () => <Demo empty /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
