import type { Meta, StoryObj } from "@storybook/react-vite";
import { WebhooksDemo } from "./_infra-admin-demo";

const meta = { title: "Components/Developer/Webhooks Manager" } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Add an endpoint to see the signing secret once. Rotate a secret, send a test (Team alerts fails), replay a failed delivery, poll a source. */
export const Default: Story = { render: () => <WebhooksDemo /> };

export const NoPushCard: Story = { render: () => <WebhooksDemo withPush={false} /> };

export const Empty: Story = { render: () => <WebhooksDemo empty withPush={false} /> };

export const Loading: Story = { render: () => <WebhooksDemo loading withPush={false} /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <WebhooksDemo /> };
