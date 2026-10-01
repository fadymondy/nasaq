/* Time tracking: timer, entries and the weekly timesheet. The whole screen lives in ./_billing-demo.tsx. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { TimeTrackingPage } from "./_billing-demo";

const meta = { title: "Components/Productivity/Pages/Time Tracking", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <TimeTrackingPage /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <TimeTrackingPage /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <TimeTrackingPage /> };
