import { CampaignComposer } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CampaignComposerDemo, makeAudiences } from "./_crm-r1-demo";

const meta = { title: "Components/CRM/Campaign Composer", component: CampaignComposer, parameters: { layout: "padded" } } satisfies Meta<typeof CampaignComposer>;
export default meta;
type Story = StoryObj;

/** Switch channel, pick an audience (the count loads live), write, send a test, then send and follow the progress. */
export const Default: Story = { render: () => <CampaignComposerDemo /> };

/** Empty draft: the checks list what is missing. */
export const EmptyDraft: Story = { render: () => <CampaignComposer audiences={makeAudiences(false)} onSend={async () => undefined} /> };

/** A send in flight. */
export const Sending: Story = {
  render: () => (
    <CampaignComposer
      audiences={makeAudiences(false)}
      defaultValue={{ channel: "email", audienceId: "all", subject: "Hello", body: "<p>Hello</p>" }}
      progress={{ sent: 480, failed: 3, total: 1240 }}
      onStopSending={() => undefined}
      onSend={async () => undefined}
    />
  ),
};

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <CampaignComposerDemo /> };
