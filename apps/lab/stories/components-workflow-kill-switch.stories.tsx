import type { Meta, StoryObj } from "@storybook/react-vite";
import { KillSwitchDemo, PausedBannerDemo } from "./_workflow-p2-demo";

const meta = { title: "Components/Workflow/Kill Switch", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Stop everything with a required reason, then resume. Paired browsers can be unpaired from the row or its context menu. */
export const Default: Story = { render: () => <KillSwitchDemo /> };

export const Paused: Story = { render: () => <KillSwitchDemo initialPaused /> };

/** The banner on its own, for pinning to the top of an app. */
export const Banner: Story = { render: () => <PausedBannerDemo /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <KillSwitchDemo /> };
