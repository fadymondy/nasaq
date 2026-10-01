import { LocaleSwitcher, ThemeSwitcher, ThemeToggle } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = { title: "Components/Actions/Switchers" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** Writes back to the toolbar Theme global in the lab. */
export const Theme: Story = { render: () => <ThemeSwitcher /> };

/** One icon, light ↔ dark: the sun and moon swap with a turn and a soft click (silent under reduced motion). */
export const Toggle: Story = { render: () => <ThemeToggle /> };

/** Arabic flips the whole document to RTL. */
export const Locale: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <LocaleSwitcher />
      <LocaleSwitcher showLabel />
    </div>
  ),
};
