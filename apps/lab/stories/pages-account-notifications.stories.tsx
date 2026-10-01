/*
 * Notification preferences: channels per kind, quiet hours, limits, digest and destinations. Every change
 * saves at once. WhatsApp on Billing fails, to show the rollback. The same section is the Notifications
 * tab of Pages/Account/Profile.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { NotificationsDemo, useAr } from "./_team-demo";
import { PageShell } from "./_team-pages";

const meta = { title: "Components/Account/Pages/Notifications", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  return (
    <PageShell title={ar ? "الإشعارات" : "Notifications"} description={ar ? "اختر ما يصلك وأين ومتى." : "Choose what reaches you, where and when."}>
      <NotificationsDemo ar={ar} />
    </PageShell>
  );
}

export const Default: Story = { render: () => <Page /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
