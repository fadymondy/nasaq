import { type FeedbackSubmission, FeedbackLauncher, ReportDialog } from "@nasaq/feedback";
import { Button, toast } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

// The Mahaam feedback reporter (@nasaq/feedback): @mahaam/feedback-core vendored, UI rebuilt on Nasaq.
// These stories use a mock submitter; the live one is the launcher at the corner of every lab story.
const meta = { title: "Patterns/Feedback Reporter", component: ReportDialog } satisfies Meta<typeof ReportDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

const mockSubmit = async (payload: FeedbackSubmission) => {
  await new Promise((r) => setTimeout(r, 600));
  if (payload.title.toLowerCase().includes("fail")) throw new Error("The report was not accepted (403)");
  console.info("feedback payload", { ...payload, screenshot: payload.screenshot ? `${payload.screenshot.slice(0, 40)}…` : undefined });
  toast.success(`Sent: ${payload.title}`);
};


export const Launcher: Story = {
  args: { open: false, onOpenChange: () => {}, onSubmit: mockSubmit },
  render: () => (
    <div className="flex flex-col items-start gap-3">
      <p className="text-body-sm text-muted-foreground">Type a title containing “fail” to see the error state.</p>
      <FeedbackLauncher
        target={mockSubmit}
        priorities={["low", "medium", "high", "urgent"]}
      />
    </div>
  ),
};

function EditDemo() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Edit issue</Button>
      <ReportDialog
        open={open}
        onOpenChange={setOpen}
        onSubmit={mockSubmit}
        mode="edit"
        initial={{ title: "Sidebar overlaps the header on iPad", body: "Rotate to landscape, open the sidebar.", issue_type: "bug", priority: "high" }}
        priorities={["low", "medium", "high", "urgent"]}
      />
    </>
  );
}

export const EditMode: Story = {
  args: { open: true, onOpenChange: () => {}, onSubmit: mockSubmit },
  render: () => <EditDemo />,
};
