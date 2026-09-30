import type { Meta, StoryObj } from "@storybook/react-vite";
import { SchedulePage } from "./_seatfor-pages";

const meta = { title: "Pages/Clinic/Schedule", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <SchedulePage /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <SchedulePage /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <SchedulePage /> };
