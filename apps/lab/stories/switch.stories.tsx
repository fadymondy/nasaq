import { Switch } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

const meta = { title: "Components/Forms/Switch", component: Switch } satisfies Meta<typeof Switch>;
export default meta;
type Story = StoryObj<typeof meta>;

/** For a setting that applies immediately. Always give it a visible or aria label. */
export const Default: Story = {
  render: () => {
    const [on, setOn] = useState(true);
    return (
      <label className="flex items-center gap-3 text-body-sm text-foreground">
        <Switch checked={on} onCheckedChange={setOn} />
        Email notifications
      </label>
    );
  },
};

export const States: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Switch aria-label="Off" />
      <Switch aria-label="On" defaultChecked />
      <Switch aria-label="Disabled off" disabled />
      <Switch aria-label="Disabled on" disabled defaultChecked />
    </div>
  ),
};
