import { SettingsSections } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { SettingsDemo } from "./_admin-demo";
import { ArabicScope } from "./_profile-demo";

const meta = { title: "Components/Account/Settings Sections", component: SettingsSections, parameters: { layout: "fullscreen" } } satisfies Meta<typeof SettingsSections>;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <SettingsDemo /> };
export const Arabic: Story = {
  render: () => (
    <ArabicScope>
      <SettingsDemo />
    </ArabicScope>
  ),
};
