import { NotificationPreferences } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArabicScope, NotificationsDemo, useAr } from "./_team-demo";

const meta = { title: "Components/Account/Notification Preferences", component: NotificationPreferences, parameters: { layout: "padded" } } satisfies Meta<typeof NotificationPreferences>;
export default meta;
type Story = StoryObj;

function Demo({ matrixOnly }: { matrixOnly?: boolean }) {
  return <NotificationsDemo ar={useAr()} sections={matrixOnly ? ["matrix"] : undefined} />;
}

/** Saves happen on each change. WhatsApp is unavailable until connected; WhatsApp on Billing is set to fail, to show the rollback. */
export const Default: Story = { render: () => <Demo /> };
export const MatrixOnly: Story = { render: () => <Demo matrixOnly /> };
export const Arabic: Story = {
  globals: { locale: "ar" },
  render: () => (
    <ArabicScope>
      <Demo />
    </ArabicScope>
  ),
};
