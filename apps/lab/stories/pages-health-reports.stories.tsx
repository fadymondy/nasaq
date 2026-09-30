import type { Meta, StoryObj } from "@storybook/react-vite";
import { ReportsPage } from "./_health-pages";

const meta = { title: "Pages/Health/Reports", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <ReportsPage /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <ReportsPage /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <ReportsPage /> };
