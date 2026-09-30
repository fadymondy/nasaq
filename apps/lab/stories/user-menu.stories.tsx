import { DropdownMenuItem, toast, UserMenu } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Bell, CreditCard, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { USER } from "./_demo";

const meta = {
  title: "Components/Navigation/User Menu",
  component: UserMenu,
  args: { user: USER, onSignOut: () => toast("Signed out") },
} satisfies Meta<typeof UserMenu>;
export default meta;
type Story = StoryObj<typeof meta>;

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-96 w-64 items-end rounded-card border border-border bg-sidebar p-2">
      {children}
    </div>
  );
}

/** Account items, Theme and Language submenus, sign out. */
export const Default: Story = {
  render: (args) => (
    <Frame>
      <UserMenu {...args}>
        <DropdownMenuItem>
          <UserRound />
          Account
        </DropdownMenuItem>
        <DropdownMenuItem>
          <CreditCard />
          Billing
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Bell />
          Notifications
        </DropdownMenuItem>
      </UserMenu>
    </Frame>
  ),
};

export const WithoutPreferences: Story = {
  args: { preferences: false },
  render: (args) => (
    <Frame>
      <UserMenu {...args} />
    </Frame>
  ),
};
