import type { Meta, StoryObj } from "@storybook/react-vite";
import { NetworkDemo } from "./_infra-demo";

const meta = { title: "Components/Server Tools/Network Rules" } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Edits stay staged until Apply. Removed rows are struck through with Undo. Move a deny above the SSH allow to see the lockout warning. */
export const Default: Story = { render: () => <NetworkDemo /> };

export const HttpRules: Story = { render: () => <NetworkDemo defaultTab="http" /> };

export const FirewallOnly: Story = { render: () => <NetworkDemo withHttp={false} /> };

export const Loading: Story = { render: () => <NetworkDemo loading /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <NetworkDemo /> };
