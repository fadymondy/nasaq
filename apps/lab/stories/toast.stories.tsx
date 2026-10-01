import { Button, toast } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = { title: "Components/Alerts & Notifications/Toast" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button onClick={() => toast("Project renamed")}>Neutral</Button>
      <Button onClick={() => toast.success("Invoice sent")}>Success</Button>
      <Button onClick={() => toast.error("Could not reach the server")}>Error</Button>
      <Button
        onClick={() =>
          toast("Issue deleted", { action: { label: "Undo", onClick: () => toast("Restored") } })
        }
      >
        With action
      </Button>
    </div>
  ),
};
