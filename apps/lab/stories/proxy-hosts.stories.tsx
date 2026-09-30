import type { Meta, StoryObj } from "@storybook/react-vite";
import { ProxyDemo } from "./_infra-demo";

const meta = { title: "Components/Developer/Proxy Hosts" } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Add or edit a host, flip the enabled switch, delete with a confirm. Passthrough TLS turns websockets off. */
export const Default: Story = { render: () => <ProxyDemo /> };

export const Loading: Story = { render: () => <ProxyDemo loading /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <ProxyDemo /> };
