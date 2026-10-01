import type { Meta, StoryObj } from "@storybook/react-vite";
import { ApiKeysDemo } from "./_connectors-demo";

const meta = { title: "Components/Developer Tools/API Keys" } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Create a key (the demo rejects the name taken), copy the secret once, rotate or revoke with a confirm. */
export const Default: Story = { render: () => <ApiKeysDemo /> };

/** Nothing yet: the empty state with a create button. */
export const Empty: Story = { render: () => <ApiKeysDemo empty /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <ApiKeysDemo /> };
