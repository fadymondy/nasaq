/* Workflow network: a read-only process diagram in a documentation-style page. */
import { Card, CardContent, WorkflowNetwork } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { FlowPage, networkSteps, useAr } from "./_workflow-demo";

const meta = { title: "Pages/App/Workflow Network", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  const { steps, links } = networkSteps(ar);
  const [picked, setPicked] = useState<string>("dec");
  const step = steps.find((s) => s.id === picked);
  return (
    <FlowPage title={ar ? "كيف نعالج الاسترداد" : "How refunds are handled"} description={ar ? "الخطوات التي يمر بها كل طلب، ومن المسؤول عن كل خطوة." : "The steps every request goes through, and who owns each one."}>
      <Card>
        <CardContent className="flex flex-col gap-6 pt-6">
          <WorkflowNetwork steps={steps} links={links} highlight={picked} animate onStepClick={(s) => setPicked(s.id)} />
          {step ? (
            <div className="rounded-card border border-border bg-secondary p-4">
              <h2 className="text-label text-foreground">{step.title}</h2>
              <p className="text-body-sm text-muted-foreground">{step.description}</p>
              {step.owner ? (
                <p className="mt-1 text-caption text-muted-foreground">
                  {ar ? "المسؤول: " : "Owner: "}
                  {step.owner}
                </p>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </FlowPage>
  );
}

export const Default: Story = { render: () => <Page /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
