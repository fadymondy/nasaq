import { LocaleSwitcher, ThemeSwitcher } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = { title: "Components/Actions/Switchers" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** Writes back to the toolbar Theme global in the lab. */
export const Theme: Story = { render: () => <ThemeSwitcher /> };

/** Arabic flips the whole document to RTL. */
export const Locale: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <LocaleSwitcher />
      <LocaleSwitcher showLabel />
    </div>
  ),
};
