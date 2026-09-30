import { toast, WorkspaceSwitcher } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { WORKSPACES } from "./_demo";

const meta = { title: "Components/Navigation/Workspace Switcher", component: WorkspaceSwitcher } satisfies Meta<typeof WorkspaceSwitcher>;
export default meta;
type Story = StoryObj<typeof meta>;

function Demo() {
  const [value, setValue] = useState("3x1");
  return (
    <div className="w-64 rounded-card border border-border bg-sidebar p-2">
      <WorkspaceSwitcher
        workspaces={WORKSPACES}
        value={value}
        onValueChange={setValue}
        onCreate={() => toast("Create workspace")}
      />
    </div>
  );
}

/** Org / SaaS team switcher. ⌘1…⌘9 jump to a workspace while the menu is open. */
export const Default: Story = {
  args: { workspaces: WORKSPACES, value: "3x1", onValueChange: () => {} },
  render: () => <Demo />,
};
