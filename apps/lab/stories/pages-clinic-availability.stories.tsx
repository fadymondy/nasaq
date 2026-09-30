import type { Meta, StoryObj } from "@storybook/react-vite";
import { AvailabilityPage } from "./_seatfor-pages";

const meta = { title: "Pages/Clinic/Availability", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <AvailabilityPage /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <AvailabilityPage /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <AvailabilityPage /> };
