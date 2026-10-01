import type { Meta, StoryObj } from "@storybook/react-vite";
import { WaitingPage } from "./_seatfor-pages";

const meta = { title: "Components/Bookings/Pages/Waiting", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <WaitingPage /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <WaitingPage /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <WaitingPage /> };
