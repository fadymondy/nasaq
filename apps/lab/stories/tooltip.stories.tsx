import { Button, Tooltip } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Settings } from "lucide-react";

const meta = { title: "Components/Overlays/Tooltip", component: Tooltip } satisfies Meta<typeof Tooltip>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { content: "Settings", children: <span /> },
  render: () => (
    <div className="flex gap-3 p-10">
      <Tooltip content="Settings">
        <Button size="icon" variant="ghost" aria-label="Settings">
          <Settings />
        </Button>
      </Tooltip>
      <Tooltip content="Shown below" side="bottom">
        <Button>Hover me</Button>
      </Tooltip>
    </div>
  ),
};
