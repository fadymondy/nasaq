import type { Meta, StoryObj } from "@storybook/react-vite";
import { CurrentVisitPage } from "./_seatfor-pages";

const meta = { title: "Components/Healthcare/Pages/Current Visit", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <CurrentVisitPage /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <CurrentVisitPage /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <CurrentVisitPage /> };
