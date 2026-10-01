import type { Meta, StoryObj } from "@storybook/react-vite";
import { StaffPipelinePage } from "./_seatfor-pages";

const meta = { title: "Components/Bookings/Pages/Staff Pipeline", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <StaffPipelinePage /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <StaffPipelinePage /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <StaffPipelinePage /> };
