import type { Meta, StoryObj } from "@storybook/react-vite";
import { OnlineBookingPage } from "./_seatfor-pages";

const meta = { title: "Components/Bookings/Pages/Online Booking", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <OnlineBookingPage /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <OnlineBookingPage /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <OnlineBookingPage /> };
