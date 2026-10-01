import type { Meta, StoryObj } from "@storybook/react-vite";
import { TrackersPage } from "./_w4-health";

const meta = { title: "Components/Wellness/Pages/Trackers", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <TrackersPage /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <TrackersPage /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <TrackersPage /> };
