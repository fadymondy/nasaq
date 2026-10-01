import type { Meta, StoryObj } from "@storybook/react-vite";
import { DailySummaryPage } from "./_health-pages";

const meta = { title: "Components/Wellness/Pages/Daily Summary", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <DailySummaryPage /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <DailySummaryPage /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <DailySummaryPage /> };
