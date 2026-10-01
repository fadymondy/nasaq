import type { Meta, StoryObj } from "@storybook/react-vite";
import { ReportPage } from "./_editors-demo";

const meta = { title: "Components/Editors/Pages/Report Editor", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <ReportPage /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <ReportPage /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <ReportPage /> };
