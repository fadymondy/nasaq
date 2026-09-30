import { WorkflowNetwork } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { networkSteps, useAr } from "./_workflow-demo";

const meta = { title: "Components/Workflow/Workflow Network", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Demo({ layout = "auto", interactive }: { layout?: "horizontal" | "vertical" | "auto"; interactive?: boolean }) {
  const ar = useAr();
  const { steps, links } = networkSteps(ar);
  const [picked, setPicked] = useState<string | undefined>();
  return (
    <WorkflowNetwork
      steps={steps}
      links={links}
      layout={layout}
      animate
      {...(picked ? { highlight: picked } : {})}
      {...(interactive ? { onStepClick: (s: { id: string }) => setPicked(s.id) } : {})}
      title={ar ? "معالجة طلب استرداد" : "Refund handling"}
      caption={ar ? "من وصول الطلب حتى إشعار العميل." : "From request to customer notice."}
    />
  );
}

/** Wraps into balanced rows and follows the reading direction. */
export const Default: Story = { render: () => <Demo layout="horizontal" /> };
/** One column, for narrow spaces. */
export const Vertical: Story = { render: () => <Demo layout="vertical" /> };
/** Cards become buttons; the picked step and its connectors are emphasised. */
export const Interactive: Story = { render: () => <Demo interactive /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo layout="horizontal" interactive /> };
