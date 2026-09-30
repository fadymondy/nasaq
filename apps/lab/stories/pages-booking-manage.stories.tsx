import type { Meta, StoryObj } from "@storybook/react-vite";
import { ManageBookingPage } from "./_seatfor-pages";

const meta = { title: "Pages/Booking/Manage Booking", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <ManageBookingPage /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <ManageBookingPage /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <ManageBookingPage /> };
