import type { Meta, StoryObj } from "@storybook/react-vite";
import { VulnDemo } from "./_infra-demo";

const meta = { title: "Components/Health/Vulnerability Report" } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <VulnDemo /> };

export const Clean: Story = { render: () => <VulnDemo clean /> };

export const NoScanYet: Story = { render: () => <VulnDemo empty /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <VulnDemo /> };
