import type { Meta, StoryObj } from "@storybook/react-vite";
import { ApprovalDemo } from "./_workflow-p2-demo";

const meta = { title: "Components/Workflow/Approval Queue", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Approve, reject with a required reason, or convert to a task. A review with an unmet criterion cannot be approved, and an expired item is locked. */
export const Default: Story = { render: () => <ApprovalDemo /> };

/** The first approve fails with a server error to show the inline message. */
export const ServerError: Story = { render: () => <ApprovalDemo failFirst /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <ApprovalDemo /> };
