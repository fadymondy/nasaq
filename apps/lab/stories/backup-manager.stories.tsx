import type { Meta, StoryObj } from "@storybook/react-vite";
import { BackupDemo } from "./_ops-demo";

const meta = { title: "Components/Developer/Backup Manager" } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Run now shows a running backup with progress. Restore needs the confirm checkbox. Change the retention to see the prune preview. */
export const Default: Story = { render: () => <BackupDemo /> };

export const Loading: Story = { render: () => <BackupDemo loading /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <BackupDemo /> };
