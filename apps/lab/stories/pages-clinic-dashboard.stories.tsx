import type { Meta, StoryObj } from "@storybook/react-vite";
import { DashboardPage } from "./_seatfor-pages";

const meta = { title: "Components/Healthcare/Pages/Dashboard", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <DashboardPage /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <DashboardPage /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <DashboardPage /> };
