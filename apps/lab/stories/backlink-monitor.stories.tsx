import { BacklinkMonitor } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { BacklinksDemo, NOW } from "./_moharrik-demo";

const meta = { title: "Components/SEO/Backlink Monitor", component: BacklinkMonitor, parameters: { layout: "padded" } } satisfies Meta<typeof BacklinkMonitor>;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <BacklinksDemo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <BacklinksDemo /> };
export const Empty: Story = { render: () => <BacklinkMonitor links={[]} now={NOW} /> };
export const Loading: Story = { render: () => <BacklinkMonitor links={[]} now={NOW} loading /> };
