import type { Meta, StoryObj } from "@storybook/react-vite";
import { VaultDemo } from "./_explorer-demo";

const meta = { title: "Components/Developer/Vault" } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Reveal or copy a secret (the demo value is made up), watch it hide again, add, edit, delete and read the access log. */
export const Default: Story = { render: () => <VaultDemo /> };

export const ReadOnly: Story = { render: () => <VaultDemo readOnly /> };

export const Loading: Story = { render: () => <VaultDemo loading /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <VaultDemo /> };
