import type { Meta, StoryObj } from "@storybook/react-vite";
import { GithubActivityDemo } from "./_ops-demo";

const meta = { title: "Components/Developer Tools/GitHub Activity" } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Merged timeline plus a tab per feed. Refresh, Deploy and Re-run are fake async calls. */
export const Default: Story = { render: () => <GithubActivityDemo /> };

/** One feed only: no merged tab, the tab list shows just pull requests. */
export const PullRequestsOnly: Story = { render: () => <GithubActivityDemo only="pulls" /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <GithubActivityDemo /> };
