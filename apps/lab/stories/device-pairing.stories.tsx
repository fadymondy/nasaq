import type { Meta, StoryObj } from "@storybook/react-vite";
import { ApprovalDemo, DisplayDemo, EntryFlowDemo, HandoffDemo } from "./_onboarding-demo";

const meta = { title: "Pages/Auth/Device Pairing", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Type `WDJBMJHT` to find the request; any other code is not found. */
export const EntryFlow: Story = { name: "Entry flow", render: () => <EntryFlowDemo /> };
export const Approve: Story = { render: () => <ApprovalDemo /> };
export const Approved: Story = { render: () => <ApprovalDemo initial="approved" /> };
export const Expired: Story = { render: () => <ApprovalDemo initial="expired" /> };
/** The device screen. It flips to approved after seven seconds. */
export const CodeDisplay: Story = { name: "Code display", render: () => <DisplayDemo /> };
export const ExpiredDisplay: Story = { name: "Code display, expired", render: () => <DisplayDemo initial="expired" approveAfter={null} /> };
export const Handoff: Story = { render: () => <HandoffDemo /> };
export const FailedHandoff: Story = { name: "Failed handoff", render: () => <HandoffDemo initial="failed" /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <ApprovalDemo /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <ApprovalDemo /> };
