import type { Meta, StoryObj } from "@storybook/react-vite";
import { KioskPage } from "./_seatfor-pages";

const meta = { title: "Components/Bookings/Pages/Check-in Kiosk", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <KioskPage /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <KioskPage /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <KioskPage /> };
