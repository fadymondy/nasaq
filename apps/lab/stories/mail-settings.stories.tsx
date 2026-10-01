import type { Meta, StoryObj } from "@storybook/react-vite";
import { MailDomainsDemo, SmtpSettingsDemo } from "./_infra-admin-demo";

const meta = { title: "Components/Server Tools/Mail Settings" } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Change the encryption and the port follows. Send test shows each step. The saved password is never shown. */
export const Smtp: Story = { render: () => <SmtpSettingsDemo /> };

/** The test fails at sign in, so the last step is skipped and the server reply shows. */
export const TestFails: Story = { render: () => <SmtpSettingsDemo failAuth /> };

/** example.com is ready to send. Switch to example.org for failing SPF, a missing DKIM record and a pending DMARC check. */
export const Domains: Story = { render: () => <MailDomainsDemo /> };

export const Loading: Story = { render: () => <MailDomainsDemo loading /> };

export const Arabic: Story = {
  globals: { locale: "ar" },
  render: () => (
    <div className="flex flex-col gap-6">
      <SmtpSettingsDemo />
      <MailDomainsDemo />
    </div>
  ),
};
