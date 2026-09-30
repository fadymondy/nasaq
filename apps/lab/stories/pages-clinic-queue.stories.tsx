import type { Meta, StoryObj } from "@storybook/react-vite";
import { QueuePage } from "./_seatfor-pages";

const meta = { title: "Pages/Clinic/Queue", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <QueuePage /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <QueuePage /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <QueuePage /> };
